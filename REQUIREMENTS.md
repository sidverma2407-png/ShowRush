# Ticket Booking System Specification & Requirements

## Objective
High-demand events sell out instantly, leaving many customers with no recourse. Meanwhile, last-minute cancellations go to waste when no automated reallocation exists. Build a ticket booking platform for movies and concerts where customers book seats from a visual map, held seats auto-release on checkout abandonment, sold-out events have a waitlist with automatic seat assignment on cancellation, and every confirmed booking produces an email with a QR code ticket.

---

## Scope of Work & Feature Checklist

- [x] **Input**: Event selection, seat selection, customer details.
- [x] **Output**: Confirmed booking, QR code ticket via email, waitlist management on cancellation.
- [x] **Admin Role**: Admin creates and manages venues with seat layout and seat categories (e.g. Executive Recliner, Premium Club, Standard).
- [x] **Organiser Role**: Organiser registers, logs in, and creates movie or event listings with venue, date, time, format, language, and per-category pricing.
- [x] **Customer Role**: Customer registers, logs in, browses and filters events (by city, language, format, genre, date), and views a visual seat map with real-time seat status (`available` / `held` / `booked`).
- [x] **Seat Hold & TTL**: Customer selects seats; system places a hold with a configurable TTL (10 minutes); held seats are shown as unavailable to other customers in real time via WebSockets (`Socket.IO`).
- [x] **Auto-Release on Abandonment**: If customer abandons checkout or timer expires, held seats auto-release; seat map updates in real time for all connected patrons.
- [x] **Pessimistic Concurrency Protection**: System prevents two customers from holding or booking the same seat simultaneously using PostgreSQL row-level locks (`SELECT ... FOR UPDATE`).
- [x] **QR Code & Email Delivery**: On successful booking, customer receives an email with a QR code ticket; QR encodes booking reference for offline gate verification.
- [x] **Waitlist Engine**: When an event is sold out, customer can join a FIFO waitlist for a specific seat category.
- [x] **Automatic Seat Reallocation**: When a booking is cancelled, the freed seat is offered to the next customer on the waitlist; they receive an email notification with a time-limited link to complete the booking.
- [x] **Cascading Waitlist Expiry**: If the waitlisted customer does not complete booking within the time limit (15 minutes), the seat is automatically offered to the next person in line.
- [x] **Customer Booking History**: Customer can view booking history, download PDF tickets with QR codes, and cancel bookings.
- [x] **Organiser Analytics**: Organiser views booking summaries, gross revenue per event in INR, capacity utilization %, and live attendee logs.

---

## Technical Architecture & Implementation

- **Role-Based Authentication**: Customer, Organiser, Admin roles with JWT session management, password sign-in, and 6-digit Email OTP login.
- **Visual Seat Map Engine**: Dedicated visual grids for Cinema Multiplexes, 360° Concert Arenas, Comedy Clubs, and Sports Stadiums with pan/pinch-zoom support on mobile viewports.
- **Seat Hold TTL Sweeper**: Node-Cron background sweeper runs every 60 seconds to expire abandoned holds and cascade waitlist offers.
- **Concurrency Protection**: Strict transaction serialization via PostgreSQL `FOR UPDATE` row locks, preventing race conditions during high-demand sales.
- **Email Infrastructure**: Brevo (Sendinblue) Transactional HTTP API over HTTPS (port 443) for reliable deliverability on cloud hosting.
- **Responsive Frontend**: Tailwind CSS Neo-Brutalist design system fully responsive across mobile (375px–767px), tablet (768px–1023px), and desktop (1024px–1440px+).

---

## Deliverables & Artifacts

1. **Source Code**: Complete, tested frontend and backend codebase in TypeScript.
2. **README**: Full setup guide, `.env.example`, database schema summary, API documentation, and architecture write-up.
3. **Screenshots Gallery**: 13 full-resolution UI screenshots linking to all user flows in `README SS/`.
4. **System Design Document**: Architectural write-up (`SYSTEM_DESIGN.md`) detailing seat hold TTLs, concurrency locking, waitlist lifecycle, and pass verification.
5. **Requirements Verification**: Complete feature audit matching the specification.
