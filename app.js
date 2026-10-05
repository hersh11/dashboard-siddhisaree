const workbook = window.SIDDHI_DASHBOARD_DATA;
const orders = workbook.Orders.map((order) => ({
  ...order,
  orderDate: new Date(order.order_date),
  final_price_inr: Number(order.final_price_inr || 0),
  quoted_price_inr: Number(order.quoted_price_inr || 0),
  is_returning_customer: String(order.is_returning_customer).toLowerCase() === "true",
}));
const stages = workbook.OrderStages.map((stage) => ({
  ...stage,
  start: stage.start_timestamp ? new Date(stage.start_timestamp) : null,
  end: stage.end_timestamp ? new Date(stage.end_timestamp) : null,
}));
const customers = workbook.Customers;
const employees = workbook.Employees;
const summary = workbook.Summary;

const orderById = new Map(orders.map((order) => [order.order_id, order]));
const stagesByOrderId = new Map();
stages.forEach((stage) => {
  if (!stagesByOrderId.has(stage.order_id)) stagesByOrderId.set(stage.order_id, []);
  stagesByOrderId.get(stage.order_id).push(stage);
});
stagesByOrderId.forEach((list) => list.sort((a, b) => Number(a.stage_sequence) - Number(b.stage_sequence)));
// The workbook is a snapshot; "now" is its last recorded event.
const dataAsOf = new Date(Math.max(...stages.map((stage) => stage.start?.getTime() || 0)));

const formatINR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const formatNum = new Intl.NumberFormat("en-IN");
const formatShortDate = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });
const prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const chartPalette = ["#b8324a", "#0f8b8d", "#c7922f", "#3366cc", "#267a55", "#744fc6", "#d66b38", "#596273"];
const stageOrder = ["Order Created", "Designer Assigned", "Design Approved", "Production Assigned", "Quality Check", "Packaging", "Shipping", "Delivered"];
const charts = {};

const ORDER_PAGE_STEP = 50;
let orderPageSize = ORDER_PAGE_STEP;
const teamSort = { key: "assignments", dir: -1 };
const orderSort = { key: "order_id", dir: -1 };
// Set by clicking a stage in the pipeline: orders currently waiting at that stage.
let stageFilter = "";
const dataRange = { from: "", to: "" };

const els = {
  dateFrom: document.querySelector("#dateFrom"),
  dateTo: document.querySelector("#dateTo"),
  status: document.querySelector("#statusFilter"),
  category: document.querySelector("#categoryFilter"),
  channel: document.querySelector("#channelFilter"),
  priority: document.querySelector("#priorityFilter"),
  reset: document.querySelector("#resetFilters"),
  teamSearch: document.querySelector("#teamSearch"),
  orderSearch: document.querySelector("#orderSearch"),
  exportOrders: document.querySelector("#exportOrdersBtn"),
  loadMoreOrders: document.querySelector("#loadMoreOrders"),
  orderCount: document.querySelector("#orderCount"),
  chips: document.querySelector("#activeFilters"),
};

function byId(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function uniqueValues(key) {
  return [...new Set(orders.map((item) => item[key]).filter(Boolean))].sort();
}

function fillSelect(select, values, label = "All") {
  select.innerHTML = [`<option value="">${label}</option>`, ...values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)].join("");
}

function sum(items, key) {
  return items.reduce((total, item) => total + Number(item[key] || 0), 0);
}

function groupBy(items, keyFn, valueFn = () => 1) {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    acc[key] = (acc[key] || 0) + valueFn(item);
    return acc;
  }, {});
}

function topEntries(obj, limit = 8) {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function compareValues(a, b) {
  if (a instanceof Date && b instanceof Date) return a - b;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a ?? "").localeCompare(String(b ?? ""));
}

function sortRows(rows, sortState) {
  return [...rows].sort((a, b) => compareValues(a[sortState.key], b[sortState.key]) * sortState.dir);
}

function bindSortableHeaders(table, sortState, onChange) {
  table.querySelectorAll("th[data-sort]").forEach((th) => {
    const label = th.textContent;
    th.innerHTML = `${label}<span class="sort-arrow">↕</span>`;
    th.tabIndex = 0;
    th.setAttribute("role", "button");
    th.setAttribute("aria-label", `Sort by ${label}`);
    const activate = () => {
      if (sortState.key === th.dataset.sort) {
        sortState.dir *= -1;
      } else {
        sortState.key = th.dataset.sort;
        sortState.dir = 1;
      }
      onChange();
    };
    th.addEventListener("click", activate);
    th.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activate();
      }
    });
  });
}

function updateSortIndicators(table, sortState) {
  table.querySelectorAll("th[data-sort]").forEach((th) => {
    const isSorted = th.dataset.sort === sortState.key;
    th.classList.toggle("sorted", isSorted);
    const arrow = th.querySelector(".sort-arrow");
    if (arrow) arrow.textContent = isSorted ? (sortState.dir === 1 ? "▲" : "▼") : "↕";
  });
}

function monthKey(date) {
  return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function isoDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}

function hueFor(text) {
  return [...text].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) % 360, 17);
}

function getFilteredOrders() {
  const from = els.dateFrom.value ? new Date(`${els.dateFrom.value}T00:00:00`) : null;
  const to = els.dateTo.value ? new Date(`${els.dateTo.value}T23:59:59`) : null;
  return orders.filter((order) => {
    if (from && order.orderDate < from) return false;
    if (to && order.orderDate > to) return false;
    if (els.status.value && order.current_status !== els.status.value) return false;
    if (els.category.value && order.product_category !== els.category.value) return false;
    if (els.channel.value && order.order_channel !== els.channel.value) return false;
    if (els.priority.value && order.priority !== els.priority.value) return false;
    if (stageFilter && (order.current_stage !== stageFilter || !isActive(order))) return false;
    return true;
  });
}

function isActive(order) {
  return order.current_status === "In Progress" || order.current_status === "On Hold";
}

// ---------- KPIs ----------

const kpiValues = { orders: 0, revenue: 0, aov: 0, repeat: 0 };
let kpiFirstRender = true;

function animateValue(el, from, to, formatter, duration = 650) {
  // Skip the tween on first paint or when the tab is backgrounded/hidden —
  // requestAnimationFrame is throttled (or fully paused) off-screen, which
  // would otherwise leave the KPI stuck at its starting value indefinitely.
  if (prefersReducedMotion || document.hidden || kpiFirstRender || Math.abs(to - from) < 0.01) {
    el.textContent = formatter(to);
    return;
  }
  el.classList.remove("bump");
  void el.offsetWidth;
  el.classList.add("bump");
  const start = performance.now();
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = formatter(from + (to - from) * eased);
    if (progress < 1) requestAnimationFrame(tick);
    else el.textContent = formatter(to);
  }
  requestAnimationFrame(tick);
}

const deliveredAt = new Map(stages
  .filter((stage) => stage.stage_name === "Delivered" && stage.status === "Completed" && stage.start)
  .map((stage) => [stage.order_id, stage.start]));

// One entry per calendar month, oldest first. Orders are counted in the month
// they were placed; revenue in the month it was delivered, so recent months
// aren't understated by orders that are still being made.
function monthlySeries(filtered) {
  const months = new Map();
  const monthFor = (date) => {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!months.has(key)) {
      months.set(key, { key, label: date.toLocaleDateString("en-IN", { month: "short" }), orders: 0, delivered: 0, value: 0, repeat: 0 });
    }
    return months.get(key);
  };
  filtered.forEach((order) => {
    const month = monthFor(order.orderDate);
    month.orders += 1;
    month.value += order.final_price_inr;
    if (order.is_returning_customer) month.repeat += 1;
    const delivered = order.current_status === "Delivered" && deliveredAt.get(order.order_id);
    if (delivered) monthFor(delivered).delivered += order.final_price_inr;
  });
  // A month that only has deliveries (no new orders) would skew order-based series.
  return [...months.values()].filter((month) => month.orders).sort((a, b) => a.key.localeCompare(b.key));
}

function smoothPath(points) {
  if (points.length < 2) return "";
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const [x0, y0] = points[Math.max(i - 1, 0)];
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const [x3, y3] = points[Math.min(i + 2, points.length - 1)];
    const c1 = [x1 + (x2 - x0) / 6, y1 + (y2 - y0) / 6];
    const c2 = [x2 - (x3 - x1) / 6, y2 - (y3 - y1) / 6];
    d += ` C${c1[0].toFixed(2)},${c1[1].toFixed(2)} ${c2[0].toFixed(2)},${c2[1].toFixed(2)} ${x2.toFixed(2)},${y2.toFixed(2)}`;
  }
  return d;
}

function renderSpark(svg, values) {
  if (values.length < 2) {
    svg.innerHTML = "";
    return;
  }
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const points = values.map((value, i) => [(i / (values.length - 1)) * 120, 32 - ((value - min) / span) * 26]);
  const line = smoothPath(points);
  const [lastX, lastY] = points[points.length - 1];
  svg.innerHTML = `
    <defs><linearGradient id="${svg.id}Fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".22" /><stop offset="1" stop-color="currentColor" stop-opacity="0" /></linearGradient></defs>
    <path class="spark-area" d="${line} L120,36 L0,36 Z" fill="url(#${svg.id}Fill)" />
    <path class="spark-line" d="${line}" />
    <circle class="spark-dot" cx="${lastX}" cy="${lastY}" r="2.6" />`;
  svg.classList.remove("draw");
  void svg.getBoundingClientRect();
  svg.classList.add("draw");
}

function renderDelta(el, series, pick, mode = "percent") {
  if (series.length < 2) {
    el.textContent = "";
    el.className = "delta";
    return;
  }
  const last = series[series.length - 1];
  const prev = series[series.length - 2];
  const a = pick(prev);
  const b = pick(last);
  const change = mode === "points" ? b - a : a ? ((b - a) / a) * 100 : 0;
  const unit = mode === "points" ? " pts" : "%";
  const direction = change > 0.05 ? "up" : change < -0.05 ? "down" : "flat";
  const arrow = direction === "up" ? "▲" : direction === "down" ? "▼" : "•";
  el.className = `delta ${direction}`;
  el.textContent = `${arrow} ${Math.abs(change).toFixed(1)}${unit} vs ${prev.label}`;
  el.title = `${last.label} compared with ${prev.label}`;
}

function renderKpis(filtered) {
  const delivered = filtered.filter((order) => order.current_status === "Delivered");
  const revenue = sum(delivered, "final_price_inr");
  const aov = filtered.length ? sum(filtered, "final_price_inr") / filtered.length : 0;
  const repeatShare = filtered.length ? (filtered.filter((order) => order.is_returning_customer).length / filtered.length) * 100 : 0;

  animateValue(byId("kpiOrders"), kpiValues.orders, filtered.length, (v) => formatNum.format(Math.round(v)));
  animateValue(byId("kpiRevenue"), kpiValues.revenue, revenue, (v) => formatINR.format(Math.round(v)));
  animateValue(byId("kpiAov"), kpiValues.aov, aov, (v) => formatINR.format(Math.round(v)));
  animateValue(byId("kpiRepeat"), kpiValues.repeat, repeatShare, (v) => `${v.toFixed(1)}%`);
  kpiFirstRender = false;
  kpiValues.orders = filtered.length;
  kpiValues.revenue = revenue;
  kpiValues.aov = aov;
  kpiValues.repeat = repeatShare;

  byId("kpiOrdersSub").textContent = `${formatNum.format(delivered.length)} delivered, ${formatNum.format(filtered.length - delivered.length)} active/other`;
  byId("kpiRevenueSub").textContent = `${formatNum.format(filtered.filter((o) => o.priority !== "Standard").length)} express or rush orders`;
  byId("kpiAovSub").textContent = `${formatNum.format(new Set(filtered.map((o) => o.customer_id)).size)} customers in view`;
  byId("kpiRepeatSub").textContent = `${formatNum.format(filtered.filter((o) => o.is_returning_customer).length)} repeat orders`;

  const series = monthlySeries(filtered);
  const aovOf = (month) => (month.orders ? month.value / month.orders : 0);
  const repeatOf = (month) => (month.orders ? (month.repeat / month.orders) * 100 : 0);
  renderSpark(byId("sparkOrders"), series.map((month) => month.orders));
  renderSpark(byId("sparkRevenue"), series.map((month) => month.delivered));
  renderSpark(byId("sparkAov"), series.map(aovOf));
  renderSpark(byId("sparkRepeat"), series.map(repeatOf));
  renderDelta(byId("deltaOrders"), series, (month) => month.orders);
  renderDelta(byId("deltaRevenue"), series, (month) => month.delivered);
  renderDelta(byId("deltaAov"), series, aovOf);
  renderDelta(byId("deltaRepeat"), series, repeatOf, "points");
}

// ---------- Charts ----------

function chartColors() {
  const dark = document.documentElement.dataset.theme === "dark";
  return dark
    ? { text: "#b9ad9e", legend: "#ddd3c6", grid: "rgba(243, 237, 227, 0.08)", tooltipBg: "#f3ede3", tooltipText: "#1a1512", border: "#1a1512" }
    : { text: "#657080", legend: "#4d5868", grid: "#edf0f5", tooltipBg: "#111820", tooltipText: "#ffffff", border: "#ffffff" };
}

// Works on a chart's live options or on a config before the chart is built.
function applyChartTheme(chart) {
  const colors = chartColors();
  const options = chart.options;
  options.plugins.legend.labels.color = colors.legend;
  Object.assign(options.plugins.tooltip, {
    backgroundColor: colors.tooltipBg,
    titleColor: colors.tooltipText,
    bodyColor: colors.tooltipText,
  });
  Object.values(options.scales || {}).forEach((scale) => {
    if (scale.ticks) {
      scale.ticks.color = colors.text;
      if ("backdropColor" in scale.ticks) scale.ticks.backdropColor = "transparent";
    }
    if (scale.grid) scale.grid.color = colors.grid;
    if (scale.angleLines) scale.angleLines.color = colors.grid;
    if (scale.pointLabels) scale.pointLabels.color = colors.text;
  });
  if (chart.type === "doughnut") {
    chart.data.datasets.forEach((dataset) => {
      dataset.borderColor = colors.border;
    });
  }
}

// Re-colour the existing charts without replaying their entrance animation,
// so a theme switch looks instant.
function rethemeCharts() {
  Object.values(charts).forEach((chart) => {
    applyChartTheme({ type: chart.config.type, options: chart.options, data: chart.data });
    chart.update("none");
  });
}

function makeChart(id, config) {
  if (charts[id]) charts[id].destroy();
  const userOptions = config.options || {};
  const userPlugins = userOptions.plugins || {};
  const isCircular = config.type === "doughnut" || config.type === "pie" || config.type === "polarArea";
  const onPick = config.onPick;

  let scales;
  if (config.type === "polarArea") {
    scales = { r: { ticks: { backdropColor: "transparent", z: 1 }, grid: {}, angleLines: {}, pointLabels: {} } };
  } else if (!isCircular) {
    scales = {
      ...(userOptions.scales || {}),
      x: { grid: { display: false }, ticks: {}, ...(userOptions.scales?.x || {}) },
      y: { beginAtZero: true, grid: {}, ticks: {}, ...(userOptions.scales?.y || {}) },
    };
    Object.values(scales).forEach((scale) => {
      scale.ticks ||= {};
      scale.grid ||= {};
    });
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: prefersReducedMotion ? false : { duration: 850, easing: "easeOutQuart" },
    ...userOptions,
    plugins: {
      legend: { ...(userPlugins.legend || {}), labels: { usePointStyle: true, boxWidth: 8, ...(userPlugins.legend?.labels || {}) } },
      tooltip: { padding: 12, cornerRadius: 10, ...(userPlugins.tooltip || {}) },
    },
    scales,
    onHover: onPick ? (event, elements) => {
      event.native.target.style.cursor = elements.length ? "pointer" : "default";
    } : undefined,
    onClick: onPick ? (event, elements, chart) => {
      if (elements.length) onPick(chart.data.labels[elements[0].index], elements[0].index);
    } : undefined,
  };
  applyChartTheme({ type: config.type, options, data: config.data });

  charts[id] = new Chart(document.getElementById(id), { type: config.type, data: config.data, options });
}

// Clicking a chart segment toggles the matching filter.
function toggleSelectFilter(select, value) {
  select.value = select.value === value ? "" : value;
  resetOrderPaging();
  refresh();
}

function setDateRange(from, to) {
  els.dateFrom.value = from;
  els.dateTo.value = to;
  resetOrderPaging();
  refresh();
}

function toggleMonth(monthStart) {
  const from = isoDate(monthStart);
  const to = isoDate(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0));
  const clampedFrom = from < dataRange.from ? dataRange.from : from;
  const clampedTo = to > dataRange.to ? dataRange.to : to;
  if (els.dateFrom.value === clampedFrom && els.dateTo.value === clampedTo) {
    setDateRange(dataRange.from, dataRange.to);
  } else {
    setDateRange(clampedFrom, clampedTo);
  }
}

// Average days an order waits at each stage before the next one starts.
// Each stage row's own end_timestamp equals its start_timestamp in the source
// workbook, so (end - start) is always zero and cannot be used to measure this.
function computeStageWaits(filteredStages) {
  const durations = {};
  const grouped = new Map();
  filteredStages.forEach((stage) => {
    if (!stage.start) return;
    if (!grouped.has(stage.order_id)) grouped.set(stage.order_id, []);
    grouped.get(stage.order_id).push(stage);
  });
  grouped.forEach((orderStages) => {
    orderStages.sort((a, b) => Number(a.stage_sequence) - Number(b.stage_sequence));
    for (let i = 0; i < orderStages.length - 1; i += 1) {
      const days = (orderStages[i + 1].start - orderStages[i].start) / 864e5;
      if (!Number.isFinite(days) || days < 0) continue;
      const stageName = orderStages[i].stage_name;
      durations[stageName] ||= [];
      durations[stageName].push(days);
    }
  });
  const averages = {};
  Object.entries(durations).forEach(([stageName, values]) => {
    averages[stageName] = values.reduce((a, b) => a + b, 0) / values.length;
  });
  return averages;
}

function renderCharts(filtered, filteredStages, waits) {
  const months = new Map();
  [...filtered].sort((a, b) => a.orderDate - b.orderDate).forEach((order) => {
    const key = monthKey(order.orderDate);
    if (!months.has(key)) months.set(key, { start: new Date(order.orderDate.getFullYear(), order.orderDate.getMonth(), 1), revenue: 0, orders: 0 });
    const month = months.get(key);
    month.revenue += order.current_status === "Delivered" ? order.final_price_inr : 0;
    month.orders += 1;
  });
  const monthLabels = [...months.keys()];
  const monthStarts = [...months.values()].map((month) => month.start);

  makeChart("trendChart", {
    type: "bar",
    data: {
      labels: monthLabels,
      datasets: [
        { type: "line", label: "Orders", data: monthLabels.map((m) => months.get(m).orders), borderColor: "#0f8b8d", backgroundColor: "#0f8b8d", tension: 0.38, yAxisID: "y1", pointRadius: 4, pointHoverRadius: 7 },
        { label: "Delivered Revenue", data: monthLabels.map((m) => months.get(m).revenue), backgroundColor: "rgba(184, 50, 74, 0.82)", hoverBackgroundColor: "#b8324a", borderRadius: 8 },
      ],
    },
    options: {
      interaction: { mode: "index", intersect: false },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, ticks: { callback: (value) => `₹${Math.round(value / 100000)}L` } },
        y1: { beginAtZero: true, position: "right", grid: { drawOnChartArea: false }, ticks: {} },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${ctx.dataset.label === "Delivered Revenue" ? formatINR.format(ctx.parsed.y) : formatNum.format(ctx.parsed.y)}`,
          },
        },
      },
    },
    onPick: (label, index) => toggleMonth(monthStarts[index]),
  });

  const statusData = groupBy(filtered, (o) => o.current_status);
  makeChart("statusChart", {
    type: "doughnut",
    data: {
      labels: Object.keys(statusData),
      datasets: [{ data: Object.values(statusData), backgroundColor: chartPalette, borderWidth: 2, hoverOffset: 14 }],
    },
    options: { cutout: "64%" },
    onPick: (label) => toggleSelectFilter(els.status, label),
  });

  const categoryData = groupBy(filtered, (o) => o.product_category, (o) => o.final_price_inr);
  makeChart("categoryChart", {
    type: "bar",
    data: {
      labels: Object.keys(categoryData),
      datasets: [{ label: "Revenue", data: Object.values(categoryData), backgroundColor: chartPalette, borderRadius: 8 }],
    },
    options: {
      indexAxis: "y",
      scales: { x: { ticks: { callback: (value) => `₹${Math.round(value / 100000)}L` } } },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => `Revenue: ${formatINR.format(ctx.parsed.x)}` } },
      },
    },
    onPick: (label) => toggleSelectFilter(els.category, label),
  });

  const channelData = groupBy(filtered, (o) => o.order_channel);
  makeChart("channelChart", {
    type: "polarArea",
    data: {
      labels: Object.keys(channelData),
      datasets: [{ data: Object.values(channelData), backgroundColor: chartPalette.map((c) => `${c}cc`), hoverBackgroundColor: chartPalette }],
    },
    onPick: (label) => toggleSelectFilter(els.channel, label),
  });

  const completedByStage = stageOrder.map((stageName) => filteredStages.filter((stage) => stage.stage_name === stageName && stage.status === "Completed").length);
  makeChart("stageChart", {
    type: "bar",
    data: {
      labels: stageOrder,
      datasets: [{ label: "Completed stage records", data: completedByStage, backgroundColor: "#0f8b8d", hoverBackgroundColor: "#c7922f", borderRadius: 8 }],
    },
    options: { plugins: { legend: { display: false } } },
  });

  // The final stage is dropped: nothing follows delivery, so it has no waiting time.
  const durationStages = stageOrder.slice(0, -1);
  const durationValues = durationStages.map((stageName) => waits[stageName] || 0);
  makeChart("durationChart", {
    type: "line",
    data: {
      labels: durationStages,
      datasets: [{ label: "Avg days before next stage", data: durationValues, borderColor: "#b8324a", backgroundColor: "rgba(184,50,74,.14)", fill: true, tension: 0.32, pointRadius: 4, pointHoverRadius: 7 }],
    },
    options: {
      plugins: {
        tooltip: {
          callbacks: { label: (ctx) => `Average wait: ${ctx.parsed.y.toFixed(1)} days` },
        },
      },
    },
  });

  const countryData = groupBy(filtered, (o) => (o.customer_country === "India" ? "India" : o.customer_country));
  makeChart("geoChart", {
    type: "doughnut",
    data: {
      labels: Object.keys(countryData),
      datasets: [{ data: Object.values(countryData), backgroundColor: chartPalette, borderWidth: 2, hoverOffset: 14 }],
    },
    options: { cutout: "58%" },
  });
}

// ---------- Pipeline ----------

function renderPipeline(filtered, waits) {
  const active = filtered.filter(isActive);
  const counts = groupBy(active, (order) => order.current_stage);
  const delivered = filtered.filter((order) => order.current_status === "Delivered").length;
  const openStages = stageOrder.slice(0, -1);
  const max = Math.max(1, ...openStages.map((stage) => counts[stage] || 0));
  const bottleneck = active.length ? openStages.reduce((best, stage) => ((counts[stage] || 0) > (counts[best] || 0) ? stage : best), openStages[0]) : "";

  byId("pipeline").innerHTML = stageOrder.map((stageName, index) => {
    const isFinal = index === stageOrder.length - 1;
    const count = isFinal ? delivered : counts[stageName] || 0;
    const wait = waits[stageName];
    const classes = ["stage", isFinal ? "final" : "", stageName === bottleneck ? "bottleneck" : "", stageFilter === stageName ? "selected" : "", count ? "" : "empty"].filter(Boolean).join(" ");
    const body = `
      <span class="stage-index">${index + 1}</span>
      <span class="stage-orb" style="--fill:${isFinal ? 1 : count / max}"><b>${formatNum.format(count)}</b></span>
      <span class="stage-name">${stageName}</span>
      <span class="stage-wait">${isFinal ? "delivered" : wait ? `${wait.toFixed(1)} d avg wait` : "no data"}</span>`;
    if (isFinal) return `<li class="${classes}" style="--i:${index}"><div class="stage-node">${body}</div></li>`;
    const label = `${stageName}: ${count} active orders. ${stageFilter === stageName ? "Click to clear this filter." : "Click to filter."}`;
    return `<li class="${classes}" style="--i:${index}"><button type="button" class="stage-node" data-stage="${stageName}" aria-pressed="${stageFilter === stageName}" aria-label="${label}">${body}</button></li>`;
  }).join("");

  const callout = byId("pipelineCallout");
  if (!active.length) {
    callout.innerHTML = "No active orders in this view.";
  } else {
    const share = Math.round(((counts[bottleneck] || 0) / active.length) * 100);
    callout.innerHTML = `<span class="pulse-dot" aria-hidden="true"></span><span>Bottleneck: <strong>${bottleneck}</strong> holds ${formatNum.format(counts[bottleneck] || 0)} of ${formatNum.format(active.length)} active orders (${share}%)${waits[bottleneck] ? `, waiting ${waits[bottleneck].toFixed(1)} days on average` : ""}.</span>`;
  }
}

byId("pipeline").addEventListener("click", (event) => {
  const node = event.target.closest("[data-stage]");
  if (!node) return;
  stageFilter = stageFilter === node.dataset.stage ? "" : node.dataset.stage;
  resetOrderPaging();
  refresh();
});

// ---------- Preferences ----------

function renderPreferences(filtered) {
  const blocks = [
    ["Colors", groupBy(filtered, (o) => o.color)],
    ["Fabrics", groupBy(filtered, (o) => o.fabric)],
    ["Work Types", groupBy(filtered, (o) => o.work_type)],
  ];
  document.querySelector("#preferenceGrid").innerHTML = blocks.map(([title, data]) => {
    const rows = topEntries(data, 5);
    if (!rows.length) {
      return `<div class="pref-block"><strong>${title}</strong><p class="empty-state" style="padding:6px 0;">No data for current filters.</p></div>`;
    }
    const max = Math.max(...rows.map(([, value]) => value), 1);
    return `<div class="pref-block"><strong>${title}</strong>${rows.map(([label, value], i) => `
      <div class="pref-row">
        <span>${escapeHtml(label)}</span>
        <span class="bar"><i style="--w:${(value / max) * 100}%; --i:${i}"></i></span>
        <b>${value}</b>
      </div>`).join("")}</div>`;
  }).join("");
}

// ---------- Tables ----------

function employeeStats(name, filteredStages, filteredOrderById) {
  const assigned = filteredStages.filter((stage) => stage.assigned_employee === name);
  const handledOrderIds = new Set(assigned.map((stage) => stage.order_id));
  return {
    assigned,
    assignments: assigned.length,
    completed: assigned.filter((stage) => stage.status === "Completed").length,
    value: [...handledOrderIds].reduce((total, id) => total + (filteredOrderById.get(id)?.final_price_inr || 0), 0),
    orderIds: handledOrderIds,
  };
}

function filteredContext(filtered) {
  const filteredOrderIds = new Set(filtered.map((order) => order.order_id));
  return {
    filteredStages: stages.filter((stage) => filteredOrderIds.has(stage.order_id)),
    filteredOrderById: new Map(filtered.map((order) => [order.order_id, order])),
  };
}

function renderTeam(filtered) {
  const { filteredStages, filteredOrderById } = filteredContext(filtered);
  const search = els.teamSearch.value.trim().toLowerCase();

  let rows = employees.map((employee) => {
    const stats = employeeStats(employee.name, filteredStages, filteredOrderById);
    return { ...employee, assignments: stats.assignments, completed: stats.completed, value: stats.value };
  }).filter((employee) => !search || `${employee.name} ${employee.role} ${employee.department}`.toLowerCase().includes(search));

  rows = sortRows(rows, teamSort);
  const maxAssignments = Math.max(1, ...rows.map((row) => row.assignments));

  const tbody = document.querySelector("#teamTable");
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No employees match this search.</td></tr>`;
  } else {
    tbody.innerHTML = rows.map((employee, i) => `
      <tr class="row-in" style="--i:${Math.min(i, 14)}">
        <td><button type="button" class="person" data-employee="${escapeHtml(employee.name)}"><span class="avatar" style="--h:${hueFor(employee.name)}" aria-hidden="true">${initials(employee.name)}</span><strong>${escapeHtml(employee.name)}</strong></button></td>
        <td>${escapeHtml(employee.role)}</td>
        <td>${escapeHtml(employee.department)}</td>
        <td><span class="cell-num">${formatNum.format(employee.assignments)}</span><span class="mini-bar" aria-hidden="true"><i style="--w:${(employee.assignments / maxAssignments) * 100}%"></i></span></td>
        <td>${formatNum.format(employee.completed)}</td>
        <td>${formatINR.format(employee.value)}</td>
      </tr>
    `).join("");
  }
  updateSortIndicators(tbody.closest("table"), teamSort);
}

function statusClass(status) {
  if (status === "Delivered") return "delivered";
  if (status === "In Progress") return "progress";
  if (status === "On Hold") return "hold";
  return "cancelled";
}

function getOrderRegisterRows(filtered) {
  const search = els.orderSearch.value.trim().toLowerCase();
  const rows = filtered.filter((order) => !search || `${order.order_id} ${order.customer_name} ${order.customer_city} ${order.product_category}`.toLowerCase().includes(search));
  return sortRows(rows, orderSort);
}

function renderOrders(filtered) {
  const rows = getOrderRegisterRows(filtered);
  const visible = rows.slice(0, orderPageSize);
  const tbody = document.querySelector("#orderTable");
  const previouslyShown = tbody.querySelectorAll("tr").length;
  const isLoadMore = orderPageSize > ORDER_PAGE_STEP && visible.length > previouslyShown;

  if (!visible.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No orders match the current filters.</td></tr>`;
  } else {
    tbody.innerHTML = visible.map((order, i) => {
      // Only the newly added rows animate when loading more.
      const stagger = isLoadMore ? i - previouslyShown : i;
      const animate = stagger >= 0 ? ` class="row-in" style="--i:${Math.min(stagger, 14)}"` : "";
      return `
      <tr${animate}>
        <td><button type="button" class="order-link" data-order="${order.order_id}" aria-label="Open order ${order.order_id}">${order.order_id}</button></td>
        <td>${escapeHtml(order.customer_name)}<br><small>${escapeHtml(order.customer_city)}, ${escapeHtml(order.customer_country)}</small></td>
        <td>${escapeHtml(order.product_category)}<br><small>${escapeHtml(order.sub_type)}</small></td>
        <td>${escapeHtml(order.order_channel)}</td>
        <td><span class="badge ${statusClass(order.current_status)}">${order.current_status}</span></td>
        <td>${order.current_stage}</td>
        <td>${formatINR.format(order.final_price_inr)}</td>
      </tr>`;
    }).join("");
  }

  updateSortIndicators(tbody.closest("table"), orderSort);
  els.orderCount.textContent = rows.length ? `Showing ${formatNum.format(visible.length)} of ${formatNum.format(rows.length)} orders` : "No orders found";
  els.loadMoreOrders.style.display = visible.length < rows.length ? "" : "none";
}

function exportOrdersCsv() {
  const rows = getOrderRegisterRows(getFilteredOrders());
  const headers = ["Order ID", "Customer", "City", "Country", "Category", "Sub Type", "Channel", "Priority", "Status", "Stage", "Final Price (INR)", "Order Date"];
  const csvRow = (values) => values.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",");
  const lines = [csvRow(headers)];
  rows.forEach((order) => {
    lines.push(csvRow([
      order.order_id, order.customer_name, order.customer_city, order.customer_country,
      order.product_category, order.sub_type, order.order_channel, order.priority,
      order.current_status, order.current_stage, order.final_price_inr, order.order_date,
    ]));
  });
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `siddhi-orders-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// ---------- Filter chips and presets ----------

function datePresets() {
  const end = new Date(`${dataRange.to}T00:00:00`);
  const year = end.getFullYear();
  const clamp = (from, to) => [from < dataRange.from ? dataRange.from : from, to > dataRange.to ? dataRange.to : to];
  return {
    all: [dataRange.from, dataRange.to],
    q1: clamp(`${year}-01-01`, `${year}-03-31`),
    q2: clamp(`${year}-04-01`, `${year}-06-30`),
    "30d": clamp(isoDate(new Date(end.getFullYear(), end.getMonth(), end.getDate() - 29)), dataRange.to),
  };
}

function activePreset() {
  const presets = datePresets();
  return Object.keys(presets).find((key) => presets[key][0] === els.dateFrom.value && presets[key][1] === els.dateTo.value) || "";
}

function applyPreset(name) {
  const range = datePresets()[name];
  if (range) setDateRange(range[0], range[1]);
}

function formatRangeDate(value) {
  return value ? formatShortDate.format(new Date(`${value}T00:00:00`)) : "…";
}

function renderChips() {
  const chips = [];
  if (els.dateFrom.value !== dataRange.from || els.dateTo.value !== dataRange.to) {
    chips.push({ key: "date", label: `${formatRangeDate(els.dateFrom.value)} – ${formatRangeDate(els.dateTo.value)}` });
  }
  [["status", "Status"], ["category", "Category"], ["channel", "Channel"], ["priority", "Priority"]].forEach(([key, name]) => {
    if (els[key].value) chips.push({ key, label: `${name}: ${els[key].value}` });
  });
  if (stageFilter) chips.push({ key: "stage", label: `Waiting at: ${stageFilter}` });

  els.chips.innerHTML = chips.map((chip) => `
    <button type="button" class="chip" data-clear="${chip.key}" aria-label="Remove filter ${escapeHtml(chip.label)}">
      ${escapeHtml(chip.label)}<span aria-hidden="true">×</span>
    </button>`).join("");
  document.querySelector(".filters").classList.toggle("has-chips", chips.length > 0);
  document.dispatchEvent(new CustomEvent("filters:change", { detail: { preset: activePreset() } }));
}

els.chips.addEventListener("click", (event) => {
  const chip = event.target.closest("[data-clear]");
  if (!chip) return;
  const key = chip.dataset.clear;
  if (key === "date") {
    els.dateFrom.value = dataRange.from;
    els.dateTo.value = dataRange.to;
  } else if (key === "stage") {
    stageFilter = "";
  } else {
    els[key].value = "";
  }
  resetOrderPaging();
  refresh();
});

// ---------- Page ----------

function renderDataStrip() {
  byId("sheetOrders").textContent = formatNum.format(orders.length);
  byId("sheetStages").textContent = formatNum.format(stages.length);
  byId("sheetCustomers").textContent = formatNum.format(customers.length);
  byId("sheetEmployees").textContent = formatNum.format(employees.length);
  byId("sheetSummary").textContent = formatNum.format(summary.length);
  const completedStages = stages.filter((stage) => stage.status === "Completed").length;
  const health = Math.round((completedStages / stages.length) * 100);
  byId("healthScore").textContent = `${health}%`;
  requestAnimationFrame(() => byId("healthRing").style.setProperty("--value", health));
}

function refresh() {
  const filtered = getFilteredOrders();
  const { filteredStages } = filteredContext(filtered);
  const waits = computeStageWaits(filteredStages);
  renderKpis(filtered);
  renderCharts(filtered, filteredStages, waits);
  renderPipeline(filtered, waits);
  renderPreferences(filtered);
  renderTeam(filtered);
  renderOrders(filtered);
  renderChips();
}

function init() {
  const minDate = new Date(Math.min(...orders.map((order) => order.orderDate)));
  const maxDate = new Date(Math.max(...orders.map((order) => order.orderDate)));
  dataRange.from = minDate.toISOString().slice(0, 10);
  dataRange.to = maxDate.toISOString().slice(0, 10);
  els.dateFrom.value = dataRange.from;
  els.dateTo.value = dataRange.to;
  stageFilter = "";
  fillSelect(els.status, uniqueValues("current_status"));
  fillSelect(els.category, uniqueValues("product_category"));
  fillSelect(els.channel, uniqueValues("order_channel"));
  fillSelect(els.priority, uniqueValues("priority"));
  renderDataStrip();
  refresh();
}

function resetOrderPaging() {
  orderPageSize = ORDER_PAGE_STEP;
}

[els.dateFrom, els.dateTo, els.status, els.category, els.channel, els.priority].forEach((el) => el.addEventListener("change", () => {
  resetOrderPaging();
  refresh();
}));
els.teamSearch.addEventListener("input", () => renderTeam(getFilteredOrders()));
els.orderSearch.addEventListener("input", () => {
  resetOrderPaging();
  renderOrders(getFilteredOrders());
});
els.reset.addEventListener("click", () => {
  els.status.value = "";
  els.category.value = "";
  els.channel.value = "";
  els.priority.value = "";
  els.teamSearch.value = "";
  els.orderSearch.value = "";
  teamSort.key = "assignments";
  teamSort.dir = -1;
  orderSort.key = "order_id";
  orderSort.dir = -1;
  resetOrderPaging();
  init();
});

els.loadMoreOrders.addEventListener("click", () => {
  orderPageSize += ORDER_PAGE_STEP;
  renderOrders(getFilteredOrders());
});
els.exportOrders.addEventListener("click", exportOrdersCsv);

bindSortableHeaders(document.querySelector("#teamTable").closest("table"), teamSort, () => renderTeam(getFilteredOrders()));
bindSortableHeaders(document.querySelector("#orderTable").closest("table"), orderSort, () => renderOrders(getFilteredOrders()));

init();
