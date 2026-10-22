# slotted

Minimalist, high-craft group scheduling polls.

## Core Architecture & Features

1. **Direct Poll Creation Modal (`/`)**:
   - Fullscreen darkened classical landscape hero with a centered `rounded-[24px]` creation modal on first sight.
   - **Event Scale Switcher**:
     - **`Dates + hours`**: Pick specific dates on a month calendar, or repeat days of the week, then set the daily hour range and a custom meeting duration.
     - **`Full days`**: For multi-day trips. Duration is a custom number of days inside the selected span.
   - **Expandable `Advanced settings`**:
     - **Duration**: common lengths plus a custom minute or day value.
     - **Timezone**: searchable IANA zones.
     - **Access Control**: `Anyone with link` (default) or `Password` protection (scrypt hashed on the server).
     - **Response Visibility**: `Everyone sees responses`, `Hidden until you vote`, or `Host only (blind poll)`.
     - **Allow "If needed" flex slots** toggle & Timezone selector.
   - **Instant Clipboard Microanimation**: Clicking **`Create poll`** creates the poll via `POST /api/polls`, copies the share URL to the clipboard automatically, shows an animated confirmation state, and transitions to `/p/[slug]?created=1`.
   - **Single-Tone Scroll Section (`#my-polls`)**: Scrolling below the fold transitions to a warm stone (`#F6F5F2`) grainy flat surface listing all active and locked polls.

2. **Unified Minimalist Poll Page (`/p/[slug]`)**:
   - Cohesive `rounded-[24px]` cards, `Space Grotesk` + `JetBrains Mono` typography, and warm stone palette matching the landing modal.
   - Supports both hourly slot painting (`Dates + hours`) and multi-day card painting (`Full days`), mobile thumb scrub rail, live Best-Times ranking, password gate, and 1-click confirmed calendar hold with `.ics` export (`/api/polls/[slug]/ics`) and Google Calendar deep links.

3. **Dual-Mode Backend Persistence (`src/db/schema.ts`, `src/lib/store-server.ts`)**:
   - **Local JSON fallback**: With no `DATABASE_URL`, local development persists polls, votes, access grants, recovery keys, and rate limits in `.data/slotted-db.json`. Deployed environments do not use this file.
   - **Neon**: When `DATABASE_URL` is set, every store operation uses Drizzle with `@neondatabase/serverless` (`drizzle-orm/neon-http`). Migrations use `DATABASE_URL_UNPOOLED` via `npm run db:generate`, `npm run db:migrate`, and `npm run db:push`. `SLOTTED_TOKEN_PEPPER` is required when deployed.

## Running Locally

```bash
npm install
npm run dev -- --port 43123
```

Open `http://127.0.0.1:43123`.
