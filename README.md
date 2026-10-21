# slotted

Minimalist, high-craft group scheduling polls.

## Core Architecture & Features

1. **Direct Poll Creation Modal (`/`)**:
   - Fullscreen darkened classical landscape hero with a centered `rounded-[24px]` creation modal on first sight.
   - **Event Scale Switcher**:
     - **`Dates + hours`**: For calls (`30m`), meetings (`1h`), or dinners (`2h` evening window). Click or drag across candidate dates and pick the daily hour range.
     - **`Full days`**: For group holidays, weekend trips, and multi-day offsites (`1 Full day`, `2 Days (Weekend)`, `3 Days (Holiday)`).
   - **Expandable `Advanced settings`**:
     - **Duration**: `15m`, `30m`, `1h`, `2h`, `3h` (or `1–3 Full days` in Full-days mode).
     - **Access Control**: `Anyone with link` (default) or `Password` protection (SHA-256 hashed on the server).
     - **Response Visibility**: `Everyone sees responses`, `Hidden until you vote`, or `Host only (blind poll)`.
     - **Allow "If needed" flex slots** toggle & Timezone selector.
   - **Instant Clipboard Microanimation**: Clicking **`Create poll`** creates the poll via `POST /api/polls`, copies the share URL to the clipboard automatically, shows an animated confirmation state, and transitions to `/p/[slug]?created=1`.
   - **Single-Tone Scroll Section (`#my-polls`)**: Scrolling below the fold transitions to a warm stone (`#F6F5F2`) grainy flat surface listing all active and locked polls.

2. **Unified Minimalist Poll Page (`/p/[slug]`)**:
   - Cohesive `rounded-[24px]` cards, `Space Grotesk` + `JetBrains Mono` typography, and warm stone palette matching the landing modal.
   - Supports both hourly slot painting (`Dates + hours`) and multi-day card painting (`Full days`), mobile thumb scrub rail, live Best-Times ranking, password gate, and 1-click confirmed calendar hold with `.ics` export (`/api/polls/[slug]/ics`) and Google Calendar deep links.

3. **Dual-Mode Backend Persistence (`src/db/schema.ts`, `src/lib/store-server.ts`)**:
   - **Zero-Config Local Persistence**: Works immediately out of the box using `.data/slotted-db.json` through the Next.js API Route Handlers (`/api/polls`, `/api/polls/[slug]`, `/api/polls/[slug]/vote`, `/api/polls/[slug]/lock`, `/api/polls/[slug]/verify-password`, `/api/polls/[slug]/ics`).
   - **Drop-In Neon Serverless Postgres + Clerk**: Copy `.env.example` to `.env.local` and add `DATABASE_URL` (and optional Clerk keys). Run `npx drizzle-kit push` to push the Postgres schema to Neon.

## Running Locally

```bash
npm install
npm run dev -- --port 43123
```

Open `http://127.0.0.1:43123`.
