# Siddhi Sarees order analytics dashboard

I built this during my summer internship at Siddhi Sarees (June to July 2026). It wasn't an assigned task. Every order there goes through eight stages, each handled by a different person, and there was no single place to see where an order stood. So I made one.

It shows what's selling, where orders get stuck and who is handling what. It's semantic HTML, hand-written CSS (custom properties, Grid, Flexbox) and plain ES2020 JavaScript, with Chart.js for the charts. There's no framework and no build step, and you don't need to `npm install` anything.

The data is synthetic. Real customer data was confidential, so I wrote Python scripts that generate six months of orders (1,060 of them, January to June 2026). They're in `data_generation/`.

The eight stages: Order Created, Designer Assigned, Design Approved, Production Assigned, Quality Check, Packaging, Shipping, Delivered.

## What it shows

- KPIs at the top: total orders, delivered revenue, average order value and the share of repeat customers. Each has a sparkline of the months in view and a change against the month before. They count up to the new value when a filter changes.
- A live pipeline of the eight stages showing how many active orders are waiting at each one and for how long on average. The bottleneck is highlighted (production, at 13.8 days), and clicking a stage filters the whole dashboard to the orders waiting there.
- Charts for monthly revenue and order flow, order status, revenue by category, sales channel, the stage completion funnel, average time spent at each stage, and domestic vs NRI demand. There's also a breakdown of the top colors, fabrics and work types.
- Filters for date range, status, category, channel and priority, plus quick date ranges. Clicking a month, status, category or channel in a chart filters by it too. Active filters show as chips you can remove one at a time, and every chart, KPI and table updates.
- Click any order number to see its journey through the eight stages: who handled each one, when, and how long it waited. Click any employee to see their workload, the stages they handle and their recent orders.
- A search palette (Ctrl+K or /) that finds orders, customers and staff, jumps to a section or runs an action.
- A team table (assignments, stage completions, order value handled) that sorts on any column, and an order register that sorts, pages and exports whatever you've filtered to CSV. Each table has its own search.
- Dark mode with a circular reveal, and it remembers your choice. It works on mobile, it's keyboard accessible and the colors meet WCAG AA contrast. If your system is set to reduce motion, the animations stay off.

## Running it

You need Node.js. `server.js` is a small static file server with no dependencies.

```bash
git clone https://github.com/hersh11/dashboard-siddhisaree.git
cd dashboard-siddhisaree
node server.js
```

Then open http://127.0.0.1:8766/index.html.

The data comes pre-built. If you want to rebuild the workbook:

```bash
pip install pandas openpyxl
python data_generation/build_workbook.py
```

The generators use fixed seeds, so you get the same data back row for row. The Summary sheet is formulas, which Excel fills in when you open the file. `dashboard-data.js` is the same data in a form the browser can load.

## Tests

`tests/run_tests.py` is a Playwright script (Python, headless Chromium) with 48 checks across nine areas: data integrity, KPI cards, filters, charts, tables and search, CSV export, theme, keyboard and screen-reader access, and layout at 1440, 1024 and 390 px wide. I worked out every expected value from the workbook in Python instead of reading it off the screen. The full write-up is in [`tests/TEST_REPORT.md`](tests/TEST_REPORT.md).

Last run (6 Oct 2026): 47 passed, 0 failed, 1 diagnostic.

The tests caught a real bug. The "average time spent by stage" chart showed zero for every stage. It was subtracting each stage's start time from its end time, but every stage row has the same timestamp in both columns. A stage row is a stamp, not a span. The time an order waits at a stage is the gap until its next stage, so `app.js` now measures that instead. With the fix, production is where orders sit longest: 13.8 days on average.

Earlier runs had two failures from one known issue: the display fonts came from Google Fonts, so the page wasn't fully offline (TC-A1, TC-A7). The fonts are now self-hosted in `fonts/`, the page makes no requests to other sites, and both checks pass.

To run the tests:

```bash
pip install -r tests/requirements.txt
python -m playwright install chromium
node server.js                 # terminal 1
python tests/run_tests.py      # terminal 2
```

## Files

```
dashboard-siddhisaree/
├── index.html                  page layout
├── styles.css                  theme, layout, responsive rules, motion
├── app.js                      filters, sorting, KPIs, charts, pipeline, CSV export
├── ui.js                       theme, navigation, motion, detail drawer, search palette
├── dashboard-data.js           the workbook data as a JS object
├── chart.umd.min.js            Chart.js 4.4.1, kept in the repo so charts work offline
├── fonts/                      Inter and Playfair Display (variable, woff2) and their licences
├── server.js                   local static server
├── 404.html                    not-found page
├── robots.txt, llms.txt        notes for search engines and AI assistants
├── hero-textile.jpg            header background
├── siddhi_sarees_dataset.xlsx  the source workbook
├── data_generation/            seeded generators + build_workbook.py
├── tests/                      Playwright suite, test report, last results
├── PROJECT_REPORT.md           internship write-up
└── RUN_INSTRUCTIONS.txt        run steps in plain text
```

## Data

The workbook has five sheets the dashboard uses, plus a README sheet:

| Sheet | What's in it |
|---|---|
| `Orders` | One row per order: product, pricing, customer, channel, status, current stage |
| `OrderStages` | One row per stage of each order: the eight-step lifecycle, assigned employee, timestamps, notes |
| `Customers` | Location, customer type, acquisition source, lifetime spend |
| `Employees` | Name, role, department |
| `Summary` | Headline business numbers |

## Design

Maroon, teal and gold, on warm cream in light mode and warm charcoal in dark mode, to suit a textile brand. Headings and KPI numbers use Playfair Display and the rest uses Inter, both self-hosted.

The motion is all CSS and the browser's built-in APIs, with no animation library: a slow band of light moves across the hero like sheen on silk, the headline arrives word by word, cards rise in as you scroll and pick up a soft light under the cursor, the pipeline track flows toward delivery, and the theme switch spreads out in a circle using the View Transitions API. The detail drawer and search palette are native `<dialog>` elements.

## Next

- [x] Self-host Playfair Display and Inter so it really works offline
- [x] Compare this month with last month
- [x] A drill-down for each employee
- [ ] CSV export for the team table too (only the order register exports right now)

Harsh Narain ([@hersh11](https://github.com/hersh11))
