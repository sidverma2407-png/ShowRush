# Seatzy — Context & Requirements

This is the single source of truth for WHAT the product does. Do not infer, add, or remove features. If something is ambiguous, prefer the interpretation that matches an existing rule below rather than inventing new behavior.

## 1. Product Objective

High-demand events sell out instantly, leaving customers with no recourse. Last-minute cancellations go to waste when no automated reallocation exists. Seatzy is a ticket booking platform for movies and concerts where:
- Customers book seats from a visual map
- Held seats auto-release on checkout abandonment
- Sold-out events have a waitlist with automatic seat assignment on cancellation
- Every confirmed booking produces an email with a QR code ticket

## 2. Roles

Exactly three roles. No others.
- **Admin** — creates/manages venues and seat layouts/categories. Highest privilege.
- **Organiser** — registers, logs in, creates event/show listings tied to a venue, sets per-category pricing, views booking summary + revenue per event.
- **Customer** — registers, logs in, browses/filters events, views seat map, holds/books seats, joins waitlist, views/cancels bookings.

Auth is JWT-based. Every API route is guarded by role. Frontend routes are guarded too (a customer must never see organiser/admin screens and vice versa).

## 3. Core Entities (conceptual — see architecture.md for schema)

- **Venue**: has a name, address, and a seat layout (rows/columns/sections), where each physical seat belongs to a **category** (e.g. Premium, Standard, Balcony).
- **Event**: a movie or concert, owned by an organiser.
- **Show**: a specific date/time instance of an event at a specific venue, with per-category pricing for that show.
- **Seat status**: per show, per seat — one of `available`, `held`, `booked`. This is always scoped to a show, never global to the venue.
- **Booking**: a confirmed purchase of one or more seats for a show by a customer.
- **Waitlist entry**: a customer waiting for a seat in a specific category of a specific show, once that category is sold out.

## 4. Functional Requirements (exhaustive)

### 4.1 Admin
- Create/edit venues.
- Define seat layout: rows, columns, aisles/sections, and assign each seat a category.
- Define seat categories (name + relative tier, e.g. Premium/Standard/Balcony).

### 4.2 Organiser
- Register and log in.
- Create movie or event (concert) listings.
- For each listing, create one or more **shows**: venue, date, time, and per-category price for that show.
- View booking summary per event: seats sold per category, revenue, remaining inventory, waitlist size per category.

### 4.3 Customer
- Register and log in.
- Browse and filter events (by date, venue, category/type).
- View a live, visual seat map for a chosen show. Seat colors reflect real status: available / held / booked.
- Select seat(s) → system places a **hold** with a configurable TTL (default 10 minutes).
- Held seats are immediately shown as unavailable to all other customers viewing the same show (real-time, not just on refresh).
- If the customer abandons checkout, the hold **auto-releases** when the TTL expires, and the seat map updates in real time for everyone.
- **No two customers can hold or book the same seat at the same time.** This must be enforced correctly under concurrent requests.
- On successful booking: customer receives an email containing a QR code ticket. The QR encodes the booking reference.
- If a category on a show is sold out, the customer can join a **waitlist** for that category (not for a specific seat — for the category).
- Customer can view booking history.
- Customer can cancel a booking.

### 4.4 Waitlist & Reallocation
- Waitlist is a **FIFO queue per (show, category)**.
- When a booking that includes a seat in that category is **cancelled**, the freed seat is automatically offered to the next person in that category's waitlist.
- That person receives an email with a **time-limited link** (configurable TTL, e.g. 15 minutes) to complete the booking for that specific seat.
- If they do not complete the booking within the time limit, the offer expires automatically and the seat is offered to the **next** person in the queue. This must chain correctly — if that person also doesn't respond in time, it continues to the next, and so on, until the queue is exhausted or someone accepts.
- If accepted in time, it becomes a normal confirmed booking (removed from waitlist, QR + email sent).
- This entire flow is driven by a background scheduler — it does not depend on any customer loading a page at the right time.

## 5. Non-Functional / Technical Requirements

- Backend API + Frontend + Database, with role-based auth.
- Seat map is stored per show with per-seat status, rendered as a real visual grid on the frontend (not a placeholder list).
- Seat hold TTL is enforced via a scheduler or DB-level expiry — not just a frontend timer.
- Concurrency protection: simultaneous hold/booking attempts on the same seat must not both succeed. This must be enforced at the database/transaction level.
- Real-time seat map updates (websocket or equivalent) — other customers must see a seat go from available → held/booked without refreshing.
- QR code generated server-side on booking confirmation; encodes the booking reference.
- Email delivery on: booking confirmation (QR ticket), and waitlist offer (time-limited link).

## 6. Deliverables

1. Zip of complete source code.
2. README with: setup guide, `.env.example`, API docs, DB schema, and an explanation of seat hold + waitlist logic.
3. Hosted application URL.
4. System design write-up (max 800 words): seat hold/TTL mechanism, concurrency prevention, waitlist auto-assignment flow, time-limited offer handling.

## 7. Explicit Non-Goals (do not build these — avoid scope creep / hallucinated features)

- No real payment gateway integration required — a mock/simulated "confirm payment" step is sufficient to trigger booking confirmation.
- No seat-level waitlist (waitlist is category-level, not tied to one physical seat).
- No social login, no third-party OAuth — simple email/password JWT auth only.
- No native mobile app — web only, responsive is a bonus but not required.
- No multi-currency/multi-language support.

## 8. Project Name

The product is called **Seatzy** everywhere — page titles, README, repo name, email sender name, branding in the UI header (in place of any placeholder like "CineFlow").
