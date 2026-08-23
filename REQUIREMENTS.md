# Ticket Booking System

## Objective
High-demand events sell out instantly, leaving many customers with no recourse. Meanwhile, last-minute cancellations go to waste when no automated reallocation exists. Build a ticket booking platform for movies and concerts where customers book seats from a visual map, held seats auto-release on checkout abandonment, sold-out events have a waitlist with automatic seat assignment on cancellation, and every confirmed booking produces an email with a QR code ticket.

## Scope of Work
- **Input**: Event selection, seat selection, customer details
- **Output**: Confirmed booking, QR code ticket via email, waitlist management on cancellation
- Admin creates and manages venues with seat layout and seat categories (e.g. Premium, Standard)
- Organiser can register, log in, and create movie or event listings with venue, date, time, and per-category pricing
- Customer can register, log in, browse and filter events, and view a visual seat map with real-time seat status (available / held / booked)
- Customer selects seats; system places a hold with a configurable TTL (e.g. 10 minutes); held seats are shown as unavailable to other customers
- If customer abandons checkout, held seats are auto-released; seat map updates in real time
- System must prevent two customers from holding or booking the same seat simultaneously
- On successful booking, customer receives email with QR code ticket; QR encodes booking reference
- When an event is sold out, customer can join a waitlist for a specific seat category
- When a booking is cancelled, the seat is offered to the next customer on the waitlist; they receive an email notification with a time-limited link to complete the booking
- If the waitlisted customer does not complete booking within the time limit, seat is offered to the next in line
- Customer can view booking history and cancel a booking
- Organiser can view booking summary and revenue per event

## Technical Expectations
- Backend API, Frontend, Database with role-based auth (customer / organiser / admin)
- Seat map stored per show with per-seat status; rendered as visual grid on frontend
- Seat hold TTL enforced via scheduler or database-level expiry; seat status updated on release
- Concurrency protection on seat hold and booking, simultaneous attempts for the same seat must not both succeed
- Waitlist queue per seat category; auto-assignment and time-limited offer flow on cancellation
- QR code generation on booking; email delivery with QR code (any free tier service)

## Deliverables
1. Zip file with complete source code
2. README with setup guide, .env.example, API docs, DB schema, and seat hold, waitlist logic explanation
3. Hosted application URL (Vercel, Render, Railway, or similar)
4. System design write-up (800 words max) covering seat hold and TTL mechanism, concurrency prevention, waitlist auto-assignment flow, and time-limited offer handling

## Evaluation Focus
- Seat hold TTL and auto-release mechanism
- Concurrency protection for simultaneous seat selection
- Waitlist auto-assignment and time-limited offer flow
- Seat map data model and real-time status updates
- QR code generation and email delivery
- API design, code structure, and documentation
