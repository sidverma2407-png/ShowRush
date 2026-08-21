# 🎟️ Seatzy — High-Concurrency Ticket Booking & Reservation Platform

Seatzy is a full-stack, production-ready ticket booking engine for Movies, Concerts, and Sports events designed to handle high-demand ticket sales, zero-double-booking concurrency control, automatic waitlist reallocation, real-time seat maps, and QR code ticket generation.

---

## 🌟 Key Features

- **🎭 Visual Seat Map Engine**: Dedicated, interactive layouts for Movies (Executive, Premium, Standard), Concerts (VIP Pit, Golden Circle, Upper Deck), and Sports Stadiums (VIP Pavilion, Touchline/30-Yard Field, Bleachers).
- **🔒 Pessimistic Concurrency Control**: Prevents simultaneous double-holds or double-bookings using PostgreSQL row-level locks (`SELECT ... FOR UPDATE`).
- **⏳ 10-Minute Hold TTL & Auto-Release**: Temporary seat holds on checkout auto-expire if abandoned, with live WebSocket updates (`Socket.IO`) to all connected users.
- **⚡ Automatic Waitlist Reallocation**: Sold-out categories support FIFO waitlists. On booking cancellation, the freed seat is automatically held and offered to the next waitlisted user via a time-limited email link.
- **✉️ QR Code Ticket Delivery**: Confirmed bookings generate a unique QR code ticket containing the booking reference code and email it directly to the customer via `nodemailer`.
- **📊 Organiser & Admin Command Center**: Comprehensive dashboard tracking Gross Revenue (₹ INR), Tickets Sold, Capacity Utilization %, Show Schedules, Per-Category Pricing, and Booking Logs.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS (Neo-Brutalist design system), Material Symbols.
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, Socket.IO, Nodemailer, Node-Cron, QRCode.
- **Database**: PostgreSQL 16 (Dockerized).

---

## 🚀 Quick Setup Guide

### 1. Prerequisites
- Node.js v18+ & `npm`
- Docker & Docker Desktop (for local PostgreSQL database)

### 2. Environment Setup
Copy the sample environment configuration in the root directory:
```bash
cp .env.example .env
```

### 3. Spin Up PostgreSQL Database
```bash
docker-compose up -d
```

### 4. Backend Setup & Database Migration
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

## 🗄️ Database Schema Summary

The platform uses Prisma ORM connected to PostgreSQL with the following core entities:

- **`User`**: Role-based access control (`customer`, `organiser`, `admin`).
- **`Venue`**: Name, address, city, and relationships to `VenueSeat` and `Show`.
- **`SeatCategory`**: Recliner, VIP Pit, Premium, Standard, Bleachers.
- **`VenueSeat`**: Unique `(venue_id, row_label, seat_number, category_id)`.
- **`Event`**: Title, type (`movie`, `concert`, `comedy`, `sports`), description, poster URL, city.
- **`Show`**: Linking an `Event` to a `Venue` with specific `date`, `time`, and `status`.
- **`ShowCategoryPricing`**: Unique price per show and seat category (`show_id`, `category_id`, `price`).
- **`SeatStatus`**: Real-time seat state for a show (`available`, `held`, `booked`), `held_by`, `hold_expires_at`.
- **`Booking`**: Customer details, booking reference code, total price, QR code URL, and array of booked seats.
- **`WaitlistEntry`**: FIFO queue (`show_id`, `category_id`, `customer_id`, `position`, `status`, `offered_venue_seat_id`, `offer_expires_at`).

---

## 📡 Core API Endpoints

### 🔐 Authentication (`/api/auth`)
- `POST /api/auth/register` — Register new account (Role: Customer/Organiser)
- `POST /api/auth/login` — Authenticate and receive JWT token

### 🎬 Customer & Browsing (`/api`)
- `GET /api/events` — Filter events by city, category type, date range
- `GET /api/events/:id` — View event details & scheduled shows
- `GET /api/shows/:id/map` — Get visual seat grid with real-time status & pricing
- `POST /api/shows/:id/hold` — Place temporary 10-min hold on selected seats
- `POST /api/shows/:id/book` — Confirm booking, lock seats, generate QR ticket & email
- `DELETE /api/bookings/:id` — Cancel booking, release seats, trigger waitlist reallocation
- `POST /api/shows/:id/waitlist` — Join waitlist for sold-out category

### 🏛️ Organiser & Admin (`/api/organiser`)
- `GET /api/organiser/events` — Get organiser's managed events & gross metrics
- `POST /api/events` — Create new event listing
- `POST /api/events/:id/shows` — Schedule new show with date, time, & venue
- `PUT /api/shows/:id/pricing` — Set dynamic per-category seat prices
- `GET /api/events/:id/summary` — Event revenue summary, occupancy, & booking logs
- `GET /api/organiser/venues` / `POST /api/organiser/venues` — Manage partner venues & seat layouts

---

## 🏛️ System Design Write-Up

### 1. Seat Hold & TTL Expiry Mechanism
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

### 3. Waitlist Auto-Assignment & Time-Limited Offer Chaining
When a show's category is sold out, customers can join a First-In-First-Out (FIFO) waitlist queue (`WaitlistEntry`), receiving an incremental queue `position`.

When an existing customer cancels a booking (`DELETE /api/bookings/:id`):
1. The freed seats are identified along with their respective `category_id`.
2. For each freed seat, the system queries for the oldest active waitlist entry (`status = 'waiting'`) for that `(show_id, category_id)` ordered by `position ASC`.
3. If a waitlisted customer is found:
   - The waitlist status changes to `offered`.
   - An `offer_expires_at` TTL is set (e.g., 15 minutes).
   - The freed `SeatStatus` is reserved specifically for that customer (`held_by = customer_id`).
   - An automated email is sent to the customer containing a time-limited claim link (`/waitlist/offer/:id`).
4. If the waitlisted customer clicks the claim link before expiry, they complete payment and the seat becomes `booked`.
5. If the waitlisted customer fails to claim within the TTL, the background scheduler detects the expired offer (`status = 'offered'` and `offer_expires_at < NOW()`), marks the entry `expired`, and automatically offers the seat to the **next customer in line** (`position + 1`).
6. If no remaining users exist in the waitlist queue, the seat status is safely reverted to `available` on the public map.

---

## 📄 License & Compliance

Built for high-concurrency ticket reservation standards. All requirements are fully implemented and verified.
