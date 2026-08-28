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

const formatINR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const formatNum = new Intl.NumberFormat("en-IN");
const prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const chartPalette = ["#b8324a", "#0f8b8d", "#c7922f", "#3366cc", "#267a55", "#744fc6", "#d66b38", "#596273"];
const stageOrder = ["Order Created", "Designer Assigned", "Design Approved", "Production Assigned", "Quality Check", "Packaging", "Shipping", "Delivered"];
const charts = {};

const ORDER_PAGE_STEP = 50;
let orderPageSize = ORDER_PAGE_STEP;
const teamSort = { key: "assignments", dir: -1 };
const orderSort = { key: "order_id", dir: -1 };

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
  themeToggle: document.querySelector("#themeToggle"),
  exportOrders: document.querySelector("#exportOrdersBtn"),
  loadMoreOrders: document.querySelector("#loadMoreOrders"),
  orderCount: document.querySelector("#orderCount"),
};

function byId(id) {
  return document.getElementById(id);
}

function uniqueValues(key) {
  return [...new Set(orders.map((item) => item[key]).filter(Boolean))].sort();
}

function fillSelect(select, values, label = "All") {
  select.innerHTML = [`<option value="">${label}</option>`, ...values.map((value) => `<option value="${value}">${value}</option>`)].join("");
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
    th.innerHTML = `${th.textContent}<span class="sort-arrow">↕</span>`;
    th.addEventListener("click", () => {
      if (sortState.key === th.dataset.sort) {
        sortState.dir *= -1;
      } else {
        sortState.key = th.dataset.sort;
        sortState.dir = 1;
      }
      onChange();
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
    return true;
  });
}

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
}

function makeChart(id, config) {
  if (charts[id]) charts[id].destroy();
  const userOptions = config.options || {};
  const userPlugins = userOptions.plugins || {};
  const isCircular = config.type === "doughnut" || config.type === "pie" || config.type === "polarArea";

  charts[id] = new Chart(document.getElementById(id), {
    type: config.type,
    data: config.data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 850, easing: "easeOutQuart" },
      ...userOptions,
      plugins: {
        legend: { labels: { usePointStyle: true, boxWidth: 8 }, ...(userPlugins.legend || {}) },
        tooltip: { backgroundColor: "#111820", padding: 12, cornerRadius: 8, ...(userPlugins.tooltip || {}) },
      },
      scales: isCircular ? undefined : {
        ...(userOptions.scales || {}),
        x: { grid: { display: false }, ticks: { color: "#657080" }, ...(userOptions.scales?.x || {}) },
        y: { beginAtZero: true, grid: { color: "#edf0f5" }, ticks: { color: "#657080" }, ...(userOptions.scales?.y || {}) },
      },
    },
  });
}

function renderCharts(filtered) {
  const byMonthRevenue = {};
  const byMonthOrders = {};
  filtered.forEach((order) => {
    const key = monthKey(order.orderDate);
    byMonthRevenue[key] = (byMonthRevenue[key] || 0) + (order.current_status === "Delivered" ? order.final_price_inr : 0);
    byMonthOrders[key] = (byMonthOrders[key] || 0) + 1;
  });
  const monthLabels = Object.keys(byMonthOrders);

  makeChart("trendChart", {
    type: "bar",
    data: {
      labels: monthLabels,
      datasets: [
        { type: "line", label: "Orders", data: monthLabels.map((m) => byMonthOrders[m]), borderColor: "#0f8b8d", backgroundColor: "#0f8b8d", tension: 0.38, yAxisID: "y1" },
        { label: "Delivered Revenue", data: monthLabels.map((m) => byMonthRevenue[m]), backgroundColor: "rgba(184, 50, 74, 0.82)", borderRadius: 8 },
      ],
    },
    options: {
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, ticks: { callback: (value) => `₹${Math.round(value / 100000)}L` } },
        y1: { beginAtZero: true, position: "right", grid: { drawOnChartArea: false } },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${ctx.dataset.label === "Delivered Revenue" ? formatINR.format(ctx.parsed.y) : formatNum.format(ctx.parsed.y)}`,
          },
        },
      },
    },
  });

  const statusData = groupBy(filtered, (o) => o.current_status);
  makeChart("statusChart", {
    type: "doughnut",
    data: {
      labels: Object.keys(statusData),
      datasets: [{ data: Object.values(statusData), backgroundColor: chartPalette, borderWidth: 0 }],
    },
    options: { cutout: "64%" },
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
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => `Revenue: ${formatINR.format(ctx.parsed.x)}` } },
      },
    },
  });

  const channelData = groupBy(filtered, (o) => o.order_channel);
  makeChart("channelChart", {
    type: "polarArea",
    data: {
      labels: Object.keys(channelData),
      datasets: [{ data: Object.values(channelData), backgroundColor: chartPalette.map((c) => `${c}cc`) }],
    },
  });

  const filteredOrderIds = new Set(filtered.map((order) => order.order_id));
  const filteredStages = stages.filter((stage) => filteredOrderIds.has(stage.order_id));
  const completedByStage = stageOrder.map((stageName) => filteredStages.filter((stage) => stage.stage_name === stageName && stage.status === "Completed").length);
  makeChart("stageChart", {
    type: "bar",
    data: {
      labels: stageOrder,
      datasets: [{ label: "Completed stage records", data: completedByStage, backgroundColor: "#0f8b8d", borderRadius: 8 }],
    },
    options: { plugins: { legend: { display: false } } },
  });

  const durations = {};
  filteredStages.forEach((stage) => {
    if (!stage.start || !stage.end) return;
    const hours = Math.max(0, stage.end - stage.start) / 36e5;
    durations[stage.stage_name] ||= [];
    durations[stage.stage_name].push(hours);
  });
  const durationValues = stageOrder.map((stageName) => {
    const values = durations[stageName] || [];
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length / 24 : 0;
  });
  makeChart("durationChart", {
    type: "line",
    data: {
      labels: stageOrder,
      datasets: [{ label: "Avg days", data: durationValues, borderColor: "#b8324a", backgroundColor: "rgba(184,50,74,.14)", fill: true, tension: 0.32 }],
    },
  });

  const countryData = groupBy(filtered, (o) => (o.customer_country === "India" ? "India" : o.customer_country));
  makeChart("geoChart", {
    type: "doughnut",
    data: {
      labels: Object.keys(countryData),
      datasets: [{ data: Object.values(countryData), backgroundColor: chartPalette, borderWidth: 0 }],
    },
    options: { cutout: "58%" },
  });
}

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
    return `<div class="pref-block"><strong>${title}</strong>${rows.map(([label, value]) => `
      <div class="pref-row">
        <span>${label}</span>
        <span class="bar"><i style="--w:${(value / max) * 100}%"></i></span>
        <b>${value}</b>
      </div>`).join("")}</div>`;
  }).join("");
}

function renderTeam(filtered) {
  const filteredOrderIds = new Set(filtered.map((order) => order.order_id));
  const filteredStages = stages.filter((stage) => filteredOrderIds.has(stage.order_id));
  const orderById = new Map(filtered.map((order) => [order.order_id, order]));
  const search = els.teamSearch.value.trim().toLowerCase();

  let rows = employees.map((employee) => {
    const assigned = filteredStages.filter((stage) => stage.assigned_employee === employee.name);
    const handledOrderIds = new Set(assigned.map((stage) => stage.order_id));
    const value = [...handledOrderIds].reduce((total, id) => total + (orderById.get(id)?.final_price_inr || 0), 0);
    return {
      ...employee,
      assignments: assigned.length,
      completed: assigned.filter((stage) => stage.status === "Completed").length,
      value,
    };
  }).filter((employee) => !search || `${employee.name} ${employee.role} ${employee.department}`.toLowerCase().includes(search));

  rows = sortRows(rows, teamSort);

  const tbody = document.querySelector("#teamTable");
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No employees match this search.</td></tr>`;
  } else {
    tbody.innerHTML = rows.map((employee) => `
      <tr>
        <td><strong>${employee.name}</strong></td>
        <td>${employee.role}</td>
        <td>${employee.department}</td>
        <td>${formatNum.format(employee.assignments)}</td>
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

  if (!visible.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No orders match the current filters.</td></tr>`;
  } else {
    tbody.innerHTML = visible.map((order) => `
      <tr>
        <td><strong>${order.order_id}</strong></td>
        <td>${order.customer_name}<br><small>${order.customer_city}, ${order.customer_country}</small></td>
        <td>${order.product_category}<br><small>${order.sub_type}</small></td>
        <td>${order.order_channel}</td>
        <td><span class="badge ${statusClass(order.current_status)}">${order.current_status}</span></td>
        <td>${order.current_stage}</td>
        <td>${formatINR.format(order.final_price_inr)}</td>
      </tr>
    `).join("");
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

function renderDataStrip() {
  byId("sheetOrders").textContent = formatNum.format(orders.length);
  byId("sheetStages").textContent = formatNum.format(stages.length);
  byId("sheetCustomers").textContent = formatNum.format(customers.length);
  byId("sheetEmployees").textContent = formatNum.format(employees.length);
  byId("sheetSummary").textContent = formatNum.format(summary.length);
  const completedStages = stages.filter((stage) => stage.status === "Completed").length;
  byId("healthScore").textContent = `${Math.round((completedStages / stages.length) * 100)}%`;
}

function refresh() {
  const filtered = getFilteredOrders();
  renderKpis(filtered);
  renderCharts(filtered);
  renderPreferences(filtered);
  renderTeam(filtered);
  renderOrders(filtered);
}

function init() {
  const minDate = new Date(Math.min(...orders.map((order) => order.orderDate)));
  const maxDate = new Date(Math.max(...orders.map((order) => order.orderDate)));
  els.dateFrom.value = minDate.toISOString().slice(0, 10);
  els.dateTo.value = maxDate.toISOString().slice(0, 10);
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

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("siddhi-theme", theme);
  } catch (err) {
    /* storage unavailable, theme still applies for this session */
  }
  els.themeToggle.textContent = theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";
}
els.themeToggle.addEventListener("click", () => {
  applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
});
applyTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");

document.querySelectorAll(".nav-list a").forEach((link) => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".nav-list a").forEach((item) => item.classList.remove("active"));
    link.classList.add("active");
  });
});

const navSections = [...document.querySelectorAll(".nav-list a")]
  .map((link) => ({ link, target: document.querySelector(link.getAttribute("href")) }))
  .filter((item) => item.target);

if ("IntersectionObserver" in window) {
  const spyObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const match = navSections.find((item) => item.target === entry.target);
      if (!match) return;
      navSections.forEach((item) => item.link.classList.remove("active"));
      match.link.classList.add("active");
    });
  }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
  navSections.forEach((item) => spyObserver.observe(item.target));
}

// Scroll-triggered reveal for cards/panels: animate each into place once, the
// first time it enters the viewport, instead of everything firing on load.
const revealTargets = document.querySelectorAll(".kpi-card, .panel");
if ("IntersectionObserver" in window && !prefersReducedMotion) {
  revealTargets.forEach((el) => el.classList.add("reveal"));
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("in-view");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -60px 0px" });
  revealTargets.forEach((el) => revealObserver.observe(el));
}

init();
