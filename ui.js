// Interaction layer: theme switching, navigation, motion effects, the detail
// drawer and the command palette. Data and rendering live in app.js, which
// loads first; both are classic scripts, so they share top-level names.

const ui = {
  root: document.documentElement,
  themeToggle: document.querySelector("#themeToggle"),
  drawer: document.querySelector("#drawer"),
  drawerBody: document.querySelector("#drawerBody"),
  palette: document.querySelector("#palette"),
  paletteInput: document.querySelector("#paletteInput"),
  paletteList: document.querySelector("#paletteList"),
  finePointer: window.matchMedia("(pointer: fine)").matches,
};

const formatDateTime = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const formatLongDate = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric" });

function days(ms) {
  const value = ms / 864e5;
  return `${value.toFixed(value < 10 ? 1 : 0)} ${value >= 0.95 && value < 1.05 ? "day" : "days"}`;
}

// ---------- Theme ----------

function syncThemeControls(theme) {
  const dark = theme === "dark";
  ui.themeToggle.querySelector(".theme-label").textContent = dark ? "Light mode" : "Dark mode";
  ui.themeToggle.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
  document.querySelector('meta[name="theme-color"]').content = dark ? "#1a1512" : "#b8324a";
}

function applyTheme(theme) {
  ui.root.dataset.theme = theme;
  try {
    localStorage.setItem("siddhi-theme", theme);
  } catch (err) {
    /* storage unavailable, theme still applies for this session */
  }
  syncThemeControls(theme);
  rethemeCharts();
}

// The new theme spreads out in a circle from the toggle.
function toggleTheme(event) {
  const next = ui.root.dataset.theme === "dark" ? "light" : "dark";
  if (!document.startViewTransition || prefersReducedMotion) {
    applyTheme(next);
    return;
  }
  const rect = ui.themeToggle.getBoundingClientRect();
  const x = event?.clientX || rect.left + rect.width / 2;
  const y = event?.clientY || rect.top + rect.height / 2;
  ui.root.style.setProperty("--vt-x", `${x}px`);
  ui.root.style.setProperty("--vt-y", `${y}px`);
  ui.root.style.setProperty("--vt-r", `${Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))}px`);
  ui.root.classList.add("theme-transition");
  const transition = document.startViewTransition(() => applyTheme(next));
  transition.finished.finally(() => ui.root.classList.remove("theme-transition"));
}

ui.themeToggle.addEventListener("click", toggleTheme);
syncThemeControls(ui.root.dataset.theme === "dark" ? "dark" : "light");

// ---------- Navigation ----------

const nav = document.querySelector(".nav-list");
const navIndicator = nav.querySelector(".nav-indicator");
const navLinks = [...nav.querySelectorAll("a")];

function moveNavIndicator() {
  const link = nav.querySelector("a.active");
  if (!link) return;
  navIndicator.style.width = `${link.offsetWidth}px`;
  navIndicator.style.height = `${link.offsetHeight}px`;
  navIndicator.style.transform = `translate(${link.offsetLeft}px, ${link.offsetTop}px)`;
}

function setActiveLink(link) {
  navLinks.forEach((item) => {
    item.classList.toggle("active", item === link);
    if (item === link) item.setAttribute("aria-current", "true");
    else item.removeAttribute("aria-current");
  });
  moveNavIndicator();
}

navLinks.forEach((link) => link.addEventListener("click", () => setActiveLink(link)));
moveNavIndicator();
requestAnimationFrame(() => nav.classList.add("ready"));
if ("ResizeObserver" in window) new ResizeObserver(moveNavIndicator).observe(nav);

const navSections = navLinks
  .map((link) => ({ link, target: document.querySelector(link.getAttribute("href")) }))
  .filter((item) => item.target);

if ("IntersectionObserver" in window) {
  const spyObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const match = navSections.find((item) => item.target === entry.target);
      if (match) setActiveLink(match.link);
    });
  }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
  navSections.forEach((item) => spyObserver.observe(item.target));
}

// ---------- Motion ----------

// Cards and panels rise into place the first time they scroll into view.
const revealTargets = document.querySelectorAll(".kpi-card, .panel, .data-strip > div");
if ("IntersectionObserver" in window && !prefersReducedMotion) {
  revealTargets.forEach((el) => el.classList.add("reveal"));
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.filter((entry) => entry.isIntersecting).forEach((entry, index) => {
      entry.target.style.setProperty("--reveal-delay", `${index * 70}ms`);
      entry.target.classList.add("in-view");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -60px 0px" });
  revealTargets.forEach((el) => revealObserver.observe(el));
}

// A soft light follows the cursor across cards.
if (ui.finePointer && !prefersReducedMotion) {
  document.addEventListener("pointermove", (event) => {
    const card = event.target.closest?.(".kpi-card, .panel");
    if (!card) return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    card.style.setProperty("--my", `${event.clientY - rect.top}px`);
  }, { passive: true });
}

// Hero: the headline arrives word by word and the scene leans toward the cursor.
const hero = document.querySelector(".hero");
const heroTitle = document.querySelector("#heroTitle");
if (!prefersReducedMotion) {
  heroTitle.innerHTML = heroTitle.textContent
    .split(" ")
    .map((word, i) => `<span class="word" style="--i:${i}">${escapeHtml(word)}</span>`)
    .join(" ");
  if (ui.finePointer) {
    hero.addEventListener("pointermove", (event) => {
      const rect = hero.getBoundingClientRect();
      hero.style.setProperty("--px", ((event.clientX - rect.left) / rect.width - 0.5).toFixed(3));
      hero.style.setProperty("--py", ((event.clientY - rect.top) / rect.height - 0.5).toFixed(3));
    });
    hero.addEventListener("pointerleave", () => {
      hero.style.setProperty("--px", 0);
      hero.style.setProperty("--py", 0);
    });
  }
}

// ---------- Date presets ----------

const presetGroup = document.querySelector(".presets");
const presetPill = presetGroup.querySelector(".preset-pill");
const presetButtons = [...presetGroup.querySelectorAll("[data-preset]")];

function updatePresets(active) {
  let current = null;
  presetButtons.forEach((button) => {
    const isActive = button.dataset.preset === active;
    button.setAttribute("aria-pressed", String(isActive));
    if (isActive) current = button;
  });
  presetPill.classList.toggle("visible", Boolean(current));
  if (current) {
    presetPill.style.width = `${current.offsetWidth}px`;
    presetPill.style.transform = `translateX(${current.offsetLeft}px)`;
  }
}

presetGroup.addEventListener("click", (event) => {
  const button = event.target.closest("[data-preset]");
  if (button) applyPreset(button.dataset.preset);
});
document.addEventListener("filters:change", (event) => updatePresets(event.detail.preset));
updatePresets(activePreset());
requestAnimationFrame(() => presetGroup.classList.add("ready"));
if ("ResizeObserver" in window) new ResizeObserver(() => updatePresets(activePreset())).observe(presetGroup);

// ---------- Dialogs ----------

function closeDialog(dialog) {
  if (!dialog.open || dialog.classList.contains("closing")) return;
  if (prefersReducedMotion) {
    dialog.close();
    return;
  }
  dialog.classList.add("closing");
  const finish = (event) => {
    if (event.target !== dialog) return;
    dialog.removeEventListener("animationend", finish);
    dialog.classList.remove("closing");
    dialog.close();
  };
  dialog.addEventListener("animationend", finish);
}

[ui.drawer, ui.palette].forEach((dialog) => {
  // Esc: animate out instead of vanishing.
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeDialog(dialog);
  });
  // A click on the backdrop lands on the dialog element itself.
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog || event.target.closest("[data-close]")) closeDialog(dialog);
  });
});

function showDrawer(html) {
  const wasOpen = ui.drawer.open;
  ui.drawerBody.innerHTML = html;
  ui.drawer.querySelector(".drawer-inner").scrollTop = 0;
  if (!wasOpen) {
    ui.drawer.showModal();
  } else if (!prefersReducedMotion) {
    ui.drawerBody.animate(
      [{ opacity: 0, transform: "translateX(18px)" }, { opacity: 1, transform: "none" }],
      { duration: 280, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
    );
  }
  // Start on the title so screen readers announce what opened, and so the key
  // that opened the drawer can't land on a button inside it.
  ui.drawer.querySelector("#drawerTitle")?.focus({ preventScroll: true });
}

// ---------- Order drawer ----------

function orderTimeline(order) {
  const stamped = stagesByOrderId.get(order.order_id) || [];
  const byName = new Map(stamped.map((stage) => [stage.stage_name, stage]));
  const stopped = stamped.find((stage) => stage.status !== "Completed");
  let nextShown = false;

  return stageOrder.map((stageName, index) => {
    const stage = byName.get(stageName);
    if (!stage) {
      const isNext = !stopped && !nextShown && order.current_status === "In Progress";
      if (isNext) nextShown = true;
      return `
        <li class="${isNext ? "next" : "todo"}" style="--i:${index}">
          <span class="dot" aria-hidden="true"></span>
          <div>
            <strong>${stageName}</strong>
            <span>${isNext ? "Up next" : stopped ? "Not reached" : "Not started"}</span>
          </div>
        </li>`;
    }
    const position = stamped.indexOf(stage);
    const following = stamped[position + 1];
    const state = stage.status === "Completed" ? "done" : stage.status === "Cancelled" ? "cancelled" : "hold";
    let wait = "";
    if (state === "cancelled") wait = "Order cancelled here";
    else if (state === "hold") wait = `On hold for ${days(dataAsOf - stage.start)}`;
    else if (following) wait = `${days(following.start - stage.start)} until the next stage`;
    else if (order.current_status === "In Progress") wait = `Waiting ${days(dataAsOf - stage.start)} so far`;
    return `
      <li class="${state}" style="--i:${index}">
        <span class="dot" aria-hidden="true"></span>
        <div>
          <strong>${stageName}</strong>
          <span><button type="button" class="link" data-employee="${escapeHtml(stage.assigned_employee)}">${escapeHtml(stage.assigned_employee)}</button> · ${escapeHtml(stage.assigned_role)}</span>
          <time datetime="${stage.start.toISOString()}">${formatDateTime.format(stage.start)}</time>
          ${wait ? `<em>${wait}</em>` : ""}
        </div>
      </li>`;
  }).join("");
}

function openOrder(orderId) {
  const order = orderById.get(orderId);
  if (!order) return;
  const stamped = stagesByOrderId.get(orderId) || [];
  const first = stamped[0];
  const last = stamped[stamped.length - 1];
  const cycle = order.current_status === "Delivered" && first && last ? `Delivered in ${days(last.start - first.start)}` : "";
  const facts = [
    ["Value", formatINR.format(order.final_price_inr)],
    ["Ordered", formatLongDate.format(order.orderDate)],
    ["Customer", `${order.customer_name}${order.is_returning_customer ? " (returning)" : ""}`],
    ["Location", `${order.customer_city}, ${order.customer_country}`],
    ["Fabric", order.fabric],
    ["Colour", order.color],
    ["Work", order.work_type],
    ["Occasion", order.occasion],
    ["Channel", order.order_channel],
    ["Sales exec", order.assigned_sales_exec],
  ];
  showDrawer(`
    <header class="drawer-head">
      <p class="eyebrow">Order ${order.order_id}</p>
      <h2 id="drawerTitle" tabindex="-1">${escapeHtml(order.sub_type)} for ${escapeHtml(order.customer_name)}</h2>
      <div class="tags">
        <span class="badge ${statusClass(order.current_status)}">${order.current_status}</span>
        <span class="tag">${escapeHtml(order.priority)} priority</span>
        ${cycle ? `<span class="tag accent">${cycle}</span>` : ""}
      </div>
    </header>
    <dl class="facts">
      ${facts.map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
    </dl>
    <h3 class="drawer-section">Journey through the eight stages</h3>
    <ol class="timeline">${orderTimeline(order)}</ol>`);
}

// ---------- Employee drawer ----------

function openEmployee(name) {
  const employee = employees.find((item) => item.name === name);
  if (!employee) return;
  const filtered = getFilteredOrders();
  const { filteredStages, filteredOrderById } = filteredContext(filtered);
  const stats = employeeStats(name, filteredStages, filteredOrderById);
  const perStage = groupBy(stats.assigned, (stage) => stage.stage_name);
  const stageRows = stageOrder.filter((stage) => perStage[stage]);
  const maxStage = Math.max(1, ...stageRows.map((stage) => perStage[stage]));
  const recent = [...stats.orderIds]
    .map((id) => orderById.get(id))
    .filter(Boolean)
    .sort((a, b) => b.orderDate - a.orderDate)
    .slice(0, 6);
  const joined = employee.joining_date ? formatLongDate.format(new Date(`${employee.joining_date}T00:00:00`)) : "";

  showDrawer(`
    <header class="drawer-head person-head">
      <span class="avatar large" style="--h:${hueFor(employee.name)}" aria-hidden="true">${initials(employee.name)}</span>
      <div>
        <p class="eyebrow">${escapeHtml(employee.department)} · ${escapeHtml(employee.employee_id || "")}</p>
        <h2 id="drawerTitle" tabindex="-1">${escapeHtml(employee.name)}</h2>
        <div class="tags">
          <span class="tag">${escapeHtml(employee.role)}</span>
          ${employee.base_location ? `<span class="tag">${escapeHtml(employee.base_location)}</span>` : ""}
          ${joined ? `<span class="tag">Joined ${joined}</span>` : ""}
        </div>
      </div>
    </header>
    <div class="stat-row">
      <div><b>${formatNum.format(stats.assignments)}</b><span>stage assignments</span></div>
      <div><b>${formatNum.format(stats.completed)}</b><span>completed</span></div>
      <div><b>${formatINR.format(stats.value)}</b><span>order value handled</span></div>
    </div>
    <p class="drawer-note">Figures follow the dashboard's current filters.</p>
    <h3 class="drawer-section">Stages handled</h3>
    ${stageRows.length ? `<div class="stage-bars">${stageRows.map((stage, i) => `
      <div class="pref-row"><span>${stage}</span><span class="bar"><i style="--w:${(perStage[stage] / maxStage) * 100}%; --i:${i}"></i></span><b>${perStage[stage]}</b></div>`).join("")}</div>` : `<p class="empty-state">No stages in the current filters.</p>`}
    <h3 class="drawer-section">Most recent orders</h3>
    ${recent.length ? `<ul class="recent-orders">${recent.map((order) => `
      <li><button type="button" data-order="${order.order_id}">
        <strong>${order.order_id}</strong>
        <span>${escapeHtml(order.customer_name)} · ${escapeHtml(order.product_category)}</span>
        <span class="badge ${statusClass(order.current_status)}">${order.current_status}</span>
      </button></li>`).join("")}</ul>` : `<p class="empty-state">No orders in the current filters.</p>`}`);
}

// Order IDs and names anywhere on the page (tables, drawer, palette) open details.
document.addEventListener("click", (event) => {
  const orderTrigger = event.target.closest("[data-order]");
  if (orderTrigger) {
    openOrder(orderTrigger.dataset.order);
    return;
  }
  const personTrigger = event.target.closest("[data-employee]");
  if (personTrigger) openEmployee(personTrigger.dataset.employee);
});

// ---------- Command palette ----------

const paletteSections = [
  ["Overview", "#overview"],
  ["Sales and categories", "#orders"],
  ["Live pipeline", "#workflow"],
  ["Customers", "#customers"],
  ["Team performance", "#team"],
  ["Order register", "#ordersRegister"],
];

const paletteActions = [
  { label: "Switch light or dark mode", hint: "Theme", run: () => toggleTheme() },
  { label: "Reset all filters", hint: "Filters", run: () => els.reset.click() },
  { label: "Show only orders in progress", hint: "Filters", run: () => { els.status.value = "In Progress"; resetOrderPaging(); refresh(); } },
  { label: "Show rush orders", hint: "Filters", run: () => { els.priority.value = "Rush"; resetOrderPaging(); refresh(); } },
  { label: "Export filtered orders as CSV", hint: "Export", run: () => exportOrdersCsv() },
];

let paletteItems = [];
let paletteIndex = 0;

function scrollToSection(selector) {
  document.querySelector(selector)?.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
}

function paletteResults(query) {
  const q = query.trim().toLowerCase();
  const has = (text) => !q || String(text).toLowerCase().includes(q);
  const results = [];
  if (q) {
    orders
      .filter((order) => has(`${order.order_id} ${order.customer_name} ${order.customer_city}`))
      .sort((a, b) => b.orderDate - a.orderDate)
      .slice(0, 6)
      .forEach((order) => results.push({
        group: "Orders",
        label: `${order.order_id} · ${order.customer_name}`,
        hint: `${order.product_category} · ${order.current_status}`,
        run: () => openOrder(order.order_id),
      }));
    employees
      .filter((employee) => has(`${employee.name} ${employee.role} ${employee.department}`))
      .slice(0, 4)
      .forEach((employee) => results.push({ group: "Team", label: employee.name, hint: employee.role, run: () => openEmployee(employee.name) }));
  }
  paletteSections
    .filter(([label]) => has(label))
    .forEach(([label, selector]) => results.push({ group: "Jump to", label, hint: "Section", run: () => scrollToSection(selector) }));
  paletteActions
    .filter((action) => has(action.label))
    .forEach((action) => results.push({ group: "Actions", ...action }));
  return results;
}

function renderPalette() {
  paletteItems = paletteResults(ui.paletteInput.value);
  paletteIndex = Math.min(paletteIndex, Math.max(paletteItems.length - 1, 0));
  if (!paletteItems.length) {
    ui.paletteList.innerHTML = `<li class="palette-empty" role="presentation">Nothing matches “${escapeHtml(ui.paletteInput.value.trim())}”.</li>`;
    ui.paletteInput.removeAttribute("aria-activedescendant");
    return;
  }
  let lastGroup = "";
  ui.paletteList.innerHTML = paletteItems.map((item, i) => {
    const heading = item.group !== lastGroup ? `<li class="palette-group" role="presentation">${item.group}</li>` : "";
    lastGroup = item.group;
    return `${heading}<li id="palette-option-${i}" role="option" class="palette-option" data-index="${i}" aria-selected="${i === paletteIndex}">
      <span>${escapeHtml(item.label)}</span><small>${escapeHtml(item.hint || "")}</small></li>`;
  }).join("");
  ui.paletteInput.setAttribute("aria-activedescendant", `palette-option-${paletteIndex}`);
  ui.paletteList.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
}

function openPalette() {
  if (ui.drawer.open) ui.drawer.close();
  ui.paletteInput.value = "";
  paletteIndex = 0;
  renderPalette();
  ui.palette.showModal();
  ui.paletteInput.focus();
}

function runPaletteItem(index) {
  const item = paletteItems[index];
  if (!item) return;
  ui.palette.close();
  item.run();
}

ui.paletteInput.addEventListener("input", () => {
  paletteIndex = 0;
  renderPalette();
});

ui.paletteInput.addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    const step = event.key === "ArrowDown" ? 1 : -1;
    paletteIndex = (paletteIndex + step + paletteItems.length) % Math.max(paletteItems.length, 1);
    renderPalette();
  } else if (event.key === "Enter") {
    event.preventDefault();
    runPaletteItem(paletteIndex);
  }
});

ui.paletteList.addEventListener("pointermove", (event) => {
  const option = event.target.closest(".palette-option");
  if (!option || Number(option.dataset.index) === paletteIndex) return;
  paletteIndex = Number(option.dataset.index);
  renderPalette();
});

ui.paletteList.addEventListener("click", (event) => {
  const option = event.target.closest(".palette-option");
  if (option) runPaletteItem(Number(option.dataset.index));
});

document.querySelector("#paletteOpen").addEventListener("click", openPalette);

const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
if (isMac) document.querySelector(".palette-trigger kbd").textContent = "⌘K";

document.addEventListener("keydown", (event) => {
  const typing = event.target.closest?.("input, select, textarea, [contenteditable]");
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    if (ui.palette.open) closeDialog(ui.palette);
    else openPalette();
  } else if (event.key === "/" && !typing && !ui.palette.open) {
    event.preventDefault();
    openPalette();
  }
});
