# Seatzy - Ticket Booking Platform

Seatzy is a complete, production-grade ticket booking platform for movies and concerts built with Node.js, Express, React, and PostgreSQL.

## Features
- **Real-time Seat Map**: View seat availability and holds live via WebSockets.
- **Strict Concurrency Control**: Prevents double-booking using `SELECT ... FOR UPDATE` row locks.
- **Automatic Waitlist Reallocation**: Cancelled seats are immediately offered to waitlisted users with a time-limited TTL link.
- **Neo-Brutalism Design**: Strict geometric layouts, high-contrast colors, hard shadows.

## Tech Stack
- Frontend: React (Vite), Tailwind CSS, Zustand, Socket.IO Client.
- Backend: Express, Prisma, Socket.IO, Nodemailer.
- Database: PostgreSQL (Dockerized).

## Setup Guide

1. **Clone & Environment**:
   Rename `.env.example` to `.env` in the root folder and provide real values (or keep defaults for local dev with Ethereal).

2. **Database (Docker)**:
   Ensure Docker Desktop is running, then run:
   ```bash
   docker-compose up -d
   ```

3. **Backend Setup**:
   ```bash
   cd backend
   npm install
   npx prisma migrate dev --name init
   npm run dev
   ```

4. **Frontend Setup**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## System Design Write-Up

### Seat Hold + TTL Mechanism
When a customer selects a seat, a hold request is sent to `POST /api/shows/:id/hold`. The backend uses Prisma `$transaction` and `$queryRawUnsafe` to execute a `SELECT ... FOR UPDATE` on the `seat_status` rows. If available, it updates the `status` to `held`, sets `held_by`, and assigns a `hold_expires_at` timestamp (current time + 10 mins). This change is immediately broadcasted via Socket.IO. A background Node-cron job runs every minute to sweep the table for rows where `hold_expires_at < now()`, reverting them to `available` and broadcasting the update.

### Concurrency Prevention Approach
The exact mechanism relies on PostgreSQL row-level locks. By opening a transaction and using `SELECT ... FOR UPDATE` on the specific `(show_id, venue_seat_id)` row(s), the database serializes any concurrent requests targeting the same seat. 
If User A and User B request the same seat at the exact same millisecond:
1. Postgres grants the lock to User A's transaction.
2. User B's transaction blocks and waits.
3. User A's transaction sees `status = 'available'`, updates it to `held`, and commits.
4. User B's transaction acquires the lock, reads the freshly updated row, sees `status = 'held'`, rolls back, and returns a 409 Conflict.
This guarantees no race conditions at the database level.

### Waitlist Auto-Assignment Flow
When an event category is sold out, users can join a FIFO waitlist. If a confirmed booking is cancelled, the `/api/bookings/:id` DELETE endpoint iterates through the freed seats. For each seat, it checks the `waitlist_entries` table for the oldest `waiting` user in that category. If found, it updates the waitlist entry to `offered`, sets an `offer_expires_at` TTL, reserves the physical seat for that specific user, and dispatches an email containing a secure link.

### Time-Limited Offer Handling and Chaining
The waitlist email contains a link to the frontend (e.g., `/waitlist/offer/:token`), where `:token` is the unguessable UUID of the `waitlist_entries` row. The user must click this and accept the offer before the TTL expires.
If they do not, the Node-cron waitlist sweep job detects the expired offer, marks it `expired`, and automatically cascades: it finds the *next* person in the waitlist queue, updates their entry to `offered` with a new TTL, and sends them an email. If the queue is exhausted, the seat reverts to `available` on the public map.
