import json, re, asyncio
from pathlib import Path
from playwright.async_api import async_playwright

URL = "http://127.0.0.1:8766/index.html"
HERE = Path(__file__).resolve().parent
OUT = HERE / "output"          # CSV downloads land here (git-ignored)
OUT.mkdir(exist_ok=True)
results = []
console_msgs = []

def rec(tid, module, desc, expected, actual, status, note=""):
    results.append(dict(id=tid, module=module, desc=desc, expected=str(expected),
                        actual=str(actual), status=status, note=note))
    print(f"{tid:6s} {status:5s} | {desc[:58]:58s} | exp={str(expected)[:22]:22s} act={str(actual)[:22]}")

def chk(tid, module, desc, expected, actual, note=""):
    ok = (str(expected).strip() == str(actual).strip())
    rec(tid, module, desc, expected, actual, "PASS" if ok else "FAIL", note)
    return ok

async def txt(page, sel):
    return (await page.inner_text(sel)).strip()

async def digits(page, sel):
    t = await txt(page, sel)
    return int(re.sub(r"[^\d]", "", t) or 0)

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=["--no-sandbox"])
        ctx = await browser.new_context(viewport={"width":1440,"height":950}, accept_downloads=True)
        page = await ctx.new_page()
        page.on("console", lambda m: console_msgs.append((m.type, m.text)))
        page.on("pageerror", lambda e: console_msgs.append(("pageerror", str(e))))
        await page.goto(URL, wait_until="networkidle")
        await page.wait_for_timeout(1800)

        # ---------- A: data loading ----------
        errs = [m for m in console_msgs if m[0] in ("error","pageerror")]
        rec("TC-A1","Data load","Page loads with no uncaught JavaScript errors",
            "0 errors", f"{len(errs)} errors", "PASS" if not errs else "FAIL",
            "; ".join(t[:90] for _,t in errs[:3]))
        chk("TC-A2","Data load","Orders sheet row count loaded into dashboard", 1060, await digits(page,"#sheetOrders"))
        chk("TC-A3","Data load","OrderStages sheet row count loaded", 7881, await digits(page,"#sheetStages"))
        chk("TC-A4","Data load","Customers sheet row count loaded", 780, await digits(page,"#sheetCustomers"))
        chk("TC-A5","Data load","Employees sheet row count loaded", 30, await digits(page,"#sheetEmployees"))
        hs = await txt(page,"#healthScore")
        chk("TC-A6","Data load","Workflow completion badge shows 99%", "99%", hs)

        # ---------- B: KPI ----------
        chk("TC-B1","KPI","Total Orders with no filter applied", 1060, await digits(page,"#kpiOrders"))
        chk("TC-B2","KPI","Delivered Revenue equals sum of delivered orders", 36412000, await digits(page,"#kpiRevenue"))
        chk("TC-B3","KPI","Average Order Value across all orders", 41645, await digits(page,"#kpiAov"))
        rep = await txt(page,"#kpiRepeat")
        chk("TC-B4","KPI","Repeat customer share", "32.6%", rep)
        sub = await txt(page,"#kpiOrdersSub")
        m = re.findall(r"(\d[\d,]*)", sub)
        tot = sum(int(x.replace(",","")) for x in m[:2])
        chk("TC-B5","KPI","Delivered + active counts in subtitle reconcile to total", 1060, tot, sub)

        # ---------- C: filters ----------
        async def setf(sel, val):
            await page.select_option(sel, val); await page.wait_for_timeout(900)
        await setf("#statusFilter","Delivered")
        chk("TC-C1","Filter","Status filter = Delivered", 905, await digits(page,"#kpiOrders"))
        await setf("#statusFilter","")
        await setf("#categoryFilter","Lehenga")
        chk("TC-C2","Filter","Category filter = Lehenga", 350, await digits(page,"#kpiOrders"))
        await setf("#categoryFilter","")
        await setf("#channelFilter","Instagram DM")
        chk("TC-C3","Filter","Channel filter = Instagram DM", 264, await digits(page,"#kpiOrders"))
        await setf("#channelFilter","")
        await setf("#priorityFilter","Rush")
        chk("TC-C4","Filter","Priority filter = Rush", 74, await digits(page,"#kpiOrders"))
        await setf("#priorityFilter","")
        await setf("#statusFilter","Delivered"); await setf("#categoryFilter","Saree")
        combo = await digits(page,"#kpiOrders")
        rec("TC-C5","Filter","Two filters combined (Delivered + Saree) narrow the result",
            "< 500 and > 0", combo, "PASS" if 0 < combo < 500 else "FAIL")
        await setf("#statusFilter",""); await setf("#categoryFilter","")
        await page.fill("#dateFrom","2026-01-01"); await page.fill("#dateTo","2026-01-31")
        await page.dispatch_event("#dateTo","change"); await page.wait_for_timeout(900)
        chk("TC-C6","Filter","Date range restricted to January 2026", 194, await digits(page,"#kpiOrders"))
        await page.click("#resetFilters"); await page.wait_for_timeout(1200)
        chk("TC-C7","Filter","Reset button restores the full dataset", 1060, await digits(page,"#kpiOrders"))
        await setf("#statusFilter","On Hold"); await setf("#categoryFilter","Blouse Only")
        empty_kpi = await digits(page,"#kpiOrders")
        empty_msg = await page.locator("#orderTable .empty-state").count()
        rec("TC-C8","Filter","Filter combination with no matches shows empty state, no crash",
            "0 orders + empty message", f"{empty_kpi} orders, msg={empty_msg}",
            "PASS" if empty_kpi==0 and empty_msg==1 else "FAIL")
        await page.click("#resetFilters"); await page.wait_for_timeout(1200)

        # ---------- D: charts ----------
        cv = await page.eval_on_selector_all("canvas","els=>els.map(e=>e.id)")
        chk("TC-D1","Charts","All seven chart canvases are present and rendered", 7, len(cv), ",".join(cv))
        labels = await page.evaluate("()=>charts.trendChart.data.labels")
        order_ok = labels == sorted(labels, key=lambda s: __import__('datetime').datetime.strptime(s.replace(' ',' '), "%b %Y")) if labels else False
        rec("TC-D2","Charts","Monthly trend labels appear in chronological order",
            "Jan..Jun 2026", ", ".join(labels), "PASS" if order_ok else "FAIL")
        st = await page.evaluate("()=>charts.statusChart.data.datasets[0].data")
        chk("TC-D3","Charts","Status doughnut values sum to the total order count", 1060, int(sum(st)))
        catv = await page.evaluate("()=>charts.categoryChart.data.datasets[0].data")
        chk("TC-D4","Charts","Revenue-by-category bars sum to total order value", 44143500, int(sum(catv)))
        dur = await page.evaluate("()=>charts.durationChart.data.datasets[0].data")
        durlab = await page.evaluate("()=>charts.durationChart.data.labels")
        nonzero = sum(1 for v in dur if v and v > 0)
        rec("TC-D5","Charts","Average time-in-stage chart reports non-zero waiting times",
            "all 7 stages > 0", f"{nonzero}/7 non-zero; max={max(dur):.1f}d",
            "PASS" if nonzero==7 else "FAIL", "; ".join(f"{l}={v:.2f}d" for l,v in zip(durlab,dur)))
        fun = await page.evaluate("()=>charts.stageChart.data.datasets[0].data")
        mono = all(fun[i] >= fun[i+1] for i in range(len(fun)-1))
        rec("TC-D6","Charts","Stage funnel never increases from one stage to the next",
            "non-increasing", str(fun), "PASS" if mono else "FAIL")

        # ---------- E: tables ----------
        n = await page.locator("#teamTable tr").count()
        chk("TC-E1","Tables","Team table lists every employee", 30, n)
        first = await page.locator("#teamTable tr td:nth-child(4)").first.inner_text()
        second = await page.locator("#teamTable tr td:nth-child(4)").nth(1).inner_text()
        d1,d2 = int(first.replace(",","")), int(second.replace(",",""))
        rec("TC-E2","Tables","Team table default-sorts by assignments, highest first",
            "row1 >= row2", f"{d1} >= {d2}", "PASS" if d1>=d2 else "FAIL")
        await page.fill("#teamSearch","Designer"); await page.wait_for_timeout(600)
        ns = await page.locator("#teamTable tr").count()
        rec("TC-E3","Tables","Team search narrows the table to matching roles",
            "< 30 rows", f"{ns} rows", "PASS" if 0 < ns < 30 else "FAIL")
        await page.fill("#teamSearch","zzzznomatch"); await page.wait_for_timeout(600)
        es = await page.locator("#teamTable .empty-state").count()
        rec("TC-E3b","Tables","Team search with no match shows a friendly empty message",
            "empty message", f"{es} message", "PASS" if es==1 else "FAIL")
        await page.fill("#teamSearch",""); await page.wait_for_timeout(600)
        rowc = await page.locator("#orderTable tr").count()
        chk("TC-E4","Tables","Order register shows the first 50 orders by default", 50, rowc)
        cnt = await txt(page,"#orderCount")
        chk("TC-E5","Tables","Order register footer reports the full filtered total",
            "Showing 50 of 1,060 orders", cnt)
        await page.click("#loadMoreOrders"); await page.wait_for_timeout(700)
        chk("TC-E6","Tables","Load more adds the next 50 orders", 100, await page.locator("#orderTable tr").count())
        await page.click("th[data-sort='final_price_inr']"); await page.wait_for_timeout(700)
        vals = await page.eval_on_selector_all("#orderTable tr td:nth-child(7)",
            "els=>els.map(e=>Number(e.textContent.replace(/[^0-9]/g,'')))")
        asc = all(vals[i] <= vals[i+1] for i in range(len(vals)-1))
        rec("TC-E7","Tables","Clicking the Value header sorts orders by value",
            "ascending", f"{vals[0]} .. {vals[-1]}", "PASS" if asc else "FAIL")
        await page.fill("#orderSearch","Bareilly"); await page.wait_for_timeout(700)
        sc = await txt(page,"#orderCount")
        rec("TC-E8","Tables","Order register search filters by city", "fewer than 1,060", sc,
            "PASS" if "1,060" not in sc else "FAIL")
        await page.fill("#orderSearch",""); await page.wait_for_timeout(600)

        # ---------- F: export ----------
        async with page.expect_download() as dl:
            await page.click("#exportOrdersBtn")
        d = await dl.value
        path = str(OUT / "export_all.csv")
        await d.save_as(path)
        lines = open(path, encoding="utf-8").read().strip().split("\n")
        chk("TC-F1","Export","CSV export contains a header row plus every filtered order", 1061, len(lines))
        chk("TC-F2","Export","CSV header lists all twelve expected columns", 12, len(lines[0].split('","')))
        await page.select_option("#categoryFilter","Gown"); await page.wait_for_timeout(900)
        async with page.expect_download() as dl2:
            await page.click("#exportOrdersBtn")
        d2 = await dl2.value
        p2 = str(OUT / "export_gown.csv")
        await d2.save_as(p2)
        l2 = open(p2, encoding="utf-8").read().strip().split("\n")
        chk("TC-F3","Export","CSV export respects the active filter (Gown only)", 46, len(l2))
        await page.click("#resetFilters"); await page.wait_for_timeout(1200)

        # ---------- G: theme / accessibility ----------
        await page.click("#themeToggle"); await page.wait_for_timeout(500)
        th = await page.evaluate("()=>document.documentElement.dataset.theme")
        chk("TC-G1","Theme","Toggle switches the dashboard to dark mode", "dark", th)
        ls = await page.evaluate("()=>localStorage.getItem('siddhi-theme')")
        chk("TC-G2","Theme","Chosen theme is written to browser storage", "dark", ls)
        await page.reload(wait_until="networkidle"); await page.wait_for_timeout(1500)
        th2 = await page.evaluate("()=>document.documentElement.dataset.theme")
        chk("TC-G3","Theme","Theme choice survives a page reload", "dark", th2)
        await page.click("#themeToggle"); await page.wait_for_timeout(400)
        await page.focus("th[data-sort='role']")
        await page.keyboard.press("Enter"); await page.wait_for_timeout(600)
        roles = await page.eval_on_selector_all("#teamTable tr td:nth-child(2)","e=>e.map(x=>x.textContent)")
        srt = roles == sorted(roles)
        rec("TC-G4","Accessibility","Table headers can be sorted using only the keyboard",
            "sorted by role", f"{roles[0]} .. {roles[-1]}", "PASS" if srt else "FAIL")
        aria = await page.evaluate("()=>document.querySelector(\"th[data-sort='role']\").getAttribute('aria-label')")
        rec("TC-G5","Accessibility","Sortable headers expose a screen-reader label",
            "aria-label present", aria or "missing", "PASS" if aria else "FAIL")

        # ---------- H: responsive ----------
        for tid, w, h, name in [("TC-H1",1440,950,"Desktop"),("TC-H2",1024,800,"Tablet"),("TC-H3",390,844,"Mobile")]:
            await page.set_viewport_size({"width":w,"height":h}); await page.wait_for_timeout(900)
            ov = await page.evaluate("()=>document.documentElement.scrollWidth - document.documentElement.clientWidth")
            rec(tid,"Responsive",f"{name} ({w}px): page does not scroll sideways",
                "no horizontal overflow", f"{ov}px overflow", "PASS" if ov <= 1 else "FAIL")

        # network dependency check
        reqs = []
        page2 = await ctx.new_page()
        page2.on("request", lambda r: reqs.append(r.url))
        await page2.goto(URL, wait_until="networkidle"); await page2.wait_for_timeout(1200)
        ext = [u for u in reqs if not u.startswith("http://127.0.0.1")]
        rec("TC-A7","Data load","Dashboard loads no files from the internet (offline claim)",
            "0 external requests", f"{len(ext)} external", "PASS" if not ext else "FAIL",
            "; ".join(sorted(set(u.split('?')[0] for u in ext))[:3]))

        # ---------- graceful degradation + root-cause evidence ----------
        page3 = await ctx.new_page()
        await page3.route("**fonts.googleapis.com**", lambda r: asyncio.ensure_future(r.abort()))
        await page3.route("**fonts.gstatic.com**", lambda r: asyncio.ensure_future(r.abort()))
        await page3.goto(URL, wait_until="domcontentloaded"); await page3.wait_for_timeout(2500)
        k = int(re.sub(r"[^\d]","", await page3.inner_text("#kpiOrders")) or 0)
        rows = await page3.locator("#orderTable tr").count()
        cvs = await page3.locator("canvas").count()
        ok = (k == 1060 and rows == 50 and cvs == 7)
        rec("TC-A8","Data load","With the font CDN unreachable, the dashboard still renders in full",
            "KPIs, tables and charts all render", f"orders={k}, rows={rows}, charts={cvs}",
            "PASS" if ok else "FAIL", "Falls back to Georgia / system sans as declared in CSS")

        same = await page.evaluate("""()=>{
          const s = window.SIDDHI_DASHBOARD_DATA.OrderStages;
          let equal=0, total=0;
          for (const r of s) {
            if (!r.start_timestamp || !r.end_timestamp) continue;
            total++; if (r.start_timestamp === r.end_timestamp) equal++;
          }
          return [equal,total];
        }""")
        rec("TC-D5b","Charts","Root cause: every stage row stores the same start and end time",
            "end differs from start on some rows", f"{same[0]} of {same[1]} rows identical",
            "DIAG",
            "Confirms the original (end - start) formula could only ever return zero")

        await browser.close()

    json.dump(results, open(HERE / "results.json", "w"), indent=1)
    p_ = sum(1 for r in results if r["status"]=="PASS")
    f_ = sum(1 for r in results if r["status"]=="FAIL")
    d_ = sum(1 for r in results if r["status"]=="DIAG")
    print(f"\n==== {p_} PASSED, {f_} FAILED, {d_} DIAGNOSTIC (of {len(results)}) ====")

asyncio.run(main())
