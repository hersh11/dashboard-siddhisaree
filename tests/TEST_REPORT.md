# Test Plan and Execution Report

**Project:** Internal Order Management & Business Analytics Dashboard  
**Tested by:** Harsh Narain  
**Build tested:** local static build, served by `server.js` on `127.0.0.1:8766`  
**Browser:** Chromium (headless), viewports 1440 / 1024 / 390 px  
**Result:** 45 passed, 2 failed, 1 diagnostic — 48 checks in total

## How the testing was done

The dashboard has no login, no server-side logic and no database, so the things that can go wrong are all in the browser: a number calculated wrongly, a filter that does not reach every panel, a chart drawn from the wrong field, a table that sorts text where it should sort numbers. The tests were written around those risks rather than around the code.

Every expected value was worked out separately from the dashboard. The Excel workbook was read in Python and the totals counted there, then compared against what the dashboard puts on screen. If the two disagree, one of them is wrong, and the workbook is the one that cannot be argued with. This is why the numbers in the table below are exact rather than approximate.

The checks were then written as a script so the whole set can be re-run in about a minute after any change, instead of being clicked through by hand each time.

## Test cases and results

### Loading and data integrity

| ID | What is being checked | Expected | Actual | Result |
|---|---|---|---|---|
| TC-A1 | Page loads with no uncaught JavaScript errors | 0 errors | 1 errors | **Fail** |
| TC-A2 | Orders sheet row count loaded into dashboard | 1060 | 1060 | Pass |
| TC-A3 | OrderStages sheet row count loaded | 7881 | 7881 | Pass |
| TC-A4 | Customers sheet row count loaded | 780 | 780 | Pass |
| TC-A5 | Employees sheet row count loaded | 30 | 30 | Pass |
| TC-A6 | Workflow completion badge shows 99% | 99% | 99% | Pass |
| TC-A7 | Dashboard loads no files from the internet (offline claim) | 0 external requests | 1 external | **Fail** |
| TC-A8 | With the font CDN unreachable, the dashboard still renders in full | KPIs, tables and charts all render | orders=1060, rows=50, charts=7 | Pass |

> **TC-A1** — Failed to load resource: net::ERR_TUNNEL_CONNECTION_FAILED

> **TC-A7** — https://fonts.googleapis.com/css2

> **TC-A8** — Falls back to Georgia / system sans as declared in CSS


### KPI cards

| ID | What is being checked | Expected | Actual | Result |
|---|---|---|---|---|
| TC-B1 | Total Orders with no filter applied | 1060 | 1060 | Pass |
| TC-B2 | Delivered Revenue equals sum of delivered orders | 36412000 | 36412000 | Pass |
| TC-B3 | Average Order Value across all orders | 41645 | 41645 | Pass |
| TC-B4 | Repeat customer share | 32.6% | 32.6% | Pass |
| TC-B5 | Delivered + active counts in subtitle reconcile to total | 1060 | 1060 | Pass |

> **TC-B5** — 905 delivered, 155 active/other


### Filters

| ID | What is being checked | Expected | Actual | Result |
|---|---|---|---|---|
| TC-C1 | Status filter = Delivered | 905 | 905 | Pass |
| TC-C2 | Category filter = Lehenga | 350 | 350 | Pass |
| TC-C3 | Channel filter = Instagram DM | 264 | 264 | Pass |
| TC-C4 | Priority filter = Rush | 74 | 74 | Pass |
| TC-C5 | Two filters combined (Delivered + Saree) narrow the result | < 500 and > 0 | 434 | Pass |
| TC-C6 | Date range restricted to January 2026 | 194 | 194 | Pass |
| TC-C7 | Reset button restores the full dataset | 1060 | 1060 | Pass |
| TC-C8 | Filter combination with no matches shows empty state, no crash | 0 orders + empty message | 0 orders, msg=1 | Pass |

### Charts

| ID | What is being checked | Expected | Actual | Result |
|---|---|---|---|---|
| TC-D1 | All seven chart canvases are present and rendered | 7 | 7 | Pass |
| TC-D2 | Monthly trend labels appear in chronological order | Jan..Jun 2026 | Jan 2026, Feb 2026, Mar 2026, Apr 2026, May 2026, Jun 2026 | Pass |
| TC-D3 | Status doughnut values sum to the total order count | 1060 | 1060 | Pass |
| TC-D4 | Revenue-by-category bars sum to total order value | 44143500 | 44143500 | Pass |
| TC-D5 | Average time-in-stage chart reports non-zero waiting times | all 7 stages > 0 | 7/7 non-zero; max=13.8d | Pass |
| TC-D6 | Stage funnel never increases from one stage to the next | non-increasing | [1060, 1052, 1031, 1020, 924, 923, 918, 905] | Pass |
| TC-D5b | Root cause: every stage row stores the same start and end time | Diagnostic — measure how many rows share one timestamp | 7833 of 7833 rows identical | Diagnostic |

> **TC-D1** — trendChart,statusChart,categoryChart,channelChart,stageChart,durationChart,geoChart

> **TC-D5** — Order Created=0.97d; Designer Assigned=3.53d; Design Approved=0.44d; Production Assigned=13.80d; Quality Check=0.45d; Packaging=0.62d; Shipping=3.26d

> **TC-D5b** — Confirms the original (end - start) formula could only ever return zero


### Tables and search

| ID | What is being checked | Expected | Actual | Result |
|---|---|---|---|---|
| TC-E1 | Team table lists every employee | 30 | 30 | Pass |
| TC-E2 | Team table default-sorts by assignments, highest first | row1 >= row2 | 657 >= 602 | Pass |
| TC-E3 | Team search narrows the table to matching roles | < 30 rows | 5 rows | Pass |
| TC-E3b | Team search with no match shows a friendly empty message | empty message | 1 message | Pass |
| TC-E4 | Order register shows the first 50 orders by default | 50 | 50 | Pass |
| TC-E5 | Order register footer reports the full filtered total | Showing 50 of 1,060 orders | Showing 50 of 1,060 orders | Pass |
| TC-E6 | Load more adds the next 50 orders | 100 | 100 | Pass |
| TC-E7 | Clicking the Value header sorts orders by value | ascending | 1600 .. 6900 | Pass |
| TC-E8 | Order register search filters by city | fewer than 1,060 | Showing 50 of 285 orders | Pass |

### CSV export

| ID | What is being checked | Expected | Actual | Result |
|---|---|---|---|---|
| TC-F1 | CSV export contains a header row plus every filtered order | 1061 | 1061 | Pass |
| TC-F2 | CSV header lists all twelve expected columns | 12 | 12 | Pass |
| TC-F3 | CSV export respects the active filter (Gown only) | 46 | 46 | Pass |

### Theme and preference

| ID | What is being checked | Expected | Actual | Result |
|---|---|---|---|---|
| TC-G1 | Toggle switches the dashboard to dark mode | dark | dark | Pass |
| TC-G2 | Chosen theme is written to browser storage | dark | dark | Pass |
| TC-G3 | Theme choice survives a page reload | dark | dark | Pass |

### Keyboard and screen-reader access

| ID | What is being checked | Expected | Actual | Result |
|---|---|---|---|---|
| TC-G4 | Table headers can be sorted using only the keyboard | sorted by role | Designer .. Shipping Coordinator | Pass |
| TC-G5 | Sortable headers expose a screen-reader label | aria-label present | Sort by Role | Pass |

### Responsive layout

| ID | What is being checked | Expected | Actual | Result |
|---|---|---|---|---|
| TC-H1 | Desktop (1440px): page does not scroll sideways | no horizontal overflow | 0px overflow | Pass |
| TC-H2 | Tablet (1024px): page does not scroll sideways | no horizontal overflow | 0px overflow | Pass |
| TC-H3 | Mobile (390px): page does not scroll sideways | no horizontal overflow | 0px overflow | Pass |


## Defects found

Two real problems came out of this. Neither of them showed up while using the dashboard normally, which is the point — both look fine on screen.

### D-01 — The "average time spent by stage" chart was reporting zero for every stage

**Severity:** High. This is the chart that answers the question the whole project was built around: where do orders get stuck?

**What happened.** The chart drew a flat line along the bottom of the axis for all eight stages. It did not throw an error and it did not look broken, so it went unnoticed until the numbers were checked against the workbook.

**Why.** The chart worked out how long an order spent in a stage by subtracting that stage's start time from its own end time. In the workbook, those two values are always the same — all 7,833 completed stage rows carry one timestamp written into both columns (confirmed by TC-D5b). Subtracting a number from itself gives zero, every time, for every row.

The mistake underneath it is a definition, not a formula. A stage row is a *stamp*, not a *span* — it records the moment somebody marked that step done. So the time an order spends waiting at a step is not inside one row at all. It is the gap between one row and the next row for the same order.

**Fix.** The calculation now groups stage records by order, puts them in sequence order, and measures the gap from each stage to the one that follows it. The final stage is left out of the chart, because nothing follows delivery and a bar there would be meaningless.

**Result after the fix**, verified by TC-D5:

| Stage | Average wait before the next step |
|---|---|
| Order Created | 1.0 day |
| Designer Assigned | 3.5 days |
| Design Approved | 0.4 days |
| **Production Assigned** | **13.8 days** |
| Quality Check | 0.5 days |
| Packaging | 0.6 days |
| Shipping | 3.3 days |

Average time from order to delivery: **20.7 days**.

The chart went from carrying no information to carrying the single most useful finding in the dashboard — production is where orders sit, and it accounts for roughly two-thirds of the total time an order takes. Waiting for a design to be approved is a distant second at 3.5 days.

### D-02 — The dashboard is described as working offline, but it fetches fonts from the internet

**Severity:** Low, and left unfixed on purpose.

**What happened.** Chart.js is stored in the project folder, so the charts genuinely do work with no internet. The two display fonts, however, are still requested from Google Fonts by a link in `index.html`. With the network blocked, that request fails and the browser console logs one error (TC-A1, TC-A7).

**Impact.** Very little, and this was checked rather than assumed. TC-A8 loads the page with the font servers blocked: every KPI, table and chart still renders correctly, and the text falls back to Georgia and the system sans-serif, exactly as the stylesheet instructs. Nothing is lost except the intended typeface.

**Why it was not fixed.** Fixing it properly means downloading the font files into the project and rewriting the stylesheet to point at them. That is a packaging change, not a code fix, and it did not seem worth making days before the review when the failure mode is a slightly different-looking heading. It is recorded here honestly and listed first in future scope.

## What the test run does not cover

Being straight about the limits:

- The dashboard was tested in Chromium only. Firefox and Safari were not checked.
- The data is synthetic. The tests confirm the dashboard reports the workbook correctly; they cannot confirm the workbook resembles the real business.
- Contrast ratios and keyboard order were checked by hand and by two automated cases, not with a full accessibility audit tool.
- There is no load or performance testing. At 1,060 orders the dashboard is fast; nothing is known about how it behaves at fifty thousand.

## Re-running the tests

From the repository root:

```
pip install -r tests/requirements.txt
python -m playwright install chromium
node server.js                 # terminal 1
python tests/run_tests.py      # terminal 2
```

The script prints one line per case and writes the raw results to `tests/results.json`. CSV downloads from the export checks go to `tests/output/`, which git ignores.

Re-run on 1 Oct 2026 after moving the suite into this repository: same result, 45 passed, 2 failed, 1 diagnostic.
