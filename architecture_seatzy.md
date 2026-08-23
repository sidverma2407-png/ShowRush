# Seatzy — Architecture & Technical Specification

This is the single source of truth for the SYSTEM DESIGN. Follow this stack, schema, and mechanism design.

## 1. Stack

- **Frontend**: React 18 (Vite) + TypeScript + Tailwind CSS (Neo-Brutalist design tokens) + React Router v6. State: Zustand. Real-time: Socket.IO Client. PDF generation: jsPDF + html2canvas.
- **Backend**: Node.js + Express + TypeScript. REST API. Socket.IO server for real-time per-show seat status synchronization.
- **Database**: PostgreSQL 16 accessed via Prisma ORM with row-level locking capabilities.
- **Scheduler**: `node-cron` for periodic automated background sweeps (10-minute hold TTL expiry, 15-minute waitlist offer expiry).
- **QR Codes**: `qrcode` npm package (server-side generation), outputting data URLs and structured plain-text admission payloads for offline turnstile verification.
- **Email Delivery**: Brevo (Sendinblue) Transactional HTTP API over HTTPS (port 443) with Nodemailer SMTP fallback.
- **Auth**: JWT (access tokens), bcrypt for password hashing, and 6-digit Email OTP sign-in.
- **Hosting**: Frontend on Vercel, Backend + PostgreSQL on Render / Railway / Docker.

## 2. Repository Structure

```
/seatzy
  /frontend              # React 18 + Vite + Tailwind SPA
    /src
      /pages             # Events, SeatMap, Bookings, AdminVenues, OrganiserDashboard, Login, Register, WaitlistOffer
      /components        # Navbar, Footer, Modals (AddonSelection, CitySelect, Settings)
      /store             # Zustand auth and modal stores
      /api               # Fetch API client and WebSocket connection helpers
  /backend
    /src
      /controllers       # Auth, Events, Shows, Bookings, Holds, Waitlist, Admin, Organiser
      /routes            # Express route handlers grouped by resource
      /services          # Business logic: hold, booking, waitlist engine
      /jobs              # Node-cron background sweepers (hold TTL, waitlist cascading)
      /sockets           # Socket.IO room broadcasters
      /middleware        # Auth guards, role checks (Customer / Organiser / Admin)
      /utils             # Brevo HTTP API email service, QR code generator
      /prisma            # schema.prisma, migrations, seeds
  README.md
  SYSTEM_DESIGN.md
  REQUIREMENTS.md
  context_seatzy.md
  design_seatzy.md
  architecture_seatzy.md
```

## 3. Database Schema (Prisma PostgreSQL)

All primary keys use UUIDs. Timestamps (`created_at`, `updated_at`) are present across entities.

### `users`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary Key |
| `name` | String | User full name |
| `email` | String | Unique index |
| `password_hash` | String | Hashed credentials |
| `role` | Enum | `'customer'`, `'organiser'`, `'admin'` |
| `is_verified` | Boolean | Email verification status |
| `otp_code` | String | Nullable 6-digit OTP |
| `otp_expires_at` | Timestamp | Nullable OTP expiry |

### `venues`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary Key |
| `name` | String | Venue name |
| `address` | String | Address & city details |
| `city` | String | Indexed city name |
| `created_by` | UUID | FK → `users.id` |

### `seat_categories`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary Key |
| `name` | String | E.g. "Executive Recliner", "VIP Pit", "Premium Club", "Standard" |

### `venue_seats`
Physical seat inventory for a venue. Defined once per venue and reused across all shows.
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary Key |
| `venue_id` | UUID | FK → `venues.id` |
| `row_label` | String | E.g. "A", "B", "C" |
| `seat_number` | Int | E.g. 1, 2, 3... |
| `category_id` | UUID | FK → `seat_categories.id` |
| **Constraint** | Unique | `(venue_id, row_label, seat_number, category_id)` |

### `events`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary Key |
| `organiser_id` | UUID | FK → `users.id` |
| `title` | String | Event title |
| `type` | Enum | `'movie'`, `'concert'`, `'comedy'`, `'sports'` |
| `description` | String | Full overview text |
| `poster_url` | String | Media asset URL |
| `trailer_url` | String | YouTube embed link |
| `cast` | String | Starring cast members |
| `language` | String | E.g. "Hindi, English" |
| `format` | String | E.g. "2D, IMAX 3D" |
| `genre` | String | E.g. "Action, Sci-Fi" |
| `certification` | String | E.g. "UA", "A", "U" |

### `shows`
A specific scheduled date/time instance of an event at a venue.
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary Key |
| `event_id` | UUID | FK → `events.id` |
| `venue_id` | UUID | FK → `venues.id` |
| `date` | Timestamp | Show date |
| `time` | String | E.g. "19:00" |
| `language` | String | Show language |
| `format` | String | Show format |
| `status` | Enum | `'scheduled'`, `'completed'`, `'cancelled'` |

### `show_category_pricing`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary Key |
| `show_id` | UUID | FK → `shows.id` |
| `category_id` | UUID | FK → `seat_categories.id` |
| `price` | Decimal | Per-category price in INR |
| **Constraint** | Unique | `(show_id, category_id)` |

### `seat_status` (Real-Time Source of Truth per Show)
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary Key |
| `show_id` | UUID | FK → `shows.id` |
| `venue_seat_id` | UUID | FK → `venue_seats.id` |
| `status` | Enum | `'available'`, `'held'`, `'booked'` |
| `held_by` | UUID | Nullable FK → `users.id` |
| `hold_expires_at` | Timestamp | Nullable hold expiration |
| `booking_id` | UUID | Nullable FK → `bookings.id` |
| **Constraint** | Unique | `(show_id, venue_seat_id)` |

### `bookings`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary Key |
| `customer_id` | UUID | FK → `users.id` |
| `show_id` | UUID | FK → `shows.id` |
| `booking_reference`| String | Unique human-readable code (e.g. "SEATZY-7K9A2") |
| `total_price` | Decimal | Total order amount in INR |
| `customer_name` | String | Attendee name |
| `customer_phone` | String | Attendee phone |
| `status` | Enum | `'confirmed'`, `'cancelled'` |
| `qr_code_url` | String | Generated admission QR code data URL |

### `booking_seats` (Join Table)
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary Key |
| `booking_id` | UUID | FK → `bookings.id` |
| `venue_seat_id` | UUID | FK → `venue_seats.id` |

### `waitlist_entries` (FIFO Queue)
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary Key |
| `show_id` | UUID | FK → `shows.id` |
| `category_id` | UUID | FK → `seat_categories.id` |
| `customer_id` | UUID | FK → `users.id` |
| `position` | Int | Incremental FIFO queue rank |
| `status` | Enum | `'waiting'`, `'offered'`, `'expired'`, `'booked'`, `'cancelled'` |
| `offered_venue_seat_id` | UUID | Nullable FK → `venue_seats.id` |
| `offer_expires_at`| Timestamp | Nullable offer expiration |
| `offer_token` | String | Secure cryptographic token for claim link |

---

## 4. Concurrency Locking Mechanism

To ensure zero double-booking under extreme traffic:
1. Client requests to hold seats → backend initiates an atomic database transaction.
2. Inside the transaction, PostgreSQL executes `SELECT * FROM seat_status WHERE id IN (...) FOR UPDATE`.
3. If all target seats have `status = 'available'`, they transition to `status = 'held'`, `held_by = customer_id`, and `hold_expires_at = NOW() + 10 MIN`.
4. Any competing transaction on the same row blocks until the first transaction commits, reads the updated non-available status, aborts, and returns `HTTP 409 Conflict`.

---

## 5. Background Scheduled Jobs

### 5.1 Hold Expiry Sweeper
- Runs every 60 seconds (`*/1 * * * *`).
- Queries `seat_status` for `status = 'held' AND hold_expires_at < NOW()`.
- Resets them to `available`, clears `held_by`, and emits `seat_status_updated` via Socket.IO.

### 5.2 Waitlist Cascading Sweeper
- Runs every 60 seconds.
- Queries `waitlist_entries` for `status = 'offered' AND offer_expires_at < NOW()`.
- Transitions expired entry to `expired`, finds the next waiting entry (`position + 1`), sets an exclusive hold on the seat, and emails a new time-limited claim link.

---

## 6. Email & QR Pass Verification

- **Brevo HTTP API**: Direct REST calls via HTTPS port 443 with API key authentication for 100% reliable deliverability across all cloud hosts.
- **Offline QR Code Payload**: Formatted plain-text ticket metadata enabling security turnstiles to verify admissions completely offline.

---

## 7. Responsive Viewport Architecture

- **Large Desktop (`1440px+`)**: 3-column layouts, side-by-side venue builder canvas.
- **Tablet (`768px–1023px`)**: 2-column event grid, collapsible topbars.
- **Mobile (`375px–767px`)**: 1-column event cards, Neo-Brutalist hamburger drawer, touch pan/zoom seat canvas with sticky bottom checkout action bar.
