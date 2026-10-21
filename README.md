# Slotted

> **Find the hour everyone can *actually* make.**
> Pick a few days, send one link, and watch the overlap appear.

## Stack & Design System

- **Framework**: Next.js (App Router, TypeScript)
- **Styling**: Tailwind CSS v4 + shadcn/ui + Framer Motion
- **Typography**: `Geist Sans`, `Geist Mono` (`tabular-nums`), and `Instrument Serif` (Regular Italic)
- **Aesthetic**: *Liquid Glass on Grainy Flat* — `8px–10px` inset atmospheric viewport frame (`rounded-[18px]` inner `#F7F6F2` Warm Alabaster canvas), 2.8% tactile SVG fractal noise overlay, and refractive `backdrop-blur` toolbars.

## Core Interactive Features

1. **Instant Guest Voting & Optimistic Grid Painting (`<16ms`)**:
   - Drag across hours to paint **Free** (Botanical Emerald `#10B981`), **If needed** (Warm Amber `#F59E0B` diagonal hatch), or **Erase**.
   - Keyboard shortcuts: `1` (`Free`), `2` (`If needed`), `3` (`Erase`), `S` (Toggle Sidebar), `⌘K` (New poll composer).
2. **Best-Time Consensus Engine**:
   - Continuously scores contiguous blocks matching the target duration (`30m` / `45m` / `60m`) and highlights the #1 window directly on the grid.
3. **Timezone Auto-Shift & Participant Isolation**:
   - Switch between `SF (PDT)`, `NYC (EDT)`, `London (BST)`, `Berlin (CEST)`, and `Tokyo (JST)` to shift all grid timestamps cleanly.
   - Hover or click any participant to isolate their hours on the grid.
4. **One-Click Lock & Confirmed Event Card**:
   - Click `Lock this time` to transition the poll into a shareable **Confirmed Event Card** with a rotated `LOCKED` stamp, local times per city, reaction stickers, `.ics` download, and Google Calendar link.
5. **Mobile Thumb-First Ergonomics (`< 768px`)**:
   - Sticky Day-Switcher Pill Strip (`Tue 27`, `Wed 28 ★`, `Thu 29`) + `1-Day Thumb` vs `3-Day Grid` toggle.
   - Split rows: left 74% safe vertical scroll + tap-to-toggle, right 26% dedicated Touch-Scrub Rail (`touch-action: none`).

## Running Locally

```bash
npm install
npm run dev -- --port 43123
```

Open `http://127.0.0.1:43123` in your browser.
