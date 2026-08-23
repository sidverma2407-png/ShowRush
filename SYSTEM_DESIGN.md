# Seatzy: System Design Write-Up

## 1. Architecture Overview
The platform architecture is composed of:
- **Presentation Tier**: React 18 + Vite SPA utilizing WebSocket (`Socket.IO`) clients for live seat status and canvas rendering.
- **Application Tier**: Node.js / Express / TypeScript API server with transactional business logic and scheduled cron workers (`node-cron`).
- **Data Tier**: PostgreSQL 16 managed via Prisma ORM with strict foreign-key integrity and row-level locking capabilities (`SELECT ... FOR UPDATE`).

```
[ Customer / Organiser / Turnstiles ]
                 │
      HTTPS / WSS Connection
                 │
        ┌────────┴────────┐
        ▼                 ▼
 [ Vite React SPA ]  [ Socket.IO Engine ]
        │                 ▲
     REST API             │ Real-time Events
        │                 │ (seat_status_updated)
        ▼                 │
 [ Express API Services ] ┤
   ├─ Auth & Passwords    │
   ├─ Seat Hold & Locks   │
   ├─ Payment & QR Code   │
   ├─ Waitlist Reallocate │
   └─ Cron Worker (TTL) ──┘
        │
   PostgreSQL 16 (Row-Level Locks FOR UPDATE)
```

---

## 2. Seat Hold and TTL Expiry Mechanism
When a customer selects seats on the interactive visual map and initiates checkout, a request is dispatched to `POST /api/shows/:id/hold`.

1. **State Transition**: The targeted seat records in `seat_status` transition from `available` to `held`.
2. **Identity & TTL Binding**: The system stamps `held_by = customer_id` and sets `hold_expires_at = NOW() + HOLD_TTL_MINUTES` (configurable, default 10 minutes).
3. **Real-time Broadcast**: The server broadcasts a `seat_status_updated` event via WebSocket to all clients in the show's room. Other patrons immediately see these seats styled as unavailable (`seat-sold`), preventing futile checkout attempts.
4. **Automated Expiry Sweeper**: A background cron worker sweeps the database every 60 seconds (`*/1 * * * *`). Any hold where `status = 'held'` and `hold_expires_at < NOW()` is atomically reverted to `available` with `held_by = NULL`. The sweeper immediately emits `seat_status_updated`, restoring the seats to the public pool in real time without human intervention.

---

## 3. Concurrency Protection & Serialization
To guarantee that two patrons attempting to hold or book the same seat simultaneously cannot both succeed, Seatzy utilizes **Pessimistic Row-Level Locking (`SELECT ... FOR UPDATE`)** inside Prisma database transactions:

```sql
SELECT * FROM seat_status 
WHERE id IN ('seat_1', 'seat_2') AND show_id = $1 
FOR UPDATE;
```

### Execution Flow:
1. **Pessimistic Acquisition**: When User A and User B execute concurrent hold requests for Seat `A1`, PostgreSQL grants an exclusive row-level lock to whichever transaction arrives first at the storage engine (User A). User B's transaction is placed in a non-dirty wait queue.
2. **State Validation**: User A's transaction validates that Seat `A1` is currently `available`, updates the status to `held`, sets `hold_expires_at`, and commits.
3. **Conflict Rejection**: User B's transaction unblocks, reads the freshly committed row state, detects that `status !== 'available'`, aborts the transaction, and returns an `HTTP 409 ConflictError` (`"Seat A1 is currently held by someone else"`).

This pessimistic serialization eliminates phantom reads and dirty writes, completely removing double-booking vulnerabilities under extreme concurrency spikes.

---

## 4. Waitlist Auto-Assignment and Time-Limited Offer Chaining
When a show category sells out, customers can join a First-In-First-Out (FIFO) queue (`waitlist_entries`), receiving an incremental `position` number.

```
Patron Cancels Booking
        │
        ▼
[ Fetch Oldest Waitlist Entry (position = 1, status = 'waiting') ]
        │
        ├─► [ Customer Found ]
        │         │
        │         ├─► Update Waitlist Status to 'offered'
        │         ├─► Set offer_expires_at = NOW() + 15 MIN
        │         ├─► Lock Seat: status = 'held', held_by = waitlist_customer_id
        │         └─► Dispatch Time-Limited Claim Email with Token Link
        │                 │
        │                 ├─► [ Accepted in Time ] ──► Status = 'booked' (Confirmed)
        │                 │
        │                 └─► [ Expired ] ──────────► Status = 'expired'
        │                                                    │
        │                                                    ▼
        │                                         [ Trigger Next in Line (position = 2) ]
        │
        └─► [ No Waitlist Entries ] ──► Seat Reverts to 'available' on Public Map
```

### Auto-Reallocation Lifecycle:
1. **Cancellation Trigger**: When a confirmed booking is cancelled (`DELETE /api/bookings/:id`), the system inspects the freed seat category.
2. **Priority Reservation**: The oldest waiting entry (`status = 'waiting', ORDER BY position ASC`) is selected inside an atomic transaction.
3. **Exclusive Hold**: The seat is placed in `held` status bound exclusively to that waitlisted customer, and `offer_expires_at` is set (e.g. 15 minutes).
4. **Offer Notification**: A notification email containing an encrypted claim link (`/waitlist/offer/:token`) is dispatched.
5. **Cascading Chaining**: If the recipient does not claim the seat before `offer_expires_at`, the scheduler marks that entry `expired` and immediately reallocates the seat to the next person in line (`position + 1`). If the waitlist queue is exhausted, the seat is released back to the general public.

---

## 5. Security, Pass Delivery & Zero-Dependency QR Offline Verification
On confirmed booking, the server generates a standardized, tamper-evident Plain-Text cryptographic admission pass rendered as a QR code:
- **Offline Reliability**: Encodes all ticket details in a structured plain-text string, enabling gate attendants and security turnstiles to verify admission 100% offline without external network dependencies.
- **Role Isolation**: Strict JWT authentication guarantees customer-only booking access and organizer-only command dashboard metrics.
