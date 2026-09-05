# Seatzy

High-performance, full-stack ticket booking platform for Movies, Concerts, Stand-up Comedy, and Live Sports. Built for high-demand ticket drops with zero-double-booking concurrency control, automated waitlist reallocation on cancellations, real-time visual seat selection, instant QR admission tickets delivered via email, and responsive UI across all screen sizes.

---

## Key Features

- **Responsive Visual Seat Map Engine**: Dedicated, interactive layouts for Movies (Executive Recliner, Premium Club, Standard), 360° Concert Arenas (VIP Front Stage Pit, Golden Circle, Upper Deck), and Sports Stadiums (VIP Pavilion, Touchline/30-Yard Field, Bleachers). Supports bounded pan & pinch-zoom on mobile and tablet devices.
- **Pessimistic Concurrency Control**: Prevents simultaneous double-holds or double-bookings using PostgreSQL row-level serialization locks (`SELECT ... FOR UPDATE`) wrapped inside atomic database transactions.
- **10-Minute Hold TTL & Auto-Release Sweeper**: Temporary seat holds during checkout automatically expire if abandoned. A background cron worker sweeps expired holds and broadcasts live WebSocket state updates (`Socket.IO`) to all connected patrons in real time.
- **Automatic Waitlist Reallocation Engine**: Sold-out categories support FIFO waitlists. On booking cancellation, the freed seat is automatically held and offered to the next waitlisted user via a secure, time-limited email link. Unclaimed offers cascade automatically down the queue.
- **Brevo API Email & QR Code Ticket Delivery**: Confirmed bookings generate a unique QR code ticket containing the booking reference code and dispatch it directly to the customer's inbox via the **Brevo HTTP API** (port 443).
- **Pro Admin Seating Studio**: Dedicated visual venue architect allowing platform administrators to build custom venue seating charts, configure multi-tier seat categories, use architectural presets (Cinema, Stadium, Concert, Club), and paint seats with row/column tools.
- **Organiser Analytics & Command Center**: Comprehensive dashboard tracking Gross Revenue (INR), Tickets Sold, Capacity Utilization %, Show Schedules, Per-Category Pricing, and Live Booking Logs.
- **Multi-Device Responsiveness**: Designed with responsive layouts across Large Desktop (`1440px+`), Laptop (`1024px–1439px`), Tablet (`768px–1023px`), and Mobile (`375px–767px`), including full support for mobile "Request Desktop Site" mode.

---

## Screenshots

### 1. Landing & Authentication

![Login Page](./README%20SS/loginpage.png)
![Register Page](./README%20SS/registerpage.png)

### 2. Discover & Events
![Explore Page](./README%20SS/explorepage.png)
![Movie Details](./README%20SS/movie.png)

### 3. Booking & Seat Selection
![Seat Map](./README%20SS/seatmap.png)

### 4. Tickets & Emails
![Tickets Page](./README%20SS/ticketspage.png)
![Gmail Ticket](./README%20SS/gmailticket.png)
![Gmail OTP](./README%20SS/gmailOTP.png)

### 5. Organiser Dashboard
![Dashboard](./README%20SS/dashboard.png)
![Create Event](./README%20SS/createevent.png)

---

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS (Neo-Brutalist design system), Material Symbols, jsPDF, html2canvas, Socket.IO Client.
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, Socket.IO, Node-Cron, QRCode, Axios (Brevo HTTP API integration).
- **Database**: PostgreSQL 16 (Dockerized / Cloud Hosted).
- **Email Delivery**: Brevo (Sendinblue) Transactional HTTP API (HTTPS port 443) with SMTP fallback.

---

## Quick Setup Guide

### 1. Prerequisites
- Node.js v18+ and `npm`
- Docker and Docker Desktop (for local PostgreSQL database)

### 2. Environment Setup
Copy the sample environment configuration in the root directory:
```bash
cp .env.example .env
```

Ensure your `.env` contains:
```env
PORT=5000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/seatzy?schema=public"
JWT_SECRET="supersecretjwtkeyforseatzyapp"
BREVO_API_KEY="your-brevo-api-key"
BREVO_SENDER_EMAIL="your-verified-sender@example.com"
BREVO_SENDER_NAME="Seatzy Tickets"
HOLD_TTL_MINUTES=10
WAITLIST_OFFER_TTL_MINUTES=15
```

### 3. Spin Up PostgreSQL Database
```bash
docker-compose up -d
```

### 4. Backend Setup and Database Migration
```bash
cd backend
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```
*(Backend runs on `http://localhost:5000`)*

### 5. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
*(Frontend runs on `http://localhost:5173`)*

---

## 1-Click Demo Accounts

For instant evaluation, the login page includes quick auto-fill buttons:
- **Customer Account**: `customer@seatzy.com` / `password123`
- **Organiser Account**: `organiser@seatzy.com` / `password123`
- **Admin Account**: `admin@seatzy.com` / `password123`

---

## Database Schema Summary

The platform uses Prisma ORM connected to PostgreSQL with the following core entities:

- **`User`**: Role-based access control (`customer`, `organiser`, `admin`), email verification state, and hashed credentials.
- **`Venue`**: Name, address, city, and relationships to `VenueSeat` and `Show`.
- **`SeatCategory`**: Recliner, VIP Pit, Premium, Standard, Bleachers.
- **`VenueSeat`**: Unique `(venue_id, row_label, seat_number, category_id)`.
- **`Event`**: Title, type (`movie`, `concert`, `comedy`, `sports`), description, poster URL, cast, trailer URL, certification, language, format, genre.
- **`Show`**: Linking an `Event` to a `Venue` with specific `date`, `time`, `language`, `format`, and `status`.
- **`ShowCategoryPricing`**: Unique price per show and seat category (`show_id`, `category_id`, `price`).
- **`SeatStatus`**: Real-time seat state for a show (`available`, `held`, `booked`), `held_by`, `hold_expires_at`.
- **`Booking`**: Customer details, booking reference code, total price, QR code URL, status (`confirmed`, `cancelled`), and relation to booked seats.
- **`WaitlistEntry`**: FIFO queue (`show_id`, `category_id`, `customer_id`, `position`, `status`, `offered_venue_seat_id`, `offer_expires_at`, `offer_token`).
- **`AddonItem` & `BookingAddon`**: Food, beverages, combo snacks, and discount coupon applications.

---

## Core API Endpoints

### Authentication (`/api/auth`)
- `POST /api/auth/register`: Register new account (Customer / Organiser / Admin)
- `POST /api/auth/login`: Authenticate with password or Email OTP
- `POST /api/auth/send-otp`: Request 6-digit email sign-in code
- `POST /api/auth/verify-otp-login`: Authenticate via Email OTP
- `POST /api/auth/test-email`: Test live Brevo email delivery

### Customer and Browsing (`/api`)
- `GET /api/events`: Filter events by city, category type, language, format, genre, date
- `GET /api/events/:id`: View event details, cast, reviews, trailers, and scheduled shows
- `GET /api/shows/:id/seats`: Get visual seat grid with real-time status and pricing
- `POST /api/shows/:id/hold`: Place temporary 10-min hold on selected seats
- `POST /api/bookings`: Confirm booking, lock seats, apply coupons, generate QR ticket and email
- `DELETE /api/bookings/:id`: Cancel booking, release seats, trigger waitlist reallocation
- `POST /api/shows/:id/waitlist`: Join waitlist for sold-out category
- `GET /api/waitlist/offer/:token`: View and accept time-limited waitlist offer
- `POST /api/waitlist/offer/:token/accept`: Claim offered seat and confirm ticket

### Admin & Venue Studio (`/api/admin` & `/api/venues`)
- `GET /api/venues`: Retrieve all venues with seat matrices and category details
- `POST /api/venues`: Create a new venue
- `DELETE /api/venues/:id`: Delete venue
- `POST /api/venues/:id/seats`: Save custom painted seat matrix for venue
- `GET /api/seat-categories`: Get all seat categories
- `POST /api/seat-categories`: Create new seat category
- `DELETE /api/seat-categories/:id`: Delete seat category

### Organiser Command Center (`/api/organiser`)
- `GET /api/organiser/events`: Get organiser's managed events and gross metrics
- `POST /api/events`: Create new event listing with metadata, trailer, cast
- `POST /api/events/:id/shows`: Schedule new show with date, time, venue, and per-tier pricing
- `PUT /api/shows/:id/pricing`: Set dynamic per-category seat prices
- `GET /api/events/:id/summary`: Event revenue summary, occupancy, and booking logs

---

## System Design Write-Up

### 1. Seat Hold and TTL Expiry Mechanism
When a customer selects seats on the interactive visual map and initiates checkout, a request is sent to `POST /api/shows/:id/hold`. The system verifies availability and updates the `SeatStatus` records:
- Status transitions from `available` to `held`.
- Sets `held_by` to the customer's user ID.
- Sets `hold_expires_at` timestamp to `NOW() + 10 MINUTES` (configurable via `HOLD_TTL_MINUTES` env).

A background `node-cron` scheduler task sweeps the database every 60 seconds. Any hold records where `status = 'held'` and `hold_expires_at < NOW()` are automatically reverted to `available` (with `held_by` and `hold_expires_at` cleared). Once updated, the backend immediately emits a `seat_status_updated` event via WebSocket to all connected frontend clients viewing that show map, giving real-time visual feedback.

### 2. Concurrency Protection for High-Demand Events
To eliminate double-booking and race conditions during high-concurrency ticket drops, Seatzy uses **PostgreSQL Row-Level Locking (`SELECT ... FOR UPDATE`)** inside Prisma interactive database transactions:

1. When User A and User B simultaneously attempt to hold or book Seat `A1`, both open a database transaction.
2. The backend executes `SELECT * FROM seat_status WHERE show_id = X AND venue_seat_id = Y FOR UPDATE`.
3. PostgreSQL grants an exclusive row lock to User A's transaction first. User B's query blocks and waits.
4. User A's transaction verifies that Seat `A1` status is `available`, updates it to `held`/`booked`, and commits.
5. User B's blocked transaction unblocks, reads the freshly committed state of Seat `A1`, detects that status is now `held`/`booked`, aborts the transaction, and returns an HTTP `409 Conflict` response (`"Seat A1 is no longer available"`).

This strict database-level serialization guarantees that no two users can hold or book the same seat, even under thousands of concurrent requests per second.

### 3. Waitlist Auto-Assignment and Time-Limited Offer Chaining
When a show's category is sold out, customers can join a First-In-First-Out (FIFO) waitlist queue (`WaitlistEntry`), receiving an incremental queue `position`.

When an existing customer cancels a booking (`DELETE /api/bookings/:id`):
1. The freed seats are identified along with their respective `category_id`.
2. For each freed seat, the system queries for the oldest active waitlist entry (`status = 'waiting'`) for that `(show_id, category_id)` ordered by `position ASC`.
3. If a waitlisted customer is found:
   - The waitlist status changes to `offered`.
   - An `offer_expires_at` TTL is set (e.g., 15 minutes).
   - The freed `SeatStatus` is reserved specifically for that customer (`held_by = customer_id`).
   - An automated email is sent to the customer containing a time-limited claim link (`/waitlist/offer/:token`).
4. If the waitlisted customer clicks the claim link before expiry, they complete booking and the seat becomes `booked`.
5. If the waitlisted customer fails to claim within the TTL, the background scheduler detects the expired offer (`status = 'offered'` and `offer_expires_at < NOW()`), marks the entry `expired`, and automatically offers the seat to the **next customer in line** (`position + 1`).
6. If no remaining users exist in the waitlist queue, the seat status is safely reverted to `available` on the public map.

---

## License and Compliance

Built for high-concurrency ticket reservation standards. All requirements are fully implemented, tested, and verified.
