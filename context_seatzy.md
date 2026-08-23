# Seatzy — Context & Requirements

This is the single source of truth for WHAT the product does. Do not infer, add, or remove features. If something is ambiguous, prefer the interpretation that matches an existing rule below rather than inventing new behavior.

## 1. Product Objective

High-demand events sell out instantly, leaving customers with no recourse. Last-minute cancellations go to waste when no automated reallocation exists. Seatzy is a ticket booking platform for movies and concerts where:
- Customers book seats from a responsive, real-time visual map
- Held seats auto-release on checkout abandonment via a 10-minute hold TTL
- Sold-out events have a category-based waitlist with automatic seat assignment on cancellation
- Every confirmed booking produces an email with a QR code ticket delivered via the Brevo API
- Complete multi-device responsiveness across Desktop, Laptop, Tablet, and Mobile devices

## 2. Roles

Exactly three roles with strict role-based access control (RBAC):
- **Admin** — creates and manages venues, custom seat layouts (rows/columns/aisles), and seat categories (e.g. Executive Recliner, Premium Club, Standard, Bleachers). Highest privilege.
- **Organiser** — registers, logs in, creates event and show listings tied to a venue, sets per-category pricing, and views real-time booking summaries and revenue metrics per event.
- **Customer** — registers, logs in (via password or instant Email OTP), browses and filters events (by city, genre, language, format, date), views live visual seat maps, holds/books seats, joins waitlists, views ticket history, and cancels bookings.

Auth is JWT-based. Every API route is guarded by role middleware. Frontend routes are guarded with dedicated route guards (a customer cannot access organiser/admin consoles and vice versa).

## 3. Core Entities (Conceptual Data Model)

- **Venue**: Has a name, address, city, and a physical seat layout (rows, columns, aisle gaps), where each physical seat belongs to a **category** (e.g., Executive Recliner, VIP Pit, Premium, Standard, Bleachers).
- **Event**: A movie, concert, stand-up comedy, or sports fixture, owned by an organiser with rich metadata (trailer URL, cast, certification, language, format, genre).
- **Show**: A specific date/time instance of an event at a specific venue, with per-category pricing for that show.
- **Seat status**: Per show, per seat — one of `available`, `held`, `booked`. This is always scoped to a show, never global to the venue.
- **Booking**: A confirmed purchase of one or more seats for a show by a customer, with a unique human-readable booking reference and scannable QR admission code.
- **Waitlist entry**: A customer waiting for a seat in a specific category of a specific show once that category is sold out, managed as a FIFO queue.

## 4. Functional Requirements (Exhaustive)

### 4.1 Admin
- Create, edit, and delete partner venues.
- Interactive Seating Studio: Define seat layout (rows, columns, aisles, sections) and paint seats with specific categories using cell, row, or column brush tools.
- One-click architectural presets: Cinema Multiplex, Stadium Arena, Concert Pit, and Comedy/Jazz Club.
- Define custom seat categories (name + color styling + relative tier).

### 4.2 Organiser
- Register and log in.
- Create movie or live event listings with rich metadata (cast, genre, trailer, rating).
- For each listing, create one or more **shows**: venue, date, time, format (2D, 3D, IMAX), language, and per-category price for that show.
- View real-time analytics command center: gross revenue (INR), tickets sold, capacity utilization percentage, and live attendee logs.

### 4.3 Customer
- Register and log in with password or 6-digit email OTP.
- Browse and filter events by city, category type, language, format, genre, and date.
- View an interactive, visual seat map for a chosen show. Seat colors reflect real-time status: available / held / booked.
- Select seat(s) → system places an atomic **hold** with a configurable TTL (default 10 minutes).
- Held seats are immediately shown as unavailable to all other customers viewing the same show via WebSocket broadcast.
- If the customer abandons checkout or the timer expires, the hold **auto-releases** and the seat map updates in real time for everyone.
- **No two customers can hold or book the same seat at the same time.** Enforced via database-level pessimistic row locking (`SELECT ... FOR UPDATE`).
- On successful booking: customer receives an email containing a high-resolution QR code ticket encoding the booking reference for offline gate verification.
- If a category on a show is sold out, the customer can join a **waitlist** for that category.
- Customer can view booking history, download PDF tickets, and cancel a booking.

### 4.4 Waitlist & Reallocation
- Waitlist is a **FIFO queue per (show, category)**.
- When a booking that includes a seat in that category is **cancelled**, the freed seat is automatically offered to the next person in that category's waitlist.
- That person receives an email notification with a **time-limited claim link** (configurable TTL, default 15 minutes) to complete the booking for that specific seat.
- If they do not complete the booking within the time limit, the offer expires automatically and the seat is offered to the **next** person in the queue. This chains recursively until someone accepts or the queue is exhausted.
- If accepted in time, it becomes a confirmed booking with an instant QR ticket dispatched via email.
- This entire flow is automated by a background cron scheduler.

## 5. Non-Functional & Technical Requirements

- Backend REST API + Frontend SPA + PostgreSQL Database with strict role-based auth.
- Seat map is stored per show with per-seat status, rendered as a responsive visual matrix on the frontend.
- Seat hold TTL is enforced via background cron sweeps and database-level expiry.
- Strict concurrency protection: simultaneous hold/booking attempts on the same seat are serialized with PostgreSQL `FOR UPDATE` row locks.
- Real-time seat map synchronization via Socket.IO rooms.
- QR code generated server-side on booking confirmation, encoding booking reference data for 100% offline turnstile scanning.
- Transactional email delivery via the Brevo HTTP API (HTTPS port 443) with SMTP fallback.
- Fully responsive across mobile (375px–767px), tablet (768px–1023px), and desktop (1024px–1440px+).

## 6. Deliverables

1. Source code repository with frontend, backend, and database migrations.
2. Complete documentation: `README.md`, `SYSTEM_DESIGN.md`, `REQUIREMENTS.md`, `context_seatzy.md`, `design_seatzy.md`, and `architecture_seatzy.md`.
3. Hosted application URL.
4. System design write-up covering seat hold/TTL mechanism, concurrency locks, waitlist auto-assignment, and pass verification.

## 7. Project Name

The product is named **Seatzy** consistently across all page titles, headers, email sender names, and documentation.
