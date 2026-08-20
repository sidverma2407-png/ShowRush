# Seatzy — Design System (Neo-Brutalism)

This is the single source of truth for HOW the product looks. Apply these tokens and rules consistently across every screen. The attached reference image (`Gemini_Generated_Image_ifmsvqifmsvqifms.png`) is the visual ground truth — when in doubt, match it, don't improvise a "nicer" alternative.

## 1. Design Philosophy

Neo-Brutalism: raw, structural, high-contrast, unapologetically geometric. The UI should feel like a technical blueprint or drafting document, not a soft consumer app. No gradients, no soft shadows, no rounded corners on structural elements, no decorative whitespace-heavy minimalism.

## 2. Color Tokens

| Token | Value | Usage |
|---|---|---|
| `--color-black` | `#000000` | Text, borders, shadows, backgrounds of high-emphasis blocks (nav, footer, section headers) |
| `--color-white` | `#FFFFFF` | Base page background, available-seat color, text-on-black |
| `--color-acid-yellow` | `#F2FF00` | Primary accent — held/active/taken seats, highlight bands, primary CTA backgrounds, "sold out" banners |
| `--color-neon-magenta` | `#FF00E5` | Secondary accent — "held by you / your active hold" state, urgent/live indicators |
| `--color-cyan` | `#00F0FF` | Tertiary accent — used sparingly for links, secondary badges, hover states |
| `--color-gray-grid` | `#E5E5E5` at ~15–25% opacity | Background architectural grid lines only |

Rules:
- Base backgrounds are always white or black. Accent colors are never used as full-page backgrounds — only as bands, badges, buttons, or status fills.
- Seat map color coding is fixed and must not be changed: **White = available, Black = booked, Acid Yellow = held (general/others) or waitlist-relevant, Magenta = held by the current user's active hold.**

## 3. Borders & Shadows

- All containers, cards, buttons, and inputs get a **thick black border**: `border-4 border-black` as the default; scale to `border-[3px]` for dense/small elements (table rows, small badges) and up to `border-[6px]` for hero/page-level containers.
- Shadows are **solid, unblurred, offset black rectangles**, never soft/blurred: `shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]` as default; `shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]` for hero elements (page titles, primary CTAs, modals).
- Interactive press/hover state: on click or hover, either (a) translate the element by the shadow's offset and remove the shadow (simulating "pressed flat"), or (b) invert fill/border color. Pick one pattern and apply it consistently to every button/clickable card in the app.
- **No border-radius** on structural elements (cards, buttons, containers, inputs). The only exception: small pill-shaped status badges (e.g. "HELD", "AVAILABLE" tags) may use `rounded-full`, matching the reference image's small yellow/magenta pill labels.

## 4. Typography

- **Headings** (`h1`–`h3`, page titles, section titles): heavy, uppercase, bold sans-serif with tight tracking — `font-black uppercase tracking-tight`. Use a font like Archivo Black, Space Grotesk (bold weight), or system sans-serif bold as fallback. Headings should be large enough to feel structural (page titles at `text-5xl`+ on desktop).
- **Body text**: a clean sans-serif, regular weight, readable at smaller sizes. Not uppercase.
- **Data/stat text** (venue stats, revenue numbers, booking IDs, ticket references, seat labels): **monospace font** (e.g. `font-mono`), matching the reference image's "VENUE STATS / REVENUE: $50m" style blocks. This distinguishes "data" from "prose" throughout the UI.
- Uppercase is used for labels, headings, and buttons — not for body paragraphs or descriptions.

## 5. Background Pattern

- Main page backgrounds (behind content, not behind text-dense cards) use a **subtle architectural/blueprint grid**: thin gray lines (`--color-gray-grid`) forming an evenly spaced square grid (e.g. 40–60px cells), implemented via a repeating CSS `linear-gradient` or a tiled SVG background. Low opacity — it must never compete with foreground content or reduce text contrast.
- Solid black or solid white sections (e.g. the site header, the "RECENT BOOKINGS" band in the reference image) do not need the grid — it's a background-only texture for open canvas areas.

## 6. Layout Principles

- Layouts are **data-dense structural blocks**, not whitespace-heavy centered cards. Sections are divided by thick black borders/rules, not soft spacing alone (see reference image's sidebar of stacked "VENUE STATS / TOTAL STATS / TOTAL REVENUE" boxes).
- Grid-based layout throughout (CSS grid/flex with visible border divisions between cells), echoing a spreadsheet/blueprint feel.
- Primary navigation: black background bar, white/yellow text, logo top-left in heavy uppercase type, nav links top-right, a bordered search box and a high-contrast "Login" button — matching the reference image's header exactly.
- Section headers (e.g. "LIVE SEAT MAP", "RECENT BOOKINGS") are rendered as **full-width or block-level bands** — large uppercase text on a black or yellow background bar, not a plain `<h2>` floating in whitespace.

## 7. Component-Specific Rules

### 7.1 Live Seat Map
- Grid of raw squares (not circles, not seat-icon SVGs) with visible black borders between cells, matching the reference image's cinema seat grid.
- Fixed color coding (see Section 2/table above): white = available, black = booked, yellow = held/general, magenta = held-by-you.
- A seat currently held (by anyone) shows a small pill-style "HELD" label; the current user's own active hold additionally shows a **live mm:ss countdown timer**, either inline on the seat or in an adjacent detail panel.
- Clicking a seat opens a side panel (bordered, black-and-white, monospace data style) showing seat ID, price, and either a "CLAIM SEAT (Xm timer)" CTA (acid yellow button, thick border, hard shadow) or, if sold out, waitlist position ("YOU ARE #4").

### 7.2 Organiser Analytics Dashboard
- Right-hand or grid-arranged stacked stat blocks, each a bordered box with an uppercase monospace label and a large bold value (e.g. `TOTAL REVENUE / $1,000,000`), matching the reference image's stat sidebar.
- No charts required by default, but if included, they must use flat, solid-fill bars/blocks with black borders — no soft gradients or 3D chart styling.

### 7.3 Recent Bookings / Digital Tickets
- Each booking is a bordered "ticket stub" card: poster thumbnail on the left, event/venue/ticket-ID text in monospace/uppercase mix in the middle, a bordered QR code inset, and a full-width black "CANCEL BOOKING" button at the bottom — matching the reference image's bottom ticket row layout exactly.

## 8. Explicit Anti-Patterns (do not do these)

- No soft drop shadows (`shadow-md`, `shadow-lg` from default Tailwind) — always use the hard offset shadow token.
- No rounded-corner cards/buttons/inputs (except small status pills as noted).
- No pastel or muted accent colors — accents are always at full saturation (acid yellow, neon magenta, bright cyan as specified).
- No centered, whitespace-heavy "SaaS landing page" layouts — layouts are dense, bordered, grid-structured.
- No gradient backgrounds or glassmorphism/blur effects anywhere.
