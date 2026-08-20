# SEATZY — Master Build Prompt (for Antigravity / Gemini 3.1 Pro)

You are an expert full-stack engineer and lead product architect. Build a complete, production-grade, deployable web application called **"Seatzy"** — a ticket booking platform for movies and concerts. Follow every requirement below exactly. Do not simplify, omit, or substitute any feature. If a trade-off is unavoidable, document it explicitly in the README rather than silently dropping scope.

---

## 1. Product Objective

High-demand events sell out instantly, leaving customers with no recourse, while last-minute cancellations go to waste with no automated reallocation. Seatzy solves this with: real-time visual seat selection, TTL-based seat holds, race-condition-proof booking, an automatic waitlist with time-limited offers on cancellation, and QR-code e-tickets delivered by email.

---

## 2. Tech Stack (use this unless a strong reason is documented otherwise)

- **Frontend:** React (Vite), Tailwind CSS, React Router, a lightweight state manager (Zustand or Context), Socket.IO client (or SSE) for real-time seat map updates.
- **Backend:** Node.js + Express (or NestJS), REST API, Socket.IO server for real-time seat status broadcast.
- **Database:** PostgreSQL (relational integrity matters here — seats, holds, bookings, waitlist all need strong consistency). Use Prisma or an equivalent ORM.
- **Concurrency control:** Database-level row locking (`SELECT ... FOR UPDATE`) or a unique constraint + transaction pattern on `(show_id, seat_id)` to guarantee no double-hold/double-book. Explain the chosen mechanism in the write-up.
- **Scheduler:** A background job (node-cron, BullMQ + Redis, or Postgres `pg_cron`) to expire holds and process waitlist offer timeouts.
- **QR codes:** `qrcode` npm package, generated server-side, encoding the booking reference.
- **Email:** Any free-tier transactional email service (Resend, Nodemailer + Gmail SMTP, or SendGrid free tier).
- **Auth:** JWT-based, role-based access control for `customer`, `organiser`, `admin`.
- **Hosting:** Frontend on Vercel, backend + DB on Render/Railway. Provide a single hosted URL.

---

## 3. Functional Requirements — Build ALL of the following

### 3.1 Roles & Auth
- Customer, Organiser, Admin roles with JWT auth and route-level guards on both frontend and backend.
- Admin creates and manages **venues**: name, address, and a configurable **seat layout** (rows × columns, aisles, sections) with **seat categories** (e.g. Premium, Standard, Balcony) each carrying its own price multiplier.
- Organiser registers, logs in, and creates **event listings** (movie screenings or concerts) tied to a venue, date, time, and per-category pricing for that specific show.

### 3.2 Customer Flow
- Register/login, browse and filter events (by date, venue, category, genre/type).
- View a **visual seat map** for a specific show with real-time status per seat: `available`, `held`, `booked`.
- Select one or more seats → system places a **hold** with a configurable TTL (default 10 minutes, must be configurable via env/admin setting).
- Held seats are immediately broadcast as unavailable to all other connected clients (via websocket) — not just on page refresh.
- If checkout is abandoned, the hold **auto-expires** and the seat reverts to `available`, broadcast in real time.
- **Concurrency guarantee:** two customers attempting to hold/book the same seat at the same instant — only one may succeed; the other gets an immediate, clear rejection (not a race that corrupts state). This must be enforced at the database/transaction level, not just in application logic.
- On successful payment/confirmation, customer receives an **email with a QR code ticket**; the QR encodes the booking reference (and ideally seat/show metadata as a JSON payload or a lookup URL).
- When a show is sold out for a category, customer can **join a waitlist** for that category.
- Customer can view **booking history** and **cancel a booking**.

### 3.3 Waitlist & Reallocation (core differentiator — build this carefully)
- Waitlist is a **per-category FIFO queue** per show.
- On cancellation, the freed seat is **automatically offered** to the next customer in that category's waitlist.
- That customer receives an **email with a time-limited link** (configurable TTL, e.g. 15 minutes) to complete the booking for that specific seat.
- If they don't complete it in time, the offer **automatically expires** and the seat is offered to the **next** person in line — this must chain correctly, not just fail silently.
- If the waitlisted customer completes the booking, they are removed from the queue and it's a normal confirmed booking (QR + email).
- All of this must be driven by the scheduler, not by a customer's next page load.

### 3.4 Organiser Tools
- Organiser can view a **booking summary and revenue per event**: seats sold per category, total revenue, remaining inventory, waitlist size per category.

---

## 4. Data Model (design and justify exact schema in README)

At minimum:
- `venues` (id, name, address, layout metadata)
- `venue_seats` (id, venue_id, row, col, category, section label)
- `events` (id, organiser_id, title, type [movie/concert], description, poster)
- `shows` (id, event_id, venue_id, date, time, status)
- `show_seat_pricing` (show_id, category, price)
- `seat_status` (id, show_id, venue_seat_id, status [available/held/booked], held_by, hold_expires_at) — **this is the real-time source of truth per show**
- `bookings` (id, customer_id, show_id, seats[], total_price, status [confirmed/cancelled], booking_reference, qr_code_url, created_at)
- `waitlist_entries` (id, show_id, category, customer_id, position, status [waiting/offered/expired/booked], offer_expires_at)
- `users` (id, name, email, password_hash, role)

Every seat's real-time status for a given show must be derivable unambiguously from `seat_status` — no derived/implicit states.

---

## 5. UI / Design System — STRICT Neo-Brutalism

The attached reference image (`Gemini_Generated_Image_ifmsvqifmsvqifms.png`) is the visual north star. Match its density, layout blocks, and raw structural feel — a black-and-white drafting-paper aesthetic with acid-yellow as the dominant accent, thick black borders, and hard unblurred shadows.

**Design tokens — apply consistently across every screen:**
- **Colors:** Pure black (`#000000`) and white (`#FFFFFF`) as the base. Accent colors: acid yellow (`#F2FF00` or similar), neon magenta (`#FF00E5`), bright cyan (`#00F0FF`) — used sparingly and purposefully (status colors, CTAs, highlights), never as full-page backgrounds.
- **Borders:** `border-4 border-black` (or `border-[3px]`/`border-[6px]` for hierarchy) on every container, card, button, and input. No soft/rounded-only cards without a border.
- **Shadows:** Solid, unblurred, offset black shadows — `shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]` (scale up to `8px_8px` for hero elements). On hover/press, shift the shadow or translate the element to fake a "pressed into the page" interaction.
- **Typography:** Massive, uppercase, bold, heavy sans-serif (e.g. `font-black uppercase tracking-tight`) for all headings — headings should feel structural, not decorative. Body/data text can drop to a monospace font for stats/data blocks (matches the reference image's data panels).
- **Background:** A subtle architectural/blueprint grid pattern (thin gray grid lines) across main page backgrounds — implement via a repeating CSS `linear-gradient` background or SVG pattern, low opacity, never competing with content.
- **No gradients, no soft shadows, no border-radius on structural elements** (radius only allowed, sparingly, on pill-style status badges if any). Everything is geometric and raw.
- Layout should feel like data-dense structural blocks (see reference image's "VENUE STATS," "TOTAL STATS," "TOTAL REVENUE" panels) — use bordered grid sections, not floating whitespace-heavy cards.

### Required components (build exactly these, styled per the tokens above):

**1. Live Seat Map**
- Real-time grid of raw geometric squares (no rounded seat icons).
- Color coding: **White** = available, **Black** = booked, **Acid Yellow** = held-by-others/waitlisted indicator (match reference: it uses yellow heavily as the primary "taken/active" state — use yellow for held-by-current-flow/general active seats and reserve **Magenta** specifically for "seat currently held by you / in your active hold" per the reference card, with a **visible countdown timer** (mm:ss) rendered directly on or next to the held seat).
- Seat click opens a detail panel (matching reference's "SEAT C7 / WAITLIST: YOU ARE #4 / CLAIM SEAT (10m timer)" panel) showing seat info, waitlist position if applicable, and a claim/hold CTA with its own TTL countdown.
- Must update live via websocket without requiring refresh.

**2. Organiser Analytics Dashboard**
- Neo-brutalist, data-dense layout with distinct bordered blocks: "TOTAL REVENUE," "VENUE STATS," "TOTAL STATS," booking summary per category/show — mirror the reference image's right-hand sidebar stat-block structure (label/value rows in monospace inside bordered boxes).

**3. Recent Bookings / Digital Tickets**
- Each booking rendered as a stark bordered "ticket stub" card: event poster thumbnail, event/venue/ticket-ID text block, a generated QR code in its own bordered inset, and a prominent black "CANCEL BOOKING" button (full-width, high-contrast) — matching the reference image's bottom "RECENT BOOKINGS" row exactly.

Build these as modular React components using modern hooks (`useState`, `useEffect`, `useContext`/store, custom hooks for websocket subscription and countdown timers), ready to wire into the real backend API (no mock data left as the final state — mocks only as fallback/loading skeletons).

---

## 6. Deliverables (produce all of these)

1. **Complete source code** — organized as a monorepo or `/frontend` + `/backend` folders, zip-ready.
2. **README.md** including:
   - Setup guide (local run instructions)
   - `.env.example` for both frontend and backend
   - API documentation (all endpoints, methods, request/response shapes)
   - Full DB schema (table definitions + ER relationships)
   - Explanation of seat hold TTL mechanism and waitlist logic
3. **Hosted application URL** (deploy frontend to Vercel, backend+DB to Render or Railway).
4. **System design write-up (max 800 words)** covering:
   - Seat hold + TTL mechanism
   - Concurrency prevention approach (exact locking/transaction strategy, with why it prevents double-booking)
   - Waitlist auto-assignment flow
   - Time-limited offer handling and the chaining behavior when an offer expires

---

## 7. Non-negotiable Evaluation Criteria — self-check before finishing

- [ ] Seat hold TTL auto-releases correctly and updates the seat map in real time for all connected clients
- [ ] Concurrent hold/booking attempts on the same seat are provably safe (describe/demonstrate the test)
- [ ] Waitlist auto-assignment on cancellation works, including the expiry chain to the next person
- [ ] Seat map data model cleanly represents available/held/booked per seat per show
- [ ] QR code is generated and actually emailed on booking confirmation
- [ ] API is well-structured, code is modular, documentation is complete
- [ ] UI strictly matches the neo-brutalism design tokens and reference image across every screen, not just the seat map

Build the project under the name **"Seatzy"** throughout (branding, page titles, README, repo name). Do not deviate from any requirement above — treat this prompt as the full spec.
