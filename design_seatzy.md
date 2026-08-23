# Seatzy — Design System (Neo-Brutalism & Responsiveness)

This is the single source of truth for HOW the product looks and scales across viewports. Apply these tokens and rules consistently across every screen.

## 1. Design Philosophy

**Neo-Brutalism**: Raw, structural, high-contrast, unapologetically geometric, and functional. The UI should feel like a technical blueprint or architectural drafting document. Features high-contrast solid borders, hard offset shadows, vibrant primary accents, and responsive data-dense layouts.

## 2. Color Tokens

| Token | Hex Value | Usage |
|---|---|---|
| `--color-black` | `#000000` / `#0c0f17` | Text, borders, hard shadows, high-emphasis headers, and dark canvas sections |
| `--color-white` | `#FFFFFF` | Base page background, available-seat fill, high-contrast text |
| `--color-acid-yellow` | `#F2FF00` / `#E1ED00` | Primary accent — selected/held seats, highlight bands, primary CTAs, active badges |
| `--color-neon-magenta` | `#FF00E5` | Urgent indicators, active countdown highlights |
| `--color-cyan` | `#00F0FF` / `#67e8f9` | Premium seat tiers, secondary chips, info alerts |
| `--color-emerald` | `#10B981` / `#6ee7b7` | Standard seat tiers, confirmed statuses, group discounts |
| `--color-amber` | `#F59E0B` / `#fde047` | Executive Recliner tiers, VIP pavilion badges |
| `--color-gray-grid` | `#E5E5E5` at ~15–25% opacity | Subtle architectural blueprint grid texture |

### Color Rules:
- Base backgrounds are high-contrast light or dark surfaces. Accent colors are used as bands, badges, buttons, and seat status indicators.
- Fixed Seat Map Color Coding:
  - **Recliner / VIP Pit**: Amber (`bg-amber-300`, `text-amber-950`)
  - **Premium Club / Lower Tier**: Cyan (`bg-cyan-300`, `text-cyan-950`)
  - **Standard**: Slate (`bg-slate-200`, `text-slate-900`)
  - **Active Hold by You**: Neon Magenta / Yellow with live countdown
  - **Booked / Sold**: Dark Slate / Strikethrough (`opacity-60`)

## 3. Borders & Hard Offset Shadows

- **Thick Solid Borders**: Default `border-2 sm:border-4 border-on-background` (`border-black`).
- **Hard Offset Shadows**: Unblurred solid black shadows:
  - Small / Chips: `shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`
  - Cards / Standard Buttons: `shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`
  - Hero Containers / Modals: `shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]` to `shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]`
- **Interactive States**: On click or hover, translate by `translate-x-[-1px] translate-y-[-1px]` or invert fill/border colors.
- **No Border Radius on Structural Elements**: Containers, cards, tables, and buttons use sharp 90-degree corners. Small pill badges may use `rounded-full` or `rounded-sm`.

## 4. Typography

- **Headings** (`h1`–`h3`, page banners): Heavy, uppercase bold sans-serif with tight tracking (`font-headline-lg font-black uppercase tracking-tight`). Responsive scaling steps down appropriately on mobile (`text-3xl sm:text-5xl lg:text-7xl`).
- **Body Prose**: Clean sans-serif, regular/bold weight, high-contrast readability.
- **Data & Stat Blocks**: Monospace font (`font-mono`) for prices, seat coordinates, booking references, timestamps, and capacity counts.

## 5. Background Textures

- Open canvas areas utilize a subtle architectural blueprint grid (`blueprint-bg`) with thin lines forming an evenly spaced grid.
- High-contrast solid banners (e.g. site header, hero sections, modal headers) provide clear structural division.

## 6. Multi-Device Responsiveness Standards

| Viewport Range | Breakpoint | Layout Adaptations |
|---|---|---|
| **Large Desktop** | `1440px+` | Full 3-column event grid, expansive seating canvas, side-by-side split panels, expanded tables |
| **Laptop** | `1024px–1439px` | 3-column event grid, sticky sidebars, high-density dashboard layouts |
| **Tablet** | `768px–1023px` | 2-column event grid, collapsible topbars, side-by-side venue editors |
| **Mobile** | `375px–767px` | 1-column cards, slide-in hamburger navigation drawer, touch pan/zoom seat canvas, sticky bottom checkout bar |

### Mobile Touch Guidelines:
- Touch targets on mobile are at least **44x44px** (buttons, dropdowns, nav links, close icons).
- Bounded scroll containers for dense data grids and seating matrixes prevent horizontal window-level overflow.
- Mobile browsers in "Request Desktop Site" mode render full zoomed layouts smoothly without breaking click targets.

## 7. Component-Specific Rules

### 7.1 Live Seat Map
- Bounded touch-pan container with zoom controls (`+`, `-`, `Reset`) and clear front-of-house stage orientation banners.
- Sticky Bottom Mobile Action Tray displaying selected count, subtotal (in ₹), live hold timer, and single-tap checkout CTA.
- Collapsible seat status legend and waitlist prompt cards.

### 7.2 Organiser Command Center
- Stacked responsive KPI metric tiles displaying gross revenue, tickets sold, occupancy %, and show count.
- Horizontal scroll wrappers on show schedules and booking log tables.

### 7.3 Ticket Stubs & QR Passes
- Tear-off ticket pass layout with poster thumbnail, event details, scannable QR code, and full-width actions (Download PDF, Cancel Booking).

## 8. Explicit Anti-Patterns

- No soft/blurred drop shadows — always use solid hard offset rectangular shadows.
- No rounded-corner structural cards or buttons.
- No muted or faded pastel accents — use high-saturation Neo-Brutalist color tokens.
- No window-level horizontal overflow on any viewport size.
