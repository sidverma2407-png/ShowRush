# Seatzy — Architecture & Technical Spec

This is the single source of truth for the SYSTEM DESIGN. Follow this stack, schema, and mechanism design exactly. Do not substitute alternative libraries/patterns without noting the deviation and why, in the README.

## 1. Stack

- **Frontend**: React (Vite) + Tailwind CSS + React Router. State: Zustand (or React Context if simpler). Real-time: Socket.IO client.
- **Backend**: Node.js + Express. REST API. Socket.IO server for real-time seat status broadcast.
- **Database**: PostgreSQL, accessed via Prisma ORM.
- **Scheduler**: node-cron for periodic sweep jobs (hold expiry, waitlist offer expiry). If using BullMQ + Redis instead, document the choice — but a single Postgres + node-cron setup is preferred for simplicity and to keep infra minimal for a free-tier deployment.
- **QR codes**: `qrcode` npm package (server-side generation), output as a PNG/data URL embedded in the confirmation email.
- **Email**: Nodemailer with Gmail SMTP or Resend free tier.
- **Auth**: JWT (access token), bcrypt for password hashing.
- **Hosting**: Frontend → Vercel. Backend + Postgres → Render or Railway.

## 2. Repository Structure

```
/seatzy
  /frontend        # React + Vite + Tailwind app
  /backend
    /src
      /routes       # Express route handlers, grouped by resource
      /controllers
      /services      # business logic: hold, booking, waitlist
      /jobs          # scheduled jobs: hold-expiry, waitlist-offer-expiry
      /sockets       # Socket.IO event handlers
      /middleware    # auth, role guards
      /prisma        # schema.prisma, migrations
    server.js
  README.md
  context.md
  design.md
  architecture.md
```

## 3. Database Schema

All tables use UUID primary keys unless noted. Timestamps (`created_at`, `updated_at`) omitted below for brevity but should be present on every table.

### `users`
| column | type | notes |
|---|---|---|
| id | uuid | PK |
| name | text | |
| email | text | unique |
| password_hash | text | |
| role | enum('customer','organiser','admin') | |

### `venues`
| column | type | notes |
|---|---|---|
| id | uuid | PK |
| name | text | |
| address | text | |
| created_by | uuid | FK → users.id (admin) |

### `seat_categories`
| column | type | notes |
|---|---|---|
| id | uuid | PK |
| name | text | e.g. "Premium", "Standard" |

### `venue_seats`
Physical seat inventory for a venue — layout is defined once per venue and reused across all shows at that venue.
| column | type | notes |
|---|---|---|
| id | uuid | PK |
| venue_id | uuid | FK → venues.id |
| row_label | text | e.g. "A" |
| seat_number | int | e.g. 7 |
| category_id | uuid | FK → seat_categories.id |
| unique constraint | | (venue_id, row_label, seat_number) |

### `events`
| column | type | notes |
|---|---|---|
| id | uuid | PK |
| organiser_id | uuid | FK → users.id |
| title | text | |
| type | enum('movie','concert') | |
| description | text | |
| poster_url | text | nullable |

### `shows`
A specific date/time instance of an event at a venue.
| column | type | notes |
|---|---|---|
| id | uuid | PK |
| event_id | uuid | FK → events.id |
| venue_id | uuid | FK → venues.id |
| date | date | |
| time | time | |
| status | enum('scheduled','completed','cancelled') | |

### `show_category_pricing`
| column | type | notes |
|---|---|---|
| id | uuid | PK |
| show_id | uuid | FK → shows.id |
| category_id | uuid | FK → seat_categories.id |
| price | numeric | |
| unique constraint | | (show_id, category_id) |

### `seat_status` — real-time source of truth per show
| column | type | notes |
|---|---|---|
| id | uuid | PK |
| show_id | uuid | FK → shows.id |
| venue_seat_id | uuid | FK → venue_seats.id |
| status | enum('available','held','booked') | |
| held_by | uuid | nullable, FK → users.id |
| hold_expires_at | timestamptz | nullable |
| booking_id | uuid | nullable, FK → bookings.id |
| unique constraint | | (show_id, venue_seat_id) |

One row per (show, seat) — created for every seat when a show is published, defaulting to `available`.

### `bookings`
| column | type | notes |
|---|---|---|
| id | uuid | PK |
| customer_id | uuid | FK → users.id |
| show_id | uuid | FK → shows.id |
| booking_reference | text | unique, human-readable (e.g. "QR9F3") |
| total_price | numeric | |
| status | enum('confirmed','cancelled') | |
| qr_code_url | text | nullable |

### `booking_seats` (join table — a booking can include multiple seats)
| column | type | notes |
|---|---|---|
| id | uuid | PK |
| booking_id | uuid | FK → bookings.id |
| venue_seat_id | uuid | FK → venue_seats.id |

### `waitlist_entries`
| column | type | notes |
|---|---|---|
| id | uuid | PK |
| show_id | uuid | FK → shows.id |
| category_id | uuid | FK → seat_categories.id |
| customer_id | uuid | FK → users.id |
| position | int | order within (show_id, category_id) queue |
| status | enum('waiting','offered','expired','booked','cancelled') | |
| offered_venue_seat_id | uuid | nullable, FK → venue_seats.id — set when an offer is made |
| offer_expires_at | timestamptz | nullable |

## 4. Concurrency Mechanism (must implement exactly this pattern)

Goal: two simultaneous requests for the same seat must never both succeed.

1. Client requests to hold seat(s) for a show → backend opens a DB transaction.
2. Within the transaction, `SELECT ... FOR UPDATE` the relevant `seat_status` row(s) for `(show_id, venue_seat_id)`.
3. Check status is `available` (or `held` with an already-expired `hold_expires_at`, treated as available).
4. If available: update to `status = 'held', held_by = <user>, hold_expires_at = now() + TTL` and commit.
5. If not available: rollback and return a `409 Conflict` to the client immediately.
6. Because the row lock serializes concurrent transactions on the same seat row, the second concurrent request will block until the first commits, then see the updated (non-available) status and correctly fail.

This is the only acceptable mechanism for the hold step — do not rely on optimistic app-level checks (e.g. "check then write" without a transaction/lock), since that reintroduces the race condition this system exists to prevent.

Booking confirmation (converting a hold into a booking) follows the same locked-transaction pattern: verify the hold belongs to the requesting user and hasn't expired, then atomically set `status = 'booked'`, create the `bookings`/`booking_seats` rows, and clear `held_by`/`hold_expires_at`.

## 5. Scheduled Jobs

### 5.1 Hold Expiry Sweep
- Runs every ~30 seconds (configurable).
- Finds all `seat_status` rows where `status = 'held' AND hold_expires_at < now()`.
- For each: set `status = 'available'`, clear `held_by`/`hold_expires_at`, and broadcast the seat's new status via Socket.IO to all clients subscribed to that show.

### 5.2 Waitlist Offer Expiry Sweep
- Runs every ~30 seconds (configurable).
- Finds all `waitlist_entries` where `status = 'offered' AND offer_expires_at < now()`.
- For each: set that entry's `status = 'expired'`, release the associated seat back through the **waitlist assignment flow** (below) to offer it to the next person in that category's queue.

## 6. Waitlist Assignment Flow

Triggered by: (a) a booking cancellation that frees a seat in a category with a non-empty waitlist, or (b) a waitlist offer expiring (5.2 above), which needs to cascade to the next person.

1. On a freed seat becoming available in a category with waiting entries: within a transaction, lock and fetch the `waitlist_entries` row with `status = 'waiting'` and the lowest `position` for that `(show_id, category_id)`.
2. If found: set that entry's `status = 'offered'`, `offered_venue_seat_id = <freed seat>`, `offer_expires_at = now() + offer_TTL`. Set the seat's `seat_status.status = 'held'` (reserved for this waitlisted customer specifically — not visible as generally available), `held_by = <waitlisted customer>`.
3. Send an email to that customer with a time-limited link (containing the waitlist entry ID) to complete the booking.
4. If the customer completes the booking before `offer_expires_at`: normal booking-confirmation flow runs (Section 4, booking step), waitlist entry status → `booked`.
5. If the offer expires (5.2): waitlist entry → `expired`, and the freed seat re-enters this same flow (step 1) to offer to the next `waiting` entry in the queue. If no `waiting` entries remain, the seat reverts to plain `available` in `seat_status` and is shown on the general seat map again.

## 7. Real-Time Updates

- Clients viewing a show's seat map join a Socket.IO room keyed by `show_id`.
- Any transaction that changes a `seat_status` row (hold, hold-expiry, booking, cancellation, waitlist offer/expiry) emits a `seat_status_updated` event to that show's room with the updated seat's id and new status immediately after the DB transaction commits.
- The frontend seat map subscribes to this event and updates the relevant cell's color/state without a full refetch.

## 8. API Surface (minimum required endpoints)

Auth: `POST /auth/register`, `POST /auth/login`

Admin: `POST /venues`, `PUT /venues/:id`, `POST /venues/:id/seats` (bulk layout upload), `GET /venues`, `POST /seat-categories`

Organiser: `POST /events`, `PUT /events/:id`, `POST /events/:id/shows`, `PUT /shows/:id/pricing`, `GET /events/:id/summary` (bookings + revenue)

Customer: `GET /events` (browse/filter), `GET /shows/:id/seats` (current seat map), `POST /shows/:id/hold` (hold seat(s)), `DELETE /holds/:id` (voluntary release), `POST /bookings` (confirm from an active hold), `GET /bookings` (my history), `DELETE /bookings/:id` (cancel), `POST /shows/:id/waitlist` (join waitlist for a category), `GET /waitlist/offer/:token` (view a time-limited offer), `POST /waitlist/offer/:token/accept`

All endpoints (except register/login and public event browsing) require a valid JWT and are role-checked server-side.

## 9. Environment Variables (`.env.example` must include)

```
DATABASE_URL=
JWT_SECRET=
HOLD_TTL_MINUTES=10
WAITLIST_OFFER_TTL_MINUTES=15
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=
FRONTEND_URL=
PORT=
```
