<p align="center">
  <img src="public/logo-animated.svg" alt="Open-to-Work & Hiring Tracker icon" width="160" />
</p>

<h4 align="center">This app is vibe-coded, it is what it is, don't expect super clean</h4>

<h1 align="center">LinkedIn Open-to-Work & Hiring Tracker</h1>

<p align="center"><em>Who in your network is looking for work, how many, and who's hiring, tracked over time.</em></p>

<p align="center"><a href="https://dschinkel.github.io/linkedin-open-to-work-hiring-tracker/demo/followers"><strong>▶ Try the live demo</strong></a> (sample data, nothing from LinkedIn)</p>

> **Want to use it yourself? Fork this repo, then use your fork.** Click **Fork** at the top of this page, clone your fork, and run `pnpm install && pnpm dev` (see [Running it](#running-it)). Your screenshots are saved on your own machine in `LinkedinScreenShots/` and kept permanently; that folder is git-ignored, so they are never committed or pushed, even from a public fork.

Track, over time, **who in your network is looking for work**, **what percentage of your network that is**, and **who is hiring**.

The goal is a clearer picture of how your close network of contacts is doing, not a single snapshot.

The app reads the green **#OPEN_TO_WORK** and purple **#HIRING** frames on avatars in LinkedIn screenshots that you take. It then shows:

- **Open to Work**: how many people display the frame, the rate, whether it is rising or falling, who newly added it, who removed it, net flow, entry and removal rates, and how long people stay Open to Work.
- **Hiring**: who displays the #HIRING frame, their visible title and company, hiring-frame trends, and which companies are represented.
- **Who left**: people who **unfollowed you** (Followers dashboard) or who you **lost as contacts** (Contacts dashboard), with when they were last seen and whether they were Open to Work or Hiring at the time. The list updates with every new day of screenshots.
- **How many followers and contacts you have**: shown at the top next to the Followers / Contacts toggle and kept up to date. It counts everyone seen in your recent scans once, so a list captured over several screenshots, several uploads, or a few days still adds up correctly.
- **Trust signals**: matched-cohort rates (the same people compared across scans), scan quality, and classifier confidence. These help you tell a real change from a change in who happened to be in your screenshots.

> This measures a **visible public signal** in a **non-random sample** (your screenshots). It is not an unemployment rate. Removing the frame does not mean someone found a job. People who share Open to Work only with recruiters cannot be detected.

---

## Taking screenshots (required)

The app never logs into LinkedIn, crawls profiles, or automates your browser. **You** take screenshots, and the app does the rest.

### Followers or contacts: pick what you track

It's up to you whether you gauge your **followers** or your **contacts** (your LinkedIn connections), or both. The app keeps them as two **separate dashboards**, and the **Followers / Contacts** toggle in the header switches between them. Each has its own trends, hiring list, scans, settings, and inbox folder:

| Dashboard | Screenshot this LinkedIn list | Inbox folder |
|---|---|---|
| Contacts | <https://www.linkedin.com/mynetwork/invite-connect/connections/> | `LinkedinScreenShots/contacts/` |
| Followers | Your followers list (Me → View profile → Followers): <https://www.linkedin.com/mynetwork/network-manager/people-follow/followers/> | `LinkedinScreenShots/followers/` |

**Keep each dashboard consistent.** Only ever drop contacts screenshots into Contacts and followers screenshots into Followers. Mixing them would make people appear and disappear between scans, which shows up as fake transitions, fake unfollowers, and a jumpy rate.

> **Tip: zoom out first.** Press `Cmd+-` (Windows/Linux: `Ctrl+-`) a couple of times before taking screenshots. More people fit on the screen, so each scan takes fewer screenshots and less scrolling. Don't go so small that names become hard to read; around 67–80% works well.

### Easiest: GoFullPage (Chrome or Brave) <img src="https://img.shields.io/badge/use_at_your_own_risk-d73a49?style=flat-square" alt="use at your own risk" align="absmiddle">

1. Install [GoFullPage – Full Page Screen Capture](https://chromewebstore.google.com/detail/gofullpage-full-page-scre/fdpohaocaechififmbbbbbknoalclacl) in Chrome or Brave.
2. Open the list you track (contacts or followers, see the table above).
3. Scroll down until everyone you want to track has loaded.
4. Click the GoFullPage icon (or press `Alt+Shift+P`). It captures the whole scrolled page as a single image.
5. Download the PNG and drag it onto the **drop box** on that dashboard (or its Scans page), or copy it into its inbox folder yourself.

GoFullPage file names include the date (for example `screencapture-linkedin-com-mynetwork-2026-09-22-09_01_12.png`), and the app uses that date for the scan.

> **Heads-up: GoFullPage carries some risk.** It captures the page by scrolling it automatically, and LinkedIn may treat automated scrolling or capturing as scraping by an application. That could get your account flagged or restricted. If you want to be sure you won't get dinged, scroll and take the screenshots yourself (see below).

### <img src="https://img.shields.io/badge/Safest-2ea043?style=flat-square" alt="Safest" align="absmiddle"> Scroll and take screenshots yourself

This is the safest option because nothing is automated: you scroll LinkedIn like any normal visitor and use your operating system's own screenshot tool. No browser extension or app touches the LinkedIn page, so there is nothing for LinkedIn to flag as scraping.

Scroll manually and take screenshots as you go. On macOS:

`Shift+Cmd+3`: capture the whole screen<br>
`Shift+Cmd+4`: drag to capture just the list of people<br>
`Shift+Cmd+5`: open the screenshot toolbar (screen, window, or selection, plus where to save)

Overlapping screenshots are fine, because people are de-duplicated. macOS names such as `Screenshot 2026-09-22 at 9.01.12 AM.png` are dated automatically.

### Screenshot rules

1. Drag screenshots onto the drop box on the Dashboard, or copy them into that dashboard's inbox folder. There's no button to press: screenshots are analyzed as soon as they land, and the dashboard updates by itself. Only PNG, JPG, and WebP files are accepted, and a file already in the inbox is skipped.
2. Screenshots from the **same date** are grouped into **one scan**, even across several uploads.

   **Overlapping screenshots are fine; duplicates are filtered out.** When you scroll and screenshot, the same person often shows up at the bottom of one screenshot and the top of the next. The app is smart enough to catch that: every card from the day is matched by the person's visible name, headline, and company (ignoring case and spacing, never face recognition), so each person counts once. If two screenshots of the same person read their frame differently, the clearer reading wins, and if both are confident but disagree, that person is marked Uncertain instead of guessed. The number of duplicates removed is shown on each scan.
3. Take a scan regularly (daily or weekly) so trends and transitions have history to compare.
4. Make sure avatars, names, and headlines are visible. The frame is detected from the avatar, and names/headlines are used to match the same person across days (no face recognition).
5. Screenshots contain real people's names, so `LinkedinScreenShots/` and `data/` are **git-ignored**: they stay on your machine and are never committed or pushed.

   **Recommendation: never push your screenshots**, not even to a private fork. They show other people's names, photos, and headlines. Your git history doesn't need them: once screenshots are analyzed, what the app learns from them is kept in a local SQLite database (see [Where your data lives](#where-your-data-lives)).

   If you still want them in your fork's history, remove these lines from `.gitignore`, and only ever in a **private** fork:

   ```gitignore
   LinkedinScreenShots/*
   !LinkedinScreenShots/.gitkeep
   data/
   ```

### Where your data lives

Everything is stored locally in **`data/linkedin.sqlite`**, one SQLite file on your own computer. The app reads from and writes to it on every request, so what you see is always what's saved. You don't set it up: `pnpm dev` creates it on first run and keeps its tables up to date after that.

| Table | What it holds |
|---|---|
| `people` | Everyone seen in your screenshots: a pseudonymous identity hash, visible name, headline, and company (with how confidently the company was read) |
| `scans` | One row per day of screenshots: the date, cards detected, and duplicates removed |
| `observations` | Each person in each scan: their #OPEN_TO_WORK and #HIRING frame status, with confidence and how it was detected |
| `screenshots` | Every screenshot you add: file name, when it was added, whether it's still waiting or which scan it went into |
| `settings` | Your Settings page choices |

Followers and Contacts share the file but are kept apart: every row belongs to one of them.

- **It's persistent.** It survives restarts, reboots, and pulling app updates.
- **It's not backed up by git.** `data/` is git-ignored (so your data is never pushed), which also means you lose it if you delete the project folder, clone into a new folder, move to a new laptop, or your disk fails.
- **Back it up like any other file:** Time Machine (or your usual backup), or copy `data/linkedin.sqlite` somewhere safe now and then. Restoring is copying it back while `pnpm dev` is stopped.
- **You can open it yourself** with any SQLite tool, for example `sqlite3 data/linkedin.sqlite` or [DB Browser for SQLite](https://sqlitebrowser.org/).

> **Keep your screenshots for now.** The analyzer that reads names and frames out of screenshots is the next part of this project. Until it exists, the database records each screenshot you add as waiting (the dashboard shows how many), but can't extract people from it yet, so the screenshots are still your only copy of that information. Once analyzed, originals are archived under `data/screenshots/` by date so scans can be re-analyzed when detection improves; an option to delete them automatically after analysis is planned.


---

## Running it

### Prerequisites

Node.js 26.10+ (the version is pinned in `.nvmrc`, so `nvm install && nvm use` picks it up)<br>
pnpm 12+ (`npm install -g pnpm`)

### Start

```bash
pnpm install
pnpm dev
```

Open <http://localhost:5173>.

That's the whole setup. The first time `pnpm dev` runs, it creates the local database (`data/linkedin.sqlite`) and all its tables by itself, and upgrades it automatically when a newer version of the app needs changes. There's no database to install and **no Docker**: SQLite is built into Node.js and stores everything in that one file. The terminal shows which database it's using:

```text
  Tracker: created SQLite database data/linkedin.sqlite
```

### Demo

To see what the app does, open the demo:

- **Online:** <https://dschinkel.github.io/linkedin-open-to-work-hiring-tracker/demo/followers>
- **Locally:** <http://localhost:5173/demo/followers>, or click **Demo** in the app header

The demo has both dashboards: 500 fictional contacts and 800 fictional followers, each with its own history, so the **Followers / Contacts** toggle shows two different pictures, including a list of unfollowers and past contacts.

The demo runs entirely in your browser on a fixed sample network (500 fictional people, 180 days of made-up scans ending Sep 22, 2026).

It never talks to a server or LinkedIn. Every chart can be zoomed like a stock chart: drag the handles under a chart, and the other charts on the page follow.

To fill your local dashboards with sample data instead (held in memory only; your database is not read or changed):

```bash
TRACKER_SAMPLE=full pnpm dev     # ~6 months of sample history ending today
TRACKER_SAMPLE=single pnpm dev   # one scan: shows "trend data available after additional scans"
```

### Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server (dashboards at `/followers` (default) and `/contacts`, demo at `/demo/followers` and `/demo/contacts`) |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm typecheck` | TypeScript project check |
| `pnpm lint` | oxlint |
| `pnpm build` | Production build |

---

## Pages

Every page exists once for **Contacts** and once for **Followers**; the toggle in the header switches between them and keeps you on the same page.

<img src="https://img.shields.io/badge/Dashboard-2ea043?style=flat-square" alt="Dashboard" align="absmiddle"> the latest scan's Open-to-Work and Hiring cards, rate trend, entry vs removal, Who's Hiring preview, scan quality, and daily history.

<img src="https://img.shields.io/badge/Trends-2ea043?style=flat-square" alt="Trends" align="absmiddle"> zoomable, synced charts showing the rate with a 7-day moving average, 7/30/90-day averages, raw vs matched-cohort rate, entry vs removal, net flow, entry/removal rates, observed duration, and hiring-frame trends. Includes 7D / 30D / 90D / 6M / 1Y / All windows.

<img src="https://img.shields.io/badge/Hiring-2ea043?style=flat-square" alt="Hiring" align="absmiddle"> a searchable, filterable table of everyone seen with #HIRING (current vs previous, company known vs unknown, sorting), plus counts per company. Greyed rows were not in the latest scan, so the frame is not claimed for today.

<img src="https://img.shields.io/badge/Unfollowers-2ea043?style=flat-square" alt="Unfollowers" align="absmiddle"> / <img src="https://img.shields.io/badge/Past_contacts-2ea043?style=flat-square" alt="Past contacts" align="absmiddle"> people seen in earlier scans who are missing from the last 3 scans in a row: likely unfollowers (Followers) or removed connections (Contacts), with when they were last seen and whether they had the #OPEN_TO_WORK or #HIRING frame then.

It updates with every new day of screenshots, and anyone seen again drops off. It's only reliable when each scan covers your whole list, since a screenshot can't prove someone left.

<img src="https://img.shields.io/badge/Scans-2ea043?style=flat-square" alt="Scans" align="absmiddle"> sortable daily history (Open to Work / Hiring / All columns). Click a row for scan detail, per-screenshot results, quality, and <img src="https://img.shields.io/badge/Reprocess_scan-2ea043?style=flat-square" alt="Reprocess scan" align="absmiddle">.

<img src="https://img.shields.io/badge/Settings-2ea043?style=flat-square" alt="Settings" align="absmiddle"> inbox/archive folders, automatic processing, classifier thresholds, vision fallback, retention, and scan reminders.


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
  sqliteStore.ts              the local database: creates and upgrades tables, reads and writes data
  trackerStore.ts             the storage port (SQLite for your data, memory for the demo and tests)
  demoTrackerApi.ts           the static demo network (runs in the browser)
  mockApiPlugin.ts            serves /api/* inside `pnpm dev` until the Koa backend exists
src/
  app/                        live and demo trackers, each with its own data source and cache
  demo/                       in-browser demo transport, banner, Demo button
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
2. `chokidar` watcher on `LinkedinScreenShots/contacts/` and `LinkedinScreenShots/followers/`, with originals archived by date to `data/screenshots/<audience>/`
3. Card detection, OCR, and OpenCV frame classification (with an optional vision-model fallback)
4. Settings option to delete screenshots automatically after analysis (default: keep, so scans can be re-analyzed)
