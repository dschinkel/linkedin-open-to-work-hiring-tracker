# LinkedIn Open-to-Work Network Tracker --- Complete Project Specification

## 1. Purpose

Build a local application that measures and tracks, over time, the
percentage and number of people visible in the user's LinkedIn
connection/search-result screenshots who publicly display the green
**#OPEN_TO_WORK** avatar frame.

The application is not intended to infer whether every person is
actually unemployed or job-seeking. It specifically measures a visible
UI signal:

> **Does the avatar shown in the supplied LinkedIn screenshot visibly
> display the public #OPEN_TO_WORK frame?**

LinkedIn users can indicate job-seeking status privately to recruiters
without displaying the public frame. Therefore the application's primary
metric must be labeled something like **Public Open-to-Work Rate**, not
unemployment rate or overall job-seeker rate.

The application should become a longitudinal telemetry/dashboard system
that answers:

1.  How many sampled people visibly display Open to Work right now?
2.  What percentage of the sampled network visibly displays Open to
    Work?
3.  Is that percentage increasing or decreasing?
4.  How many people are newly displaying Open to Work?
5.  How many people removed the Open-to-Work frame?
6.  What are the entry and removal rates?
7.  What is the net movement into or out of the observed Open-to-Work
    state?
8.  How long do people remain observed in the Open-to-Work state?
9.  Are changes in the headline percentage caused by real status
    transitions or by a changing screenshot sample?

------------------------------------------------------------------------

## 2. Acquisition / LinkedIn Boundary

Do **not** make LinkedIn browser automation a required part of the
application.

The intended workflow is user-driven:

1.  User opens LinkedIn connections/search results manually.
2.  User scrolls manually.
3.  User takes screenshots as they move down the page.
4.  User drops those screenshots into the local application's
    `LinkedinScreenShots/` directory.
5.  The local application automatically processes those files.

This keeps LinkedIn outside the automated application boundary. The
application analyzes image files supplied by the user rather than
logging into LinkedIn, crawling profiles, opening hundreds of profiles,
scrolling LinkedIn automatically, or attempting to evade LinkedIn
automation detection.

There is no need to visit individual LinkedIn profiles. The public
Open-to-Work frame is visible on avatars in list/search/connection views
when present.

------------------------------------------------------------------------

## 3. Daily User Workflow

The recurring workflow should be intentionally simple:

``` text
1. Open LinkedIn connections/search results
2. Scroll manually
3. Take screenshots as you go
4. Drag/drop screenshots into LinkedinScreenShots/
5. Done
```

Everything after step 4 should be automatic.

Example macOS filenames:

``` text
Screenshot 2026-09-22 at 9.01.12 AM.png
Screenshot 2026-09-22 at 9.01.19 AM.png
Screenshot 2026-09-22 at 9.01.26 AM.png
Screenshot 2026-09-22 at 9.01.34 AM.png
```

Screenshots from the same date should normally be grouped into the same
logical scan.

------------------------------------------------------------------------

## 4. Technology Stack

### Frontend

-   React
-   Vite
-   TypeScript
-   shadcn/ui
-   Tailwind CSS
-   Recharts
-   TanStack Query

### Backend

-   Koa
-   TypeScript
-   `@koa/router`
-   Zod
-   `chokidar` for screenshot-folder watching
-   Optional `node-cron` for local scheduled maintenance/reminders

### Persistence

-   SQLite
-   `better-sqlite3`
-   Drizzle ORM
-   Drizzle migrations

SQLite is preferred over PostgreSQL/PGlite for this local application
because it provides a single local database file, no server, no Docker
requirement, fast local queries, and easy backup.

Expected database location:

``` text
data/linkedin.sqlite
```

### Image Analysis

-   OpenCV or equivalent deterministic image processing for primary
    Open-to-Work-frame detection
-   OCR for extracting visible identifiers needed for deduplication
-   Vision-capable LLM/model only as a fallback for ambiguous
    classifications

The vision model should not be the primary classifier if deterministic
image processing can reliably recognize the distinctive green frame.

------------------------------------------------------------------------

## 5. Suggested Repository Layout

A simple pnpm workspace is sufficient. Do not introduce Nx/Turborepo
unless the project actually grows enough to justify it.

``` text
linkedin-job-market/
│
├── LinkedinScreenShots/          # screenshot inbox
│
├── apps/
│   ├── web/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── charts/
│   │   │   └── api/
│   │   └── vite.config.ts
│   │
│   └── server/
│       └── src/
│           ├── index.ts
│           ├── routes/
│           │   ├── scans.ts
│           │   ├── observations.ts
│           │   ├── analytics.ts
│           │   └── settings.ts
│           ├── services/
│           │   ├── scanner.ts
│           │   ├── classifier.ts
│           │   ├── screenshot-watcher.ts
│           │   └── scheduler.ts
│           └── middleware/
│
├── packages/
│   ├── database/
│   │   ├── schema.ts
│   │   └── migrations/
│   ├── classifier/
│   ├── acquisition/
│   └── shared/
│
├── data/
│   ├── linkedin.sqlite
│   └── screenshots/
│       ├── 2026-09-20/
│       ├── 2026-09-21/
│       └── 2026-09-22/
│
├── pnpm-workspace.yaml
└── package.json
```

------------------------------------------------------------------------

## 6. High-Level Architecture

``` text
                    MANUAL
                      │
                  LinkedIn
                      │
                 scroll page
                      │
               take screenshots
                      │
                      ▼
            LinkedinScreenShots/
                      │
               ──────────────
                APP BOUNDARY
               ──────────────
                      │
                      ▼
               Koa + Chokidar
                      │
              Screenshot Analyzer
                 ↙           ↘
              OCR          OpenCV
               │             │
               │        Vision fallback
               └──────┬──────┘
                      │
                 Deduplicate
                      │
                      ▼
                   SQLite
                      │
              Historical analysis
                      │
                      ▼
                   Koa API
                      │
                      ▼
              TanStack Query
                      │
                      ▼
        React + Vite + shadcn
                      │
                      ▼
                  Recharts
                      │
                      ▼
          Historical trend dashboard
```

Core conceptual pipeline:

``` text
Acquisition
    ↓
Avatar/card extraction
    ↓
Identity extraction/hash
    ↓
Open-to-Work classification
    ↓
Deduplication
    ↓
Observations
    ↓
Historical analytics
    ↓
Dashboard
```

------------------------------------------------------------------------

## 7. Screenshot Inbox and Processing

`LinkedinScreenShots/` is the application's input API.

Koa should run a file watcher using `chokidar`.

When a new supported screenshot appears:

``` text
New screenshot
      ↓
Wait until file write is complete
      ↓
Determine scan date
      ↓
Queue for analysis
      ↓
Process
      ↓
Archive original
```

The UI should also support an **Analyze New Screenshots** action so
automatic processing is not the only way to trigger ingestion.

The processing system should be idempotent: re-seeing the same file
should not create duplicate observations.

------------------------------------------------------------------------

## 8. Determining Scan Date

First attempt to parse the date from a macOS screenshot filename.

Example:

``` text
Screenshot 2026-09-22 at 9.01.12 AM.png
                 ↓
             2026-09-22
```

If the filename does not contain a usable date, fall back to filesystem
creation/modification metadata.

All screenshots associated with the same intended daily batch should be
grouped into one logical scan.

A scan should have a stable date and ID.

------------------------------------------------------------------------

## 9. Preserve Original Screenshots

Do not delete screenshots after processing.

Move/archive them into:

``` text
data/screenshots/
├── 2026-09-20/
├── 2026-09-21/
└── 2026-09-22/
```

This is important because classifier logic may improve later.

The application should eventually support:

``` text
Reprocess Scan
Reprocess All Screenshots
```

Reprocessing should allow the historical database to be rebuilt from the
source images.

------------------------------------------------------------------------

## 10. Connection/Card Detection

The analyzer needs to locate each visible LinkedIn
connection/search-result card in a screenshot.

Conceptually:

``` text
┌─────────────────────────────┐
│  [AVATAR]   John Smith      │
│             Staff Engineer  │
├─────────────────────────────┤
│  [AVATAR]   Sarah Jones     │
│             UX Designer     │
├─────────────────────────────┤
│  [AVATAR]   Robert Brown    │
│             Engineering Mgr │
└─────────────────────────────┘
```

Each detected card becomes an observation candidate.

The analyzer should identify/crop:

-   Avatar
-   Visible name
-   Other visible stable-ish fields useful for deduplication, such as
    headline/title/company when available

Do not perform face recognition for identity matching.

------------------------------------------------------------------------

## 11. Identity and Deduplication

Screenshots will overlap.

Example:

``` text
Screenshot 1:
John
Susan
Mike
Jennifer
Robert

Screenshot 2:
Jennifer
Robert
Lisa
James
Sarah
```

This is 8 unique people, not 10.

The system needs a stable pseudonymous identifier for each visible
person.

A first-pass approach:

``` text
John Smith
Staff Engineer
Acme
        ↓ normalize
john smith|staff engineer|acme
        ↓ SHA-256
f82ac7192...
```

Store the hash rather than the original OCR text if persistent
names/titles are unnecessary.

The same normalization/hashing strategy must be deterministic across
days so the application can match the same person longitudinally.

Potential caveat: titles/companies can change. The implementation should
be designed so the identity strategy can evolve. Prefer the most stable
visible identifier available from the screenshot layout. Do not use
facial recognition.

Within one scan, enforce uniqueness by person identity.

Conceptually:

``` text
UNIQUE(scan_id, person_hash)
```

------------------------------------------------------------------------

## 12. Open-to-Work Classification Pipeline

The classifier's exact question is:

> Does this visible avatar contain the public green #OPEN_TO_WORK frame?

Use a staged classifier.

``` text
Avatar
   ↓
OpenCV / deterministic detector
   ↓
green-frame confidence
   │
   ├── clearly high → OPEN
   │
   ├── clearly low  → NOT_OPEN
   │
   └── ambiguous
          ↓
       Vision model
          ↓
 OPEN / NOT_OPEN / UNCERTAIN
```

Possible conceptual thresholds:

``` text
> 0.90  → OPEN
< 0.10  → NOT_OPEN
otherwise → vision fallback
```

Thresholds must be configurable and validated against fixture
screenshots; do not treat those example numbers as final calibration.

The classifier should return:

``` json
{
  "status": "OPEN",
  "confidence": 0.98,
  "classificationMethod": "opencv"
}
```

Possible status enum:

``` text
OPEN
NOT_OPEN
UNCERTAIN
```

Possible classification methods:

``` text
opencv
vision
manual
```

Uncertain observations should normally be excluded from the denominator
of the public Open-to-Work rate unless the UI explicitly displays an
alternative inclusive calculation.

------------------------------------------------------------------------

## 13. Database Model

At minimum, use `scans` and `observations`.

### scans

Suggested fields:

``` text
id
scan_date
started_at
completed_at
screenshot_count
people_count
open_count
not_open_count
uncertain_count
duplicate_count
```

### observations

Suggested fields:

``` text
id
scan_id
person_hash
status
confidence
classification_method
```

Constraint:

``` text
UNIQUE(scan_id, person_hash)
```

Do not rely solely on aggregate scan counts. Individual observations are
necessary for transition analysis, matched cohorts, and duration
analysis.

------------------------------------------------------------------------

## 14. Example Stored Scan

``` text
id:              293
date:            2026-09-22
screenshots:     17
people:          487
open_to_work:     62
not_open:        422
uncertain:         3
```

Example observations:

``` text
scan_id   person_hash    status       confidence

293       82abc...       OPEN          .99
293       72cde...       NOT_OPEN      .98
293       19faa...       NOT_OPEN      .97
293       8e921...       OPEN          .96
293       a821c...       UNCERTAIN      .58
```

------------------------------------------------------------------------

## 15. Core Metrics

### Public Open-to-Work Rate

``` text
OPEN observations
──────────────────────────────── × 100
OPEN + NOT_OPEN observations
```

Exclude `UNCERTAIN` from the normal denominator.

Always label this as a sampled/public Open-to-Work metric, not an
unemployment metric.

### Sample Size

Number of unique classified people in a scan.

### Open Count

Number of unique people classified `OPEN`.

### Not-Open Count

Number classified `NOT_OPEN`.

### Uncertain Count

Number classified `UNCERTAIN`.

------------------------------------------------------------------------

## 16. Status Transitions

For people successfully matched across comparison scans:

``` text
NOT_OPEN → OPEN       = Added / Newly Open
OPEN → NOT_OPEN       = Removed Open
OPEN → OPEN           = Stayed Open
NOT_OPEN → NOT_OPEN   = Stayed Not Open
```

A person missing from the new screenshot sample is **not** considered to
have removed Open to Work.

Likewise, a person appearing for the first time should not automatically
count as newly Open unless there is a prior comparable observation
proving a transition.

------------------------------------------------------------------------

## 17. Net Open Movement

``` text
Net Open Movement = Added Open - Removed Open
```

Interpretation:

``` text
positive = more matched people entered than exited
zero     = equal entry and exit counts
negative = more matched people exited than entered
```

This explains the directional pressure behind the headline stock.

------------------------------------------------------------------------

## 18. Entry Rate

Track the rate at which previously not-open matched people begin
displaying Open to Work.

Recommended denominator:

``` text
people transitioning NOT_OPEN → OPEN
──────────────────────────────────────── × 100
previously NOT_OPEN people observed again
```

The exact formula should be documented in the UI.

------------------------------------------------------------------------

## 19. Removal / Exit Rate

This is a first-class metric.

Recommended formula:

``` text
people transitioning OPEN → NOT_OPEN
────────────────────────────────────── × 100
previously OPEN people observed again
```

This is more meaningful than only showing a raw removal count.

Example:

``` text
Previously Open and observed again: 58
Removed Open:                         3

Removal rate = 3 / 58 = 5.17%
```

Use terminology such as **Open-to-Work Exit Rate** or **Removal Rate**.

Do not claim that removal means a person found a job. It only means the
public frame is no longer observed.

------------------------------------------------------------------------

## 20. Entry/Exit Ratio

Track:

``` text
Added Open
────────────
Removed Open
```

Example:

``` text
Last 30 days

Added Open to Work       137
Removed Open to Work      72

Entry / Exit Ratio       1.90
```

Meaning approximately 1.9 observed entries for each observed exit during
the selected period.

Handle zero removals safely rather than producing an invalid/infinite UI
value.

------------------------------------------------------------------------

## 21. Stock-and-Flow Model

The dashboard should explicitly treat the data as stock and flow.

### Stock

Current observed public Open-to-Work population/rate.

### Inflow

People transitioning from NOT_OPEN to OPEN.

### Outflow

People transitioning from OPEN to NOT_OPEN.

This is important because a rising Open-to-Work rate could happen
because:

-   Entries increased
-   Exits decreased
-   Both
-   The screenshot sample changed

The dashboard should make those causes visible.

------------------------------------------------------------------------

## 22. Matched-Cohort Analysis

Daily screenshot samples may contain different people.

Example:

``` text
Monday:
487 sampled
12.7% Open

Tuesday:
503 sampled
14.1% Open
```

That alone does not prove the rate rose among the same population.

Therefore expose:

### Raw Sample Rate

``` text
Open today / classified people sampled today
```

### Matched-Cohort Rate

Compare only people observed in both relevant scans.

Example:

``` text
People appearing in both scans: 391

Monday     12.5%
Tuesday    13.0%

Matched change: +0.5 percentage points
```

This should be prominently available in deeper trend analysis.

------------------------------------------------------------------------

## 23. Percentage-Point Changes

When comparing rates, use **percentage points (`pp`)**.

Example:

``` text
11.3% → 12.7% = +1.4pp
```

Do not ambiguously label this as "+1.4%" when the intended meaning is
percentage-point change.

------------------------------------------------------------------------

## 24. Moving Averages

Daily screenshot samples can be noisy.

Calculate at least:

``` text
Daily
7-day moving average
30-day moving average
90-day moving average
```

Potential cards/table rows:

  Metric          Rate   Change
  ------------ ------- --------
  Today          12.7%   +0.3pp
  7-day avg      12.2%   +1.1pp
  30-day avg     10.8%   +2.6pp
  90-day avg      8.9%   +4.1pp

Do not calculate misleading moving averages across missing dates without
defining the behavior. Prefer averages across actual observations/scans
and make the convention explicit.

------------------------------------------------------------------------

## 25. Observed Open-to-Work Duration

Once sufficient longitudinal data exists, estimate how long people
remain observed as Open to Work.

Example:

``` text
Person A

Jul 14    NOT_OPEN
Jul 15    OPEN      ← first observed Open
Jul 16    OPEN
...
Aug 26    OPEN
Aug 27    NOT_OPEN  ← first observed removal

Observed duration:
43 days
```

Always call this **observed duration** because the exact enable/disable
time is unknown between scans.

Possible dashboard distribution:

``` text
OPEN-TO-WORK DURATION

Median observed duration       41 days

< 7 days                        8%
7–30 days                      27%
31–60 days                     34%
61–90 days                     18%
90+ days                       13%
```

------------------------------------------------------------------------

## 26. Cohort Analysis

Support cohorts based on first observed transition into Open to Work.

Example:

``` text
BECAME OPEN TO WORK IN JULY

Total                         82

Still observed Open:
7 days later                 74%
30 days later                58%
60 days later                41%
90 days later                29%
```

This allows analysis of whether observed Open-to-Work durations appear
to be changing over time.

Again, disappearance from the screenshot sample must not be treated as a
status change.

------------------------------------------------------------------------

## 27. Dashboard --- Primary Questions

The main dashboard should answer immediately:

1.  How many sampled people are visibly Open to Work now?
2.  What percentage is that?
3.  Is the rate increasing or decreasing?
4.  How many people entered the observed Open state?
5.  How many people exited it?
6.  What is the net flow?
7.  Is the scan reliable / sufficiently classified?

------------------------------------------------------------------------

## 28. Latest Scan Summary Cards

Keep a compact latest-scan section similar to:

``` text
LINKEDIN NETWORK — OPEN TO WORK TRACKER

Latest Scan: Sep 22, 2026                 487 people sampled

┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│     12.7%       │ │       62        │ │      +1.4pp     │
│ Open to Work    │ │ Open to Work    │ │ 7-Day Change    │
└─────────────────┘ └─────────────────┘ └─────────────────┘

┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│       +9        │ │       -3        │ │       +6        │
│ Newly Open      │ │ Removed Open    │ │ Net Change      │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

Potential additional rate cards:

``` text
2.1%           5.2%           1.90
ENTRY RATE     REMOVAL RATE   ENTRY/EXIT
```

The cards are a quick glance at the latest scan, not a replacement for
historical views.

------------------------------------------------------------------------

## 29. Main Open-to-Work Trend Chart

Primary chart:

``` text
OPEN TO WORK RATE

15% │                                      ╭───
14% │                                ╭─────╯
13% │                         ╭───────╯
12% │                   ╭─────╯
11% │          ╭────────╯
10% │──────────╯
    └────────────────────────────────────────────
      Jun        Jul        Aug        Sep

     Daily
     7-day moving average

[7D] [30D] [90D] [6M] [1Y] [ALL]
```

Use Recharts.

Allow time-window controls:

``` text
7D
30D
90D
6M
1Y
ALL
```

------------------------------------------------------------------------

## 30. Entry vs Removal Chart

Add a dedicated chart showing inflow and outflow.

Conceptually:

``` text
PEOPLE CHANGING OPEN-TO-WORK STATUS

 15 │
    │                    █
 10 │          █         █        █
    │    █     █         █        █
  5 │    █     █    ░    █   ░    █
    │    █ ░   █ ░  ░    █   ░    █ ░
  0 ├────────────────────────────────────
       18    19    20    21    22

       █ Added Open
       ░ Removed Open
```

The purpose is to explain *why* the stock chart moved.

------------------------------------------------------------------------

## 31. Net Flow Chart

Dedicated net-flow visualization:

``` text
NET OPEN-TO-WORK FLOW

+10 │
    │              ●
 +5 │       ●              ●      ●
    │  ●
  0 ├────────────────────────────────
    │
 -5 │
    └────────────────────────────────
      Sep18 Sep19 Sep20 Sep21 Sep22
```

Positive means more entries than exits. Negative means more exits than
entries.

------------------------------------------------------------------------

## 32. Entry and Removal Rate Trends

Track both rates over time, preferably together when scales are
compatible.

The removal-rate trend is especially important because a falling
headline Open-to-Work rate can be explained by increasing exits,
decreasing entries, or both.

------------------------------------------------------------------------

## 33. Daily History Table

The exact daily metrics shown in the latest-scan cards should also be
available historically, one row per day.

Example:

  ---------------------------------------------------------------------------------------------
  Date     Sampled   Open  Open % Matched %    7-Day   Newly   Removed    Net   Entry   Removal
                                              Change    Open      Open           Rate      Rate
  ------ --------- ------ ------- --------- -------- ------- --------- ------ ------- ---------
  Sep 22       487     62   12.7%     12.4%   +1.4pp      +9        -3     +6    2.1%      5.2%

  Sep 21       481     59   12.3%     12.0%   +1.2pp      +7        -4     +3    1.7%      6.9%

  Sep 20       492     58   11.8%     11.6%   +0.9pp     +11        -5     +6    2.6%      9.3%
  ---------------------------------------------------------------------------------------------

Use shadcn `Table`.

Requirements:

-   Newest scan first
-   Sticky header
-   Pagination or virtualized scrolling if needed
-   Time-window controls: 7D / 30D / 90D / 6M / 1Y / ALL
-   Sortable columns where useful
-   Clicking a row opens that scan's detail view

The historical table complements:

-   Cards = latest snapshot
-   Charts = visual trend
-   Daily History = exact numbers

------------------------------------------------------------------------

## 34. Scan Detail View

Clicking a daily-history row should open something like:

``` text
Sep 22, 2026

Screenshots             38
Unique people          487
Open                     62
Not Open                422
Uncertain                 3
Duplicates removed       34

Open rate              12.7%
Matched rate           12.4%
7-day change           +1.4pp
Newly Open                  9
Removed Open                3
Net                         +6
Entry rate               2.1%
Removal rate             5.2%
```

Also show screenshot processing results for that scan.

------------------------------------------------------------------------

## 35. Screenshot Processing / Scan Quality View

Provide a page/section such as:

``` text
SCREENSHOTS

Sep 22, 2026

✓ Screenshot ... 10.31.04 AM.png    17 people
✓ Screenshot ... 10.31.18 AM.png    16 people
✓ Screenshot ... 10.31.29 AM.png    18 people
⚠ Screenshot ... 10.31.42 AM.png    12 people / 2 uncertain

38 screenshots
487 unique people
34 duplicates removed

[ Reprocess Scan ]
```

This is important for debugging classifier behavior.

------------------------------------------------------------------------

## 36. Data Quality Panel

Expose data quality rather than hiding it.

Example:

``` text
TODAY'S SCAN QUALITY

Screenshots                    38
Cards detected                521
Unique people                 487
Duplicates                     34

High confidence               471
Low confidence                 13
Uncertain                       3

Classification coverage      99.4%
```

This lets the user determine whether a strange graph movement may be
caused by a weak screenshot batch or classifier problem.

------------------------------------------------------------------------

## 37. Suggested UI Navigation

Use four primary pages:

``` text
Dashboard
Trends
Scans
Settings
```

### Dashboard

Current/latest snapshot plus major historical chart and movement
summary.

### Trends

Deeper longitudinal analysis:

-   Open-to-Work rate
-   Daily and moving averages
-   Added vs removed
-   Net flow
-   Entry/removal rates
-   Entry/exit ratio
-   Matched cohorts
-   Observed duration
-   Cohort analysis

### Scans

Daily scan history, screenshots, classifier confidence, duplicates,
errors, and reprocessing.

### Settings

-   Screenshot inbox directory
-   Archive directory
-   Automatic processing on/off
-   Classifier confidence thresholds
-   Vision fallback on/off/configuration
-   Retention policy
-   Reprocessing options
-   Any future reminder/scheduling preferences

------------------------------------------------------------------------

## 38. Koa API

Suggested routes:

``` text
GET  /api/dashboard
GET  /api/scans
GET  /api/scans/:id
POST /api/scans
POST /api/scans/:id/reprocess
POST /api/reprocess-all

GET  /api/analytics/summary
GET  /api/analytics/history
GET  /api/analytics/trends
GET  /api/analytics/transitions
GET  /api/analytics/cohorts
GET  /api/analytics/durations

GET  /api/settings
PUT  /api/settings
```

Possible query parameters:

``` text
?days=30
?from=2026-08-01&to=2026-09-22
?window=90d
```

Use Zod validation at API boundaries.

------------------------------------------------------------------------

## 39. Frontend Data Flow

``` text
SQLite
   ↓
Koa service/repository layer
   ↓
Koa REST API
   ↓
TanStack Query
   ↓
React
   ↓
shadcn components + Recharts
```

Do not have React read SQLite or filesystem data directly.

------------------------------------------------------------------------

## 40. Scheduling

The original goal includes repeatable/scheduled tracking.

Because acquisition remains manual, scheduling should primarily mean:

-   Remind the user that a scan is due
-   Watch/process screenshots automatically when dropped into the folder
-   Perform scheduled maintenance/analytics if useful

Potential UI:

``` text
SCAN FREQUENCY

○ Daily
● Weekly
○ Every 2 weeks
○ Monthly

Run/remind:
[ Sunday ] [ 3:00 PM ]

Retention:
[ Forever ]

[ Save ]
```

If daily tracking is the normal workflow, a daily reminder can tell the
user to capture today's screenshots.

The local app can automatically process files at any time; it does not
need a specific scheduled processing window.

------------------------------------------------------------------------

## 41. Acquisition Abstraction

Even though the current source is screenshots, keep acquisition
conceptually abstract.

``` ts
export interface ConnectionSource {
  acquire(): Promise<ConnectionSnapshot[]>
}
```

Possible implementations over time:

``` text
ScreenshotSource
ImportedImageSource
LinkedInExportSource
AuthorizedLinkedInSource
```

Do not tightly couple classification, persistence, or analytics to the
screenshot ingestion mechanism.

------------------------------------------------------------------------

## 42. Privacy / Data Minimization

The application is local.

Prefer to retain only what is needed for longitudinal analysis.

If OCR extracts:

``` text
Jane Smith
Staff Engineer
Acme
```

normalize/hash it locally and discard the raw text if names/titles are
not needed.

Persist:

``` text
person_hash
status
confidence
scan_id
classification_method
```

Raw screenshots are retained because they are needed for
reproducibility/reprocessing, but the application should make their
location and retention policy explicit.

Do not use face recognition.

------------------------------------------------------------------------

## 43. Important Statistical Caveats

The dashboard must not imply that the data represents the general labor
market.

The sample consists of people visible in the user's LinkedIn screenshots
and is not random.

Therefore wording should be:

``` text
Public Open-to-Work Rate in Sampled Network
```

rather than:

``` text
Unemployment Rate
```

Similarly:

-   `OPEN → NOT_OPEN` means the public frame disappeared between
    observations.
-   It does **not** prove the person found employment.
-   `NOT_OPEN → OPEN` means the public frame appeared.
-   It does **not** establish the exact date they began job searching.
-   A missing person is not an exit.
-   A newly visible person is not automatically a new entrant.
-   Recruiter-only Open-to-Work users are not detectable through the
    public frame.
-   Daily sample composition can affect raw percentages, hence
    matched-cohort metrics.

------------------------------------------------------------------------

## 44. Example Dashboard Layout

``` text
┌───────────────────────────────────────────────────────────────┐
│ Open-to-Work Tracker                        Sep 22, 2026      │
│                                                               │
│  12.7%          62             +1.4pp          +6             │
│  OPEN RATE      OPEN           7-DAY CHANGE    NET FLOW       │
│                                                               │
│  +9             -3             2.1%            5.2%           │
│  NEWLY OPEN     REMOVED        ENTRY RATE      REMOVAL RATE   │
│                                                               │
│ ┌───────────────────────────────────────────────────────────┐ │
│ │              OPEN-TO-WORK RATE                           │ │
│ │                                                 ╭────     │ │
│ │                                   ╭─────────────╯         │ │
│ │                      ╭────────────╯                       │ │
│ │        ╭─────────────╯                                    │ │
│ │ ───────╯                                                  │ │
│ │                                                           │ │
│ │ [7D] [30D] [90D] [6M] [1Y] [ALL]                         │ │
│ └───────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─────────────────────────┐ ┌───────────────────────────────┐ │
│ │ STATUS CHANGES          │ │ SCAN QUALITY                  │ │
│ │                         │ │                               │ │
│ │ Became Open      +41    │ │ 487 people                   │ │
│ │ Removed Open     -19    │ │ 99.4% classified            │ │
│ │ Net              +22    │ │ 3 uncertain                  │ │
│ └─────────────────────────┘ └───────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

Below this, include the Daily History table.

------------------------------------------------------------------------

## 45. Example Daily History

Illustrative only:

``` text
DAILY HISTORY

[7D] [30D] [90D] [6M] [1Y] [ALL]

Date        Sampled  Open  Open %  Matched %  7D Δ    New  Removed  Net
────────────────────────────────────────────────────────────────────────
Sep 22        487     62    12.7%    12.4%    +1.4pp    9      3     +6
Sep 21        481     59    12.3%    12.0%    +1.2pp    7      4     +3
Sep 20        492     58    11.8%    11.6%    +0.9pp   11      5     +6
```

Add Entry Rate and Removal Rate columns as space permits or make them
configurable columns.

------------------------------------------------------------------------

## 46. Testing Strategy

The architecture should make the system easy to TDD.

Keep LinkedIn completely out of classifier tests.

Create fixture directories:

``` text
fixtures/
├── open/
├── not-open/
├── uncertain/
├── full-screenshots/
└── overlapping-screenshots/
```

Test:

-   Filename/date parsing
-   Screenshot grouping
-   Card detection
-   Avatar extraction
-   Green-frame classification
-   Vision fallback triggering
-   OCR normalization
-   Stable hashing
-   Same-scan deduplication
-   Cross-scan matching
-   Transition classification
-   Entry-rate formula
-   Removal-rate formula
-   Net flow
-   Percentage-point changes
-   Moving averages
-   Matched cohorts
-   Duration calculations
-   Reprocessing idempotency
-   API validation
-   API responses
-   React rendering for empty/partial/full data
-   Handling zero-removal entry/exit ratios
-   Uncertain observations excluded from normal denominator

The classifier should be replaceable behind an interface so
deterministic and vision-based implementations can be tested
independently.

------------------------------------------------------------------------

## 47. Empty and Early-State UX

The application will initially have insufficient history for many
metrics.

Do not fabricate or imply trends.

Examples:

``` text
No scans yet
Drop screenshots into LinkedinScreenShots/ to create your first scan.
```

After one scan:

``` text
12.7% Open to Work
Trend data available after additional scans.
```

For transitions:

``` text
No comparable prior observations yet.
```

For durations/cohorts:

``` text
More history is required for duration analysis.
```

------------------------------------------------------------------------

## 48. Error Handling

Handle:

-   Unsupported file formats
-   Corrupt screenshots
-   Screenshot with no recognizable LinkedIn cards
-   OCR failures
-   Duplicate screenshot files
-   Partially written files detected by watcher
-   Analyzer crashes
-   Vision service unavailable
-   Database migration errors
-   Reprocessing conflicts
-   No matched cohort
-   No previously open users when calculating removal rate

A single failed screenshot should not fail the entire day's scan.

Show processing warnings in the Scans UI.

------------------------------------------------------------------------

## 49. Performance

Expected data volume is small.

Even a conceptual maximum such as:

``` text
2,000 people × 365 days = 730,000 observations/year
```

is trivial for SQLite.

Optimize for correctness, reproducibility, and understandable code
rather than premature distributed architecture.

Image analysis is likely to be more expensive than SQL.

------------------------------------------------------------------------

## 50. V1 Scope

A strong first version should include:

1.  React/Vite/TypeScript/shadcn frontend
2.  Koa/TypeScript backend
3.  SQLite + better-sqlite3 + Drizzle
4.  `LinkedinScreenShots/` watched inbox
5.  Screenshot date parsing/grouping
6.  Archive originals by date
7.  Detect cards/avatars
8.  OCR identity fields
9.  Hash identities
10. Deduplicate within scan
11. OpenCV Open-to-Work classification
12. `UNCERTAIN` state
13. Optional vision fallback
14. Persist scans and observations
15. Latest Scan cards
16. Open-to-Work rate chart
17. Daily History table
18. Added/Removed/Net transition metrics
19. Entry and Removal rates
20. Scan-quality panel
21. Scan detail view
22. Reprocess Scan
23. Tests around all formulas and ingestion logic

------------------------------------------------------------------------

## 51. V2 / Later Enhancements

After enough history exists:

-   7/30/90-day moving averages
-   Matched-cohort rate
-   Entry vs Removal chart
-   Net-flow chart
-   Entry/removal-rate trend chart
-   Entry/Exit ratio
-   Observed duration distributions
-   Cohort survival-style analysis
-   Reprocess All
-   Manual classification correction for uncertain cases
-   Better identity matching when titles/companies change
-   Configurable dashboard columns
-   CSV export
-   Backup/restore
-   Scan reminders
-   Optional alternative authorized acquisition sources

------------------------------------------------------------------------

## 52. Core Product Principle

The product is not simply a percentage calculator.

It should explain both **stock** and **flow**:

``` text
CURRENT OPEN-TO-WORK POPULATION
            +
     PEOPLE ENTERING
            -
      PEOPLE EXITING
            =
      TREND OVER TIME
```

The headline Open-to-Work percentage tells the user where the sampled
network is.

The transition metrics explain why it is moving.

The matched-cohort and quality metrics tell the user whether that
movement is trustworthy.

------------------------------------------------------------------------

## 53. Concise End-to-End Process

``` text
User opens LinkedIn
        ↓
User scrolls manually
        ↓
User takes screenshots
        ↓
Drops screenshots into LinkedinScreenShots/
        ↓
Koa/chokidar detects files
        ↓
Group files by scan date
        ↓
Detect LinkedIn result cards
        ↓
Crop avatars + OCR visible identity fields
        ↓
Normalize/hash identity
        ↓
Classify public Open-to-Work frame
        ↓
Deduplicate overlapping screenshots
        ↓
Persist observations in SQLite
        ↓
Compare matched people with previous scans
        ↓
Calculate:
  - Open count
  - Public Open-to-Work rate
  - Newly Open
  - Removed Open
  - Net flow
  - Entry rate
  - Removal rate
  - Entry/Exit ratio
  - Matched-cohort metrics
  - Moving averages
  - Observed durations/cohorts
        ↓
Koa API
        ↓
TanStack Query
        ↓
React + shadcn + Recharts dashboard
        ↓
User sees current snapshot + exact daily history + longitudinal trends
```

## 54. Implementation Guidance for Coding Agent

Implement the system in small, testable vertical slices.

Suggested order:

1.  Workspace/bootstrap
2.  SQLite/Drizzle schema and migrations
3.  Scan repository/service
4.  Screenshot filename/date parser
5.  Screenshot inbox watcher
6.  Archive/idempotency behavior
7.  Card/avatar extraction interface and fixtures
8.  Identity normalization/hash
9.  Open-to-Work classifier interface
10. Deterministic classifier
11. Observation persistence/deduplication
12. Transition analytics
13. Koa API
14. React dashboard shell
15. Latest Scan cards
16. Daily History
17. Trend charts
18. Scan detail/quality UI
19. Vision fallback
20. Cohort/duration analytics

Favor explicit domain types such as:

``` text
Scan
Observation
ObservationStatus
ClassificationResult
StatusTransition
ScanSummary
MatchedCohort
TrendPoint
ScanQuality
```

Do not bury formulas inside React components. Keep analytics in
backend/domain services with unit tests.

Do not couple filesystem watching to classification logic. The watcher
should discover work; a processing service should perform it.

Do not couple the classifier directly to SQLite. It should receive
image/card input and return a classification result.

Keep the source/acquisition boundary replaceable.

The application should remain fully useful offline except for any
optional vision-model fallback that requires a remote model.
---

# 55. Hiring-Frame Tracking — Additional Core Requirement

In addition to tracking the public **#OPEN_TO_WORK** avatar frame, the application must detect the public LinkedIn **#HIRING** avatar frame when it is visibly present in supplied screenshots.

The application therefore tracks two separate visible signals:

```text
#OPEN_TO_WORK
#HIRING
```

These are independent classifications. Do not infer one from the absence of the other.

For every detected connection/result card, the analyzer should attempt to determine:

```text
person identity
display name
headline/title if visible
company name if visible/inferable from visible card text
Open-to-Work frame status
Hiring frame status
classification confidence
```

The hiring feature has two goals:

1. Show how many people in the sampled network are publicly displaying a Hiring frame.
2. Provide a useful dashboard list of the actual visible people displaying Hiring, including their company when it can be extracted reliably.

---

# 56. Updated Classification Model

The avatar classifier should no longer return only Open-to-Work state.

It should independently classify both public frames.

Conceptual result:

```json
{
  "openToWork": {
    "status": "NOT_OPEN",
    "confidence": 0.99,
    "classificationMethod": "opencv"
  },
  "hiring": {
    "status": "HIRING",
    "confidence": 0.97,
    "classificationMethod": "opencv"
  }
}
```

Recommended hiring status enum:

```text
HIRING
NOT_HIRING
UNCERTAIN
```

Recommended Open-to-Work status enum remains:

```text
OPEN
NOT_OPEN
UNCERTAIN
```

Do not collapse these into one mutually exclusive status enum. Treat them as separate dimensions so the data model remains explicit and extensible.

---

# 57. Hiring-Frame Detection Pipeline

Use the same staged strategy as Open-to-Work detection:

```text
Avatar
   ↓
Deterministic visual classifier
   ↓
Hiring-frame confidence
   │
   ├── clearly Hiring     → HIRING
   ├── clearly not Hiring → NOT_HIRING
   └── ambiguous
          ↓
       Vision model
          ↓
 HIRING / NOT_HIRING / UNCERTAIN
```

The implementation should use fixture images of real screenshot crops to calibrate the visual characteristics rather than assuming that Open-to-Work and Hiring frames can use the same color thresholds.

The classifier interface should make adding additional visible LinkedIn avatar-frame types possible later without rewriting ingestion or persistence.

---

# 58. Person Name and Company Extraction for Hiring List

The earlier design minimized stored personal text by hashing visible identity fields. The Hiring dashboard introduces a legitimate product requirement to display **who** is hiring.

Therefore the local application may retain the visible display name and company information needed for this feature.

For a card such as:

```text
[HIRING AVATAR]  Jane Smith
                 Engineering Manager
                 Acme Corporation
```

extract:

```text
displayName: "Jane Smith"
headline: "Engineering Manager"
companyName: "Acme Corporation"
```

The stable `person_hash` should still be retained and used as the primary longitudinal identity key.

Do not use the display name itself as the database primary key.

Recommended local person representation:

```text
person_hash
display_name
headline
company_name
last_seen_at
```

All of this remains local to the application.

---

# 59. Company Extraction Rules

Company extraction should be confidence-aware.

Use visible text from the connection/search-result card only.

Possible sources, in order of preference:

```text
1. Explicit company field visible in the card
2. Structured headline pattern that clearly identifies company
3. OCR + parsing when the company is visibly present
4. Otherwise leave company unknown
```

Do **not** invent a company based on a person's name, title, prior knowledge, or model guess.

Example:

```text
Jane Smith
VP Engineering at Acme
```

may safely produce:

```text
companyName = "Acme"
```

But:

```text
Jane Smith
Building the future of payments
```

should not produce a guessed company.

Represent missing values as `null`, not `"Unknown"` in persistence.

The UI can display:

```text
Company not visible
```

when no reliable company was extracted.

---

# 60. Company Extraction Confidence

Store company extraction confidence separately from avatar classification confidence.

Example:

```json
{
  "displayName": "Jane Smith",
  "companyName": "Acme Corporation",
  "companyConfidence": 0.96
}
```

Potential extraction methods:

```text
ocr-explicit
ocr-headline
manual
unknown
```

Low-confidence company extraction should either:

- be omitted from the main list, or
- be visually marked for review.

Do not silently present low-confidence model guesses as facts.

---

# 61. Updated Persistence Model

The database should now include a durable `people` table rather than putting all visible identity text directly into every observation.

## people

Suggested fields:

```text
id
person_hash
display_name
headline
company_name
company_confidence
company_extraction_method
first_seen_at
last_seen_at
```

Constraint:

```text
UNIQUE(person_hash)
```

## scans

Continue to include:

```text
id
scan_date
started_at
completed_at
screenshot_count
people_count
open_count
not_open_count
open_uncertain_count
hiring_count
not_hiring_count
hiring_uncertain_count
duplicate_count
```

## observations

Suggested updated fields:

```text
id
scan_id
person_id

open_status
open_confidence
open_classification_method

hiring_status
hiring_confidence
hiring_classification_method
```

Constraint:

```text
UNIQUE(scan_id, person_id)
```

This allows one observation to represent both visible avatar-frame dimensions for the same person on the same scan.

---

# 62. Hiring Snapshot Metrics

Add hiring metrics to each scan:

```text
People sampled
People displaying Hiring
Hiring-frame rate
Hiring classification uncertain count
Companies represented among Hiring people
Newly observed Hiring
Removed Hiring frame
Net Hiring-frame movement
```

Recommended Hiring rate:

```text
HIRING observations
──────────────────────────────── × 100
HIRING + NOT_HIRING observations
```

Exclude Hiring `UNCERTAIN` observations from the normal denominator.

Label it something like:

```text
Public Hiring-Frame Rate
```

Do not imply that everyone hiring at a company necessarily displays the frame, or that everyone displaying the frame has a specific currently open role.

---

# 63. Hiring Dashboard Section

Add a prominent **Who's Hiring** section to the dashboard.

Example:

```text
WHO'S HIRING

24 people currently displaying #HIRING
18 companies identified

┌──────────────────────────────────────────────────────────────┐
│ Jane Smith        Engineering Manager       Acme Corp       │
│ Robert Jones      VP Engineering            Example Labs    │
│ Susan Lee         Talent Partner             Widget Co       │
│ Mike Brown        CTO                        Company not      │
│                                              visible          │
└──────────────────────────────────────────────────────────────┘

[ View All Hiring ]
```

This list should show, when reliably available:

```text
Person
Headline / title
Company
First observed Hiring
Last observed Hiring
```

Do not show fabricated company information.

---

# 64. Hiring List Table

The full Hiring view should support a table such as:

| Person | Title / Headline | Company | First Seen Hiring | Last Seen | Days Observed Hiring |
|---|---|---|---|---|---:|
| Jane Smith | Engineering Manager | Acme Corp | Sep 18 | Sep 22 | 5 |
| Robert Jones | VP Engineering | Example Labs | Sep 20 | Sep 22 | 3 |
| Susan Lee | Talent Partner | Widget Co | Sep 21 | Sep 22 | 2 |

The table should support:

- Search by person name
- Search/filter by company
- Sort by first seen
- Sort by last seen
- Sort by observed duration
- Filter to currently Hiring
- Filter to previously Hiring
- Filter to company known/unknown

The list should default to people classified as `HIRING` in the latest scan in which they were observed, while clearly distinguishing stale observations from people actually observed in the latest scan.

---

# 65. Hiring Recency

A person should not remain indefinitely in the "currently hiring" list simply because they have not appeared in recent screenshots.

Track:

```text
last_seen_at
last_hiring_observed_at
```

The UI should distinguish:

```text
Observed Hiring today
Observed Hiring 3 days ago
Not observed recently
```

If the user was not present in today's screenshot sample, do not claim the Hiring frame is still present today.

Prefer wording such as:

```text
Last observed Hiring: Sep 22
```

when current state cannot be confirmed.

---

# 66. Hiring Transitions

Track Hiring-frame transitions for matched people just as with Open to Work:

```text
NOT_HIRING → HIRING       = Newly Hiring
HIRING → NOT_HIRING       = Removed Hiring frame
HIRING → HIRING           = Stayed Hiring
NOT_HIRING → NOT_HIRING   = Stayed Not Hiring
```

A missing person is not a transition.

This supports historical hiring activity trends in the sampled network.

---

# 67. Hiring Trend Charts

Add optional hiring charts under Trends.

## Public Hiring-Frame Rate

```text
HIRING-FRAME RATE

8% │                         ╭────
7% │                    ╭────╯
6% │        ╭───────────╯
5% │────────╯
   └──────────────────────────────
     Jun   Jul   Aug   Sep
```

## Newly Hiring vs Removed Hiring

```text
HIRING-FRAME CHANGES

       Added Hiring     Removed Hiring
Sep 18      +3               -1
Sep 19      +5               -2
Sep 20      +2               -4
Sep 21      +7               -1
Sep 22      +6               -2
```

These charts measure visible public Hiring-frame activity in the sampled network, not the number of job openings.

---

# 68. Companies Hiring Section

Aggregate currently observed Hiring people by extracted company.

Example:

```text
COMPANIES REPRESENTED BY HIRING FRAMES

Acme Corp             4 people
Example Labs          3 people
Widget Co             2 people
Other                 9 people
Company not visible   6 people
```

A company count means:

> Number of sampled people associated with that company who were observed displaying the public Hiring frame.

It does **not** mean the company has exactly that many open positions.

The company aggregation should be derived only from reliably extracted visible company names.

---

# 69. Company Name Normalization

Company aggregation needs normalization so OCR variations do not create separate companies.

Examples:

```text
"Acme Corp."
"Acme Corp"
"ACME Corp"
```

should normalize to the same company where confidence is high.

Maintain:

```text
company_display_name
company_normalized_name
```

Do not aggressively merge ambiguous companies.

A future manual alias table may support:

```text
"IBM"
"International Business Machines"
```

but automatic fuzzy matching should be conservative.

---

# 70. Hiring Dashboard Cards

Add a Hiring summary row or subsection.

Example:

```text
24               4.9%               +6
HIRING PEOPLE    HIRING RATE        NEWLY HIRING

18               -2                 +4
COMPANIES        REMOVED HIRING     NET HIRING
```

Keep Open-to-Work and Hiring metrics visually separated so the two concepts are not confused.

---

# 71. Updated Main Dashboard Concept

The Dashboard should now have two primary analytical domains.

## Open to Work

```text
12.7%          62             +1.4pp
OPEN RATE      OPEN           7-DAY CHANGE

+9             -3             +6
NEWLY OPEN     REMOVED OPEN   NET FLOW
```

## Hiring

```text
4.9%           24             18
HIRING RATE    HIRING PEOPLE  COMPANIES

+6             -2             +4
NEWLY HIRING   REMOVED        NET HIRING
```

Then display:

```text
OPEN-TO-WORK RATE TREND
[chart]

ENTRY VS REMOVAL
[chart]

WHO'S HIRING
[list/table preview]

DAILY HISTORY
[table]

SCAN QUALITY
[quality panel]
```

---

# 72. Updated Daily History

Extend Daily History to include hiring data, either directly or through configurable columns.

Potential full schema:

| Date | Sampled | Open | Open % | New Open | Removed Open | Open Net | Hiring | Hiring % | New Hiring | Removed Hiring | Hiring Net |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Sep 22 | 487 | 62 | 12.7% | 9 | 3 | +6 | 24 | 4.9% | 6 | 2 | +4 |

Because this can become wide, the UI may provide:

```text
[ Open to Work ] [ Hiring ] [ All Metrics ]
```

or configurable columns while retaining one row per scan date.

---

# 73. Updated Scan Detail

A scan detail should include both dimensions.

Example:

```text
Sep 22, 2026

SCAN
Screenshots                 38
Unique people              487
Duplicates removed          34

OPEN TO WORK
Open                        62
Not Open                   422
Uncertain                    3
Open rate                 12.7%
Newly Open                   9
Removed Open                 3
Net                         +6

HIRING
Hiring                      24
Not Hiring                 459
Uncertain                    4
Hiring rate                4.9%
Newly Hiring                 6
Removed Hiring               2
Net Hiring                  +4
Companies identified        18
```

---

# 74. Updated Scan Quality

Quality reporting should show confidence separately for both classifiers.

Example:

```text
SCAN QUALITY

Screenshots                    38
Cards detected                521
Unique people                 487
Duplicates                     34

OPEN-TO-WORK CLASSIFICATION
High confidence               471
Low confidence                 13
Uncertain                       3

HIRING CLASSIFICATION
High confidence               468
Low confidence                 15
Uncertain                       4

COMPANY EXTRACTION
Company identified             18 hiring people/companies as applicable
Low-confidence company          2
Company not visible             6
```

Use precise labels in the real UI so "company identified" cannot be confused with number of people.

---

# 75. Updated Koa API

Add hiring-oriented endpoints or extend the existing analytics responses.

Suggested routes:

```text
GET /api/hiring
GET /api/hiring/current
GET /api/hiring/history
GET /api/hiring/people
GET /api/hiring/companies
GET /api/hiring/transitions

GET /api/people/:id
```

Possible filters:

```text
/api/hiring/people?company=Acme
/api/hiring/people?status=current
/api/hiring/history?days=90
```

Existing dashboard and scan endpoints should include Hiring summaries where appropriate.

---

# 76. Updated Domain Types

Add explicit domain types such as:

```text
HiringStatus
HiringClassificationResult
HiringTransition
HiringSummary
HiringPerson
CompanyIdentity
CompanyExtractionResult
CompanyHiringSummary
```

An observation should conceptually contain:

```text
person
scan
openToWorkClassification
hiringClassification
```

Do not overload `ObservationStatus` with both concepts.

---

# 77. Updated Testing Requirements

Add fixtures and tests for:

```text
Hiring avatar frame detected correctly
Non-Hiring avatar classified correctly
Ambiguous Hiring avatar → UNCERTAIN
Open-to-Work frame is not misclassified as Hiring
Hiring frame is not misclassified as Open to Work
Both classifiers operate independently
Hiring transition NOT_HIRING → HIRING
Hiring transition HIRING → NOT_HIRING
Missing person does not count as Hiring removal
Company explicitly visible → extracted
Company absent → null
Ambiguous company → null/low confidence
Company normalization
Hiring list only contains qualifying observations
Stale Hiring observation labeled with last-observed date
Company aggregation counts people, not openings
Reprocessing remains idempotent
```

Add fixture directories such as:

```text
fixtures/
├── avatars/
│   ├── open-to-work/
│   ├── hiring/
│   ├── neither/
│   └── uncertain/
├── cards/
│   ├── company-explicit/
│   ├── company-headline/
│   └── company-missing/
└── full-screenshots/
```

---

# 78. Updated V1 Scope

The V1 scope should now include Hiring tracking rather than deferring it.

V1 should include:

1. React/Vite/TypeScript/shadcn frontend
2. Koa/TypeScript backend
3. SQLite + better-sqlite3 + Drizzle
4. `LinkedinScreenShots/` watched inbox
5. Screenshot date parsing/grouping
6. Archive originals by date
7. Detect cards/avatars
8. OCR identity fields
9. Stable person hashing
10. Store local display name/headline as required for Hiring list
11. Extract visible company name when reliable
12. Deduplicate within scan
13. Open-to-Work classification
14. Hiring-frame classification
15. Independent uncertainty/confidence for both classifiers
16. Optional vision fallback
17. Persist people, scans, and observations
18. Latest Open-to-Work cards
19. Latest Hiring cards
20. Open-to-Work trend chart
21. Who's Hiring dashboard section
22. Hiring people table
23. Company aggregation
24. Daily History
25. Open Added/Removed/Net
26. Hiring Added/Removed/Net
27. Open Entry/Removal rates
28. Scan-quality panel
29. Scan detail view
30. Reprocess Scan
31. Tests for ingestion, identity, both classifiers, company extraction, transitions, and formulas

---

# 79. Updated End-to-End Process

```text
User opens LinkedIn
        ↓
User scrolls manually
        ↓
User takes screenshots
        ↓
Drops screenshots into LinkedinScreenShots/
        ↓
Koa/chokidar detects files
        ↓
Group files by scan date
        ↓
Detect LinkedIn result cards
        ↓
Crop avatar
        ↓
OCR visible:
  - name
  - headline/title
  - company when visible
        ↓
Normalize/hash person identity
        ↓
Classify avatar independently:
  - #OPEN_TO_WORK
  - #HIRING
        ↓
Deduplicate overlapping screenshots
        ↓
Persist:
  - person identity/hash
  - local display fields
  - company
  - Open classification
  - Hiring classification
        ↓
Compare matched people with previous scans
        ↓
Calculate Open-to-Work analytics:
  - Open count/rate
  - Newly Open
  - Removed Open
  - Net flow
  - Entry rate
  - Removal rate
  - Entry/Exit ratio
        ↓
Calculate Hiring analytics:
  - Hiring count/rate
  - Newly Hiring
  - Removed Hiring
  - Net Hiring
  - Hiring people
  - Companies represented
        ↓
Koa API
        ↓
TanStack Query
        ↓
React + shadcn + Recharts
        ↓
Dashboard:
  - Open-to-Work snapshot/trends
  - Hiring snapshot/trends
  - Who's Hiring list
  - Company list
  - Daily History
  - Scan quality
```

---

# 80. Final Product Definition

The application is a local longitudinal LinkedIn screenshot-analysis dashboard with **two major visible-signal systems**:

### Job-seeker signal

Track the public `#OPEN_TO_WORK` avatar frame:

```text
current stock
new entries
removals/exits
net flow
entry/removal rates
matched cohorts
observed duration
historical trends
```

### Hiring signal

Track the public `#HIRING` avatar frame:

```text
who is visibly Hiring
their visible title/headline
their company when reliably visible
number of Hiring people
Hiring-frame rate
companies represented
new Hiring frames
removed Hiring frames
net Hiring movement
historical Hiring trends
```

The dashboard should make it possible to look at the latest scan in seconds, inspect exact daily history, understand why Open-to-Work trends are moving, and identify people in the sampled network who are visibly signaling that they are hiring.

All claims must remain bounded to what was actually observed in the supplied screenshots.
