#### This app is vibe-coded, it is what it is, don't expect super clean

<p align="center">
  <img src="public/favicon.svg" alt="Open-to-Work & Hiring Tracker icon" width="112" />
</p>

<h1 align="center">LinkedIn Open-to-Work & Hiring Tracker</h1>

<p align="center"><em>Who in your network is looking for work, how many, and who's hiring, tracked over time.</em></p>

Track, over time, **who in your network is looking for work**, **what percentage of your network that is**, and **who is hiring**. The goal is a clearer picture of how your close network of contacts is doing, not a single snapshot.

The app reads the green **#OPEN_TO_WORK** and purple **#HIRING** frames on avatars in LinkedIn screenshots that you take. It then shows:

- **Open to Work**: how many people display the frame, the rate, whether it is rising or falling, who newly added it, who removed it, net flow, entry and removal rates, and how long people stay Open to Work.
- **Hiring**: who displays the #HIRING frame, their visible title and company, hiring-frame trends, and which companies are represented.
- **Trust signals**: matched-cohort rates (the same people compared across scans), scan quality, and classifier confidence. These help you tell a real change from a change in who happened to be in your screenshots.

> This measures a **visible public signal** in a **non-random sample** (your screenshots). It is not an unemployment rate. Removing the frame does not mean someone found a job. People who share Open to Work only with recruiters cannot be detected.

---

## Taking screenshots (required)

The app never logs into LinkedIn, crawls profiles, or automates your browser. **You** take screenshots, and the app does the rest.

### Easiest: GoFullPage (Chrome or Brave)

1. Install [GoFullPage – Full Page Screen Capture](https://chromewebstore.google.com/detail/gofullpage-full-page-scre/fdpohaocaechififmbbbbbknoalclacl) in Chrome or Brave.
2. Open your connections list: <https://www.linkedin.com/mynetwork/invite-connect/connections/>
3. Scroll down until the connections you want to track have loaded.
4. Click the GoFullPage icon (or press `Alt+Shift+P`). It captures the whole scrolled page as a single image.
5. Download the PNG and drop it into `LinkedinScreenShots/` in this project.

GoFullPage file names include the date (for example `screencapture-linkedin-com-mynetwork-2026-09-22-09_01_12.png`), and the app uses that date for the scan.

> **Heads-up: GoFullPage carries some risk.** It captures the page by scrolling it automatically, and LinkedIn may treat automated scrolling or capturing as scraping by an application. That could get your account flagged or restricted. If you want to be sure you won't get dinged, scroll and take the screenshots yourself (see below).

### Safest: scroll and take screenshots yourself

Scroll manually and take screenshots as you go (macOS: `Cmd+Shift+4`). Overlapping screenshots are fine, because people are de-duplicated. macOS names such as `Screenshot 2026-09-22 at 9.01.12 AM.png` are dated automatically.

### Screenshot rules

- Screenshots from the **same date** are grouped into **one scan**.
- Take a scan regularly (daily or weekly) so trends and transitions have history to compare.
- Make sure avatars, names, and headlines are visible. The frame is detected from the avatar, and names/headlines are used to match the same person across days (no face recognition).
- Screenshots contain real people's names. `LinkedinScreenShots/` and `data/` are **git-ignored**, so never force-add them.

---

## Running it

### Prerequisites

- Node.js 20.19+ (22+ recommended)
- pnpm 10+ (`npm install -g pnpm`)

### Start

```bash
pnpm install
pnpm dev
```

Open <http://localhost:5173>.

### Sample data

The screenshot-analysis backend (Koa + OpenCV/OCR + SQLite) is **not built yet**. Until it is, `pnpm dev` serves the API from a dev-only mock (`mock-api/`) filled with a deterministic 180-day sample network, so you can explore every screen. Screenshots dropped into `LinkedinScreenShots/` are **not analyzed yet**.

Choose a sample scenario:

```bash
TRACKER_SAMPLE=full pnpm dev     # default: ~6 months of history
TRACKER_SAMPLE=single pnpm dev   # one scan: shows "trend data available after additional scans"
TRACKER_SAMPLE=empty pnpm dev    # no scans: shows the first-run empty state
```

### Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server with the mock API |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm typecheck` | TypeScript project check |
| `pnpm lint` | oxlint |
| `pnpm build` | Production build |

---

## Pages

- **Dashboard**: the latest scan's Open-to-Work and Hiring cards, rate trend, entry vs removal, Who's Hiring preview, scan quality, and daily history.
- **Trends**: rate with a 7-day moving average, 7/30/90-day averages, raw vs matched-cohort rate, entry vs removal, net flow, entry/removal rates, observed duration, and hiring-frame trends. Includes 7D / 30D / 90D / 6M / 1Y / All windows.
- **Hiring**: a searchable, filterable table of everyone seen with #HIRING (current vs previous, company known vs unknown, sorting), plus counts per company. Greyed rows were not in the latest scan, so the frame is not claimed for today.
- **Scans**: sortable daily history (Open to Work / Hiring / All columns). Click a row for scan detail, per-screenshot results, quality, and **Reprocess scan**.
- **Settings**: inbox/archive folders, automatic processing, classifier thresholds, vision fallback, retention, and scan reminders.

## How the metrics are defined

| Metric | Formula |
|---|---|
| Public Open-to-Work rate | OPEN ÷ (OPEN + NOT_OPEN) × 100. Uncertain is excluded |
| Change | Percentage points (`pp`), never `%` |
| Newly open / removed | Matched people only. A missing person is not an exit, and a first-time person is not an entry |
| Entry rate | NOT_OPEN → OPEN ÷ previously NOT_OPEN people seen again |
| Removal rate | OPEN → NOT_OPEN ÷ previously OPEN people seen again |
| Entry / exit ratio | Added ÷ Removed. Shown as `—` when nothing was removed |
| Matched-cohort rate | Only people classified in both this scan and the previous one |
| Moving averages | Mean of scans actually taken in the window. Missing days are skipped, not filled |
| Observed duration | From the first observed NOT_OPEN → OPEN to the first observed OPEN → NOT_OPEN |
| Hiring-frame rate | HIRING ÷ (HIRING + NOT_HIRING) × 100. Counts people, not open roles |

---

## Architecture

Built with React 19, Vite, TypeScript, shadcn/ui (Base UI), Tailwind CSS v4, TanStack Query, Recharts, and Zod.

The frontend follows **hexagonal architecture** with **humble views**:

```
use case component (humble view)  →  hook (state, decisions, shaping)  →  repository (HTTP + contract)
```

- **Views** only render what their hook returns and report user events. They contain no fetching, formatting, or business decisions.
- **Hooks** (`use<UseCase>.ts`) own loading/error state, filters, sorting, and turning domain data into view rows. They receive their repository as an injectable dependency.
- **Repositories** are the only code that knows endpoints. Every response is validated against the Zod contract in `contracts/api.ts`.
- **Analytics formulas** live server-side in pure, unit-tested functions (`mock-api/domain/`), never in React.

```
contracts/api.ts              Zod schemas: the API contract shared by server and client
mock-api/
  domain/                     pure analytics: rates, transitions, matched cohort, moving
                              averages, durations, company extraction, identity hashing,
                              scan dates, hiring list, scan quality (+ tests)
  seed/                       deterministic sample network
  routes.ts, trackerApi.ts    /api/* routes with Zod-validated input
  mockApiPlugin.ts            serves the API inside `pnpm dev`
src/
  components/                 generic UI atoms (StatGrid, DataTable, charts, pickers)
  components/ui/              shadcn/ui primitives
  shared-formatting/          %, pp, dates, time windows
  shared-repositories/        fetch + contract validation
  use-cases/
    Dashboard/  Trend/  Hiring/  OpenToWork/  Scan/  Settings/
```

## Roadmap

The full specification is in [`linkedin-open-to-work-hiring-tracker-spec.md`](./linkedin-open-to-work-hiring-tracker-spec.md). Next steps:

1. Koa backend implementing the same `contracts/api.ts`, reusing `mock-api/domain/`
2. SQLite + Drizzle persistence (`data/linkedin.sqlite`)
3. `chokidar` watcher on `LinkedinScreenShots/`, with originals archived by date to `data/screenshots/`
4. Card detection, OCR, and OpenCV frame classification (with an optional vision-model fallback)
