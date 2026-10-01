const STORAGE_KEYS = {
  works: "shiftflow-works-v2",
  shifts: "shiftflow-shifts-v2",
  settings: "shiftflow-settings-v2",
};

const COLORS = [
  "#7ec8ff",
  "#6dd3ff",
  "#6f7cff",
  "#8f7bff",
  "#c07cff",
  "#ff7ae8",
  "#ff7b7b",
  "#ffad66",
  "#ffd166",
  "#7fe7b8",
  "#3fd0a1",
  "#4fb5ff",
];

const CURRENCIES = ["₽", "$", "€", "₸", "₴", "¥", "£"];

const state = {
  activeTab: "main",
  currentMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  reportYear: new Date().getFullYear(),
  settings: loadSettings(),
  works: loadWorks(),
  shifts: loadShifts(),
  selectedDate: null,
  selectedWorkId: null,
  selectedPreset: "2/2",
  fillMode: "month",
};

function uuid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDate(dateKey) {
  return new Date(`${dateKey}T00:00:00`);
}

function formatMonthLabel(date) {
  return date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" }).replace(/^./, (s) => s.toUpperCase());
}

function monthName(date) {
  return date.toLocaleDateString("ru-RU", { month: "long" }).replace(/^./, (s) => s.toUpperCase());
}

function loadWorks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.works);
    if (!raw) {
      const demo = [
        { id: "w1", name: "Кофейня", color: "#7ec8ff", type: "hourly", hourlyRate: 260, fixedRate: 0, currency: "₽" },
        { id: "w2", name: "Тренажерный зал", color: "#8f7bff", type: "fixed", hourlyRate: 0, fixedRate: 4200, currency: "₽" },
        { id: "w3", name: "Доставка", color: "#ffad66", type: "hourly", hourlyRate: 180, fixedRate: 0, currency: "₽" },
      ];
      localStorage.setItem(STORAGE_KEYS.works, JSON.stringify(demo));
      return demo;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function loadShifts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.shifts);
    if (!raw) {
      const demo = [
        { id: uuid(), date: "2026-09-02", workId: "w1", type: "hourly", hours: 6, income: 1560, weekend: false },
        { id: uuid(), date: "2026-09-04", workId: "w2", type: "fixed", hours: 8, income: 4200, weekend: false },
        { id: uuid(), date: "2026-09-08", workId: "w1", type: "hourly", hours: 7, income: 1820, weekend: false },
        { id: uuid(), date: "2026-09-14", workId: "w3", type: "hourly", hours: 5, income: 900, weekend: false },
        { id: uuid(), date: "2026-10-03", workId: "w1", type: "hourly", hours: 7, income: 1820, weekend: false },
        { id: uuid(), date: "2026-10-04", workId: "w2", type: "fixed", hours: 8, income: 4200, weekend: false },
        { id: uuid(), date: "2026-10-10", workId: "w3", type: "hourly", hours: 4, income: 720, weekend: true },
      ];
      localStorage.setItem(STORAGE_KEYS.shifts, JSON.stringify(demo));
      return demo;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.settings);
    if (!raw) {
      const value = { theme: "light" };
      localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(value));
      return value;
    }
    return JSON.parse(raw);
  } catch {
    return { theme: "light" };
  }
}

function saveWorks() {
  localStorage.setItem(STORAGE_KEYS.works, JSON.stringify(state.works));
}

function saveShifts() {
  localStorage.setItem(STORAGE_KEYS.shifts, JSON.stringify(state.shifts));
}

function saveSettings() {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(state.settings));
}

function vibrate(pattern) {
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

function getWorkById(id) {
  return state.works.find((work) => work.id === id) || null;
}

function getShiftForDate(dateKey) {
  return state.shifts.find((shift) => shift.date === dateKey) || null;
}

function isWeekendDate(date) {
  return date.getDay() === 0 || date.getDay() === 6;
}

function currencyFormat(value, currency = "₽") {
  return `${Number(value || 0).toLocaleString("ru-RU")} ${currency}`;
}

function setTheme(theme) {
  state.settings.theme = theme;
  document.body.dataset.theme = theme;
  saveSettings();
  const toggle = document.getElementById("themeToggle");
  if (toggle) {
    toggle.querySelector(".theme-icon").textContent = theme === "dark" ? "🌙" : "☀️";
  }
}

function triggerThemeReveal(x, y) {
  const reveal = document.getElementById("themeReveal");
  reveal.style.setProperty("--x", `${x}px`);
  reveal.style.setProperty("--y", `${y}px`);
  reveal.classList.remove("animate");
  void reveal.offsetWidth;
  reveal.classList.add("animate");
}

function setTab(tabName) {
  state.activeTab = tabName;
  document.querySelectorAll(".page-view").forEach((page) => {
    page.classList.toggle("hidden", page.id !== `page-${tabName}`);
  });

  document.querySelectorAll(".tab-item").forEach((button) => {
    const isActive = button.dataset.tab === tabName;
    button.classList.toggle("active", isActive);
  });

  const indicator = document.querySelector(".tab-indicator");
  if (indicator) {
    indicator.setAttribute("data-active", tabName);
  }
}

function renderMainCalendar() {
  const grid = document.getElementById("calendarGrid");
  if (!grid) return;

  const year = state.currentMonth.getFullYear();
  const month = state.currentMonth.getMonth();
  const monthStart = new Date(year, month, 1);
  const startOffset = (monthStart.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();
  const todayKey = getDateKey(new Date());

  const cells = [];

  for (let i = 0; i < startOffset; i += 1) {
    const date = new Date(year, month - 1, prevMonthDays - startOffset + i + 1);
    cells.push({ date, empty: true });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    cells.push({ date, empty: false });
  }

  while (cells.length % 7 !== 0) {
    const nextDay = cells.length - (daysInMonth + startOffset) + 1;
    cells.push({ date: new Date(year, month + 1, nextDay), empty: true });
  }

  grid.innerHTML = cells.map(({ date, empty }) => {
    const key = getDateKey(date);
    const shift = getShiftForDate(key);
    const work = shift ? getWorkById(shift.workId) : null;
    const isToday = key === todayKey;
    const isWeekend = isWeekendDate(date);
    const title = shift && work ? `${work.name} · ${shift.hours}h` : "";

    return `
      <button
        class="day-cell ${empty ? "empty" : ""} ${isWeekend ? "weekend" : ""} ${isToday ? "today" : ""}"
        data-date="${key}"
        type="button"
        title="${title}"
      >
        <span class="day-number">${date.getDate()}</span>
        ${shift && work ? `
          <div class="day-shift" style="--shift-color: ${work.color};">
            <strong>${work.name}</strong>
            <small>${shift.hours}h • ${currencyFormat(shift.income, work.currency)}</small>
          </div>
        ` : ""}
      </button>
    `;
  }).join("");

  grid.querySelectorAll(".day-cell:not(.empty)").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      openShiftSheet(button.dataset.date);
    });

    button.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      const dateKey = button.dataset.date;
      const shift = getShiftForDate(dateKey);
      if (shift) {
        removeShiftByDate(dateKey);
      }
    });
  });
}

function renderMainStats() {
  const statsContainer = document.getElementById("mainStats");
  if (!statsContainer) return;

  const totalHours = state.shifts
    .filter((shift) => shift.date.startsWith(`${state.currentMonth.getFullYear()}-${String(state.currentMonth.getMonth() + 1).padStart(2, "0")}`))
    .reduce((sum, shift) => sum + Number(shift.hours || 0), 0);

  const totalShifts = state.shifts.filter((shift) => shift.date.startsWith(`${state.currentMonth.getFullYear()}-${String(state.currentMonth.getMonth() + 1).padStart(2, "0")}`)).length;
  const totalIncome = state.shifts.filter((shift) => shift.date.startsWith(`${state.currentMonth.getFullYear()}-${String(state.currentMonth.getMonth() + 1).padStart(2, "0")}`)).reduce((sum, shift) => sum + Number(shift.income || 0), 0);

  const cards = [
    { icon: "⏱", title: "Часы", value: totalHours },
    { icon: "📅", title: "Смены", value: totalShifts },
    { icon: "💰", title: "Доход", value: currencyFormat(totalIncome, "₽") },
  ];

  statsContainer.innerHTML = cards.map((card) => `
    <article class="stat-card">
      <div class="stat-top">
        <div class="stat-badge">${card.icon}</div>
        <span>${card.title}</span>
      </div>
      <strong>${card.value}</strong>
    </article>
  `).join("");
}

function buildMonthlyReportData(year) {
  const months = [];
  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    const monthDate = new Date(year, monthIndex, 1);
    const monthKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
    const monthShifts = state.shifts.filter((shift) => shift.date.startsWith(monthKey));
    const income = monthShifts.reduce((sum, shift) => sum + Number(shift.income || 0), 0);
    const shifts = monthShifts.length;
    const hours = monthShifts.reduce((sum, shift) => sum + Number(shift.hours || 0), 0);
    const weekends = monthShifts.filter((shift) => {
      const date = toDate(shift.date);
      return isWeekendDate(date);
    }).length;

    months.push({
      label: monthName(monthDate),
      income,
      shifts,
      hours,
      weekends,
      key: monthKey,
    });
  }
  return months;
}

function renderReports() {
  const summary = buildMonthlyReportData(state.reportYear);
  const reportCards = document.getElementById("reportMonthCards");
  const chart = document.getElementById("incomeChart");
  const yearLabel = document.getElementById("reportYearLabel");
  const yearSummary = document.getElementById("yearSummary");
  const yearSummaryTitle = document.getElementById("yearSummaryTitle");

  if (yearLabel) {
    yearLabel.textContent = String(state.reportYear);
  }

  if (yearSummaryTitle) {
    yearSummaryTitle.textContent = String(state.reportYear);
  }

  if (reportCards) {
    reportCards.innerHTML = summary.map((item) => `
      <article class="month-card glass-panel">
        <h3>${item.label}</h3>
        <div class="month-metrics">
          <div class="metric-box">
            <small>Доход</small>
            <strong>${currencyFormat(item.income, "₽")}</strong>
          </div>
          <div class="metric-box">
            <small>Смен</small>
            <strong>${item.shifts}</strong>
          </div>
          <div class="metric-box">
            <small>Часов</small>
            <strong>${item.hours}</strong>
          </div>
          <div class="metric-box">
            <small>Выходные</small>
            <strong>${item.weekends}</strong>
          </div>
        </div>
      </article>
    `).join("");
  }

  if (chart) {
    const max = Math.max(...summary.map((item) => item.income), 1);
    chart.innerHTML = summary.map((item) => `
      <div class="bar-column">
        <div class="bar-wrap">
          <div class="bar" style="height:${Math.max((item.income / max) * 100, 12)}%"></div>
        </div>
        <span class="bar-label">${item.label.slice(0, 3)}</span>
      </div>
    `).join("");
  }

  if (yearSummary) {
    const totalIncome = summary.reduce((sum, item) => sum + item.income, 0);
    const totalShifts = summary.reduce((sum, item) => sum + item.shifts, 0);
    const totalHours = summary.reduce((sum, item) => sum + item.hours, 0);
    const totalWeekends = summary.reduce((sum, item) => sum + item.weekends, 0);

    yearSummary.innerHTML = [
      { label: "Доход", value: currencyFormat(totalIncome, "₽") },
      { label: "Смен", value: totalShifts },
      { label: "Часов", value: totalHours },
      { label: "Выходных", value: totalWeekends },
    ].map((item) => `
      <div class="summary-item">
        <small>${item.label}</small>
        <strong>${item.value}</strong>
      </div>
    `).join("");
  }
}

function renderWorksList() {
  const worksList = document.getElementById("worksList");
  if (!worksList) return;

  worksList.innerHTML = state.works.map((work) => `
    <article class="work-card" data-id="${work.id}">
      <div class="work-head">
        <div class="work-title-wrap">
          <span class="work-color-dot" style="background:${work.color};"></span>
          <strong>${work.name || "Новая работа"}</strong>
        </div>
        <button class="delete-work-btn" data-delete-id="${work.id}" type="button">Удалить</button>
      </div>

      <div class="work-grid">
        <div class="field-row">
          <div class="field-group">
            <label>Наименование</label>
            <input data-field="name" data-id="${work.id}" value="${escapeHtml(work.name || "")}" />
          </div>
          <div class="field-group">
            <label>Валюта</label>
            <select data-field="currency" data-id="${work.id}">
              ${CURRENCIES.map((currency) => `<option value="${currency}" ${currency === work.currency ? "selected" : ""}>${currency}</option>`).join("")}
            </select>
          </div>
        </div>

        <div class="field-group">
          <label>Цвет</label>
          <div class="swatches">
            ${COLORS.map((color) => `
              <button
                type="button"
                class="color-swatch ${work.color === color ? "selected" : ""}"
                data-color="${color}"
                data-id="${work.id}"
                style="background:${color};"
                aria-label="Выбрать цвет ${color}"
              ></button>
            `).join("")}
          </div>
        </div>

        <div class="field-group">
          <label>Тип ставки</label>
          <div class="type-switch">
            <button type="button" class="${work.type === "hourly" ? "active" : ""}" data-type="hourly" data-id="${work.id}">Почасовая</button>
            <button type="button" class="${work.type === "fixed" ? "active" : ""}" data-type="fixed" data-id="${work.id}">Фиксированная</button>
          </div>
        </div>

        <div class="field-row">
          <div class="field-group">
            <label>${work.type === "hourly" ? "Часовая ставка" : "Фиксированная ставка"}</label>
            <input
              data-field="${work.type === "hourly" ? "hourlyRate" : "fixedRate"}"
              data-id="${work.id}"
              type="number"
              min="0"
              step="1"
              value="${work.type === "hourly" ? work.hourlyRate || 0 : work.fixedRate || 0}"
            />
          </div>
          <div class="field-group">
            <label>Ставка</label>
            <input
              data-field="${work.type === "hourly" ? "fixedRate" : "hourlyRate"}"
              data-id="${work.id}"
              type="number"
              min="0"
              step="1"
              value="${work.type === "hourly" ? work.fixedRate || 0 : work.hourlyRate || 0}"
              readonly
            />
          </div>
        </div>
      </div>
    </article>
  `).join("");

  worksList.querySelectorAll(".color-swatch").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.id;
      const color = button.dataset.color;
      const work = state.works.find((item) => item.id === id);
      if (!work) return;
      work.color = color;
      saveWorks();
      renderWorksList();
      vibrate([25]);
    });
  });

  worksList.querySelectorAll("[data-type]").forEach((button) => {
    button.addEventListener("click", () => {
      const work = state.works.find((item) => item.id === button.dataset.id);
      if (!work) return;
      work.type = button.dataset.type;
      saveWorks();
      renderWorksList();
      vibrate([20]);
    });
  });

  worksList.querySelectorAll("input[data-field]").forEach((input) => {
    input.addEventListener("input", () => {
      const work = state.works.find((item) => item.id === input.dataset.id);
      if (!work) return;

      const key = input.dataset.field;
      const value = input.value;
      if (key === "name") {
        work.name = value;
      } else if (key === "currency") {
        work.currency = value;
      } else if (key === "hourlyRate") {
        work.hourlyRate = Number(value || 0);
      } else if (key === "fixedRate") {
        work.fixedRate = Number(value || 0);
      }

      saveWorks();
    });
  });

  worksList.querySelectorAll("[data-delete-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.deleteId;
      state.works = state.works.filter((item) => item.id !== id);
      state.shifts = state.shifts.filter((shift) => shift.workId !== id);
      saveWorks();
      saveShifts();
      renderWorksList();
      renderMainCalendar();
      renderMainStats();
      renderReports();
      vibrate([30, 30, 30]);
    });
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function openShiftSheet(dateKey) {
  state.selectedDate = dateKey;
  const sheet = document.getElementById("shiftSheet");
  const backdrop = document.getElementById("sheetBackdrop");
  const select = document.getElementById("shiftWorkSelect");
  const hoursInput = document.getElementById("shiftHoursInput");
  const liveIncome = document.getElementById("liveIncomeValue");
  const hourlyFields = document.getElementById("hourlyFields");
  const fixedFields = document.getElementById("fixedFields");

  if (!sheet || !select || !hoursInput || !liveIncome) return;

  const workOptions = state.works.map((work) => `
    <option value="${work.id}">${work.name}</option>
  `).join("");
  select.innerHTML = workOptions;

  const existing = getShiftForDate(dateKey);
  state.selectedWorkId = existing ? existing.workId : (state.works[0] ? state.works[0].id : "");
  if (state.selectedWorkId) {
    select.value = state.selectedWorkId;
  }

  const work = getWorkById(state.selectedWorkId);
  if (work) {
    hoursInput.value = existing && existing.type === "hourly" ? (existing.hours || 8) : 8;
    updateLiveIncome();
  }

  const showHourly = work ? work.type === "hourly" : true;
  hourlyFields.classList.toggle("hidden", !showHourly);
  fixedFields.classList.toggle("hidden", showHourly);

  sheet.classList.remove("hidden");
  backdrop.classList.remove("hidden");
  sheet.setAttribute("aria-hidden", "false");
  backdrop.setAttribute("aria-hidden", "false");

  select.onchange = () => {
    state.selectedWorkId = select.value;
    const selectedWork = getWorkById(state.selectedWorkId);
    if (!selectedWork) return;
    const haveExisting = getShiftForDate(dateKey);
    const isHourly = selectedWork.type === "hourly";
    hourlyFields.classList.toggle("hidden", !isHourly);
    fixedFields.classList.toggle("hidden", isHourly);
    hoursInput.value = haveExisting && haveExisting.type === "hourly" ? haveExisting.hours || 8 : 8;
    updateLiveIncome();
  };

  hoursInput.oninput = updateLiveIncome;
  document.getElementById("fixedShiftBtn").onclick = () => applyShiftToDate(false);
  document.getElementById("weekendBtn").onclick = () => applyShiftToDate(true);
}

function updateLiveIncome() {
  const hoursInput = document.getElementById("shiftHoursInput");
  const liveIncome = document.getElementById("liveIncomeValue");
  const select = document.getElementById("shiftWorkSelect");
  if (!hoursInput || !liveIncome || !select) return;

  const work = getWorkById(select.value);
  if (!work) return;

  const hours = Number(hoursInput.value || 0);
  const income = work.hourlyRate * hours;
  liveIncome.textContent = currencyFormat(income, work.currency);
}

function applyShiftToDate(isWeekend) {
  const dateKey = state.selectedDate;
  if (!dateKey) return;

  const work = getWorkById(state.selectedWorkId || document.getElementById("shiftWorkSelect")?.value);
  if (!work) return;

  const shiftHours = Number(document.getElementById("shiftHoursInput")?.value || 0);

  if (isWeekend) {
    const existing = getShiftForDate(dateKey);
    if (existing) {
      state.shifts = state.shifts.filter((shift) => shift.date !== dateKey);
    }
    state.shifts.push({
      id: uuid(),
      date: dateKey,
      workId: work.id,
      type: work.type,
      hours: 0,
      income: 0,
      weekend: true,
    });
  } else {
    const income = work.type === "hourly" ? shiftHours * work.hourlyRate : work.fixedRate;
    state.shifts = state.shifts.filter((shift) => shift.date !== dateKey);
    state.shifts.push({
      id: uuid(),
      date: dateKey,
      workId: work.id,
      type: work.type,
      hours: work.type === "hourly" ? shiftHours : 8,
      income,
      weekend: false,
    });
  }

  saveShifts();
  renderMainCalendar();
  renderMainStats();
  renderReports();
  closeSheet();
  vibrate([18]);
}

function removeShiftByDate(dateKey) {
  state.shifts = state.shifts.filter((shift) => shift.date !== dateKey);
  saveShifts();
  renderMainCalendar();
  renderMainStats();
  renderReports();
  vibrate([25]);
}

function closeSheet() {
  document.getElementById("shiftSheet")?.classList.add("hidden");
  document.getElementById("graphSheet")?.classList.add("hidden");
  document.getElementById("sheetBackdrop")?.classList.add("hidden");
}

function openGraphSheet() {
  const sheet = document.getElementById("graphSheet");
  const backdrop = document.getElementById("sheetBackdrop");
  const workSelect = document.getElementById("graphWorkSelect");
  if (!sheet || !backdrop || !workSelect) return;

  workSelect.innerHTML = state.works.map((work) => `
    <option value="${work.id}">${work.name}</option>
  `).join("");

  const today = new Date();
  const input = document.getElementById("graphStartDate");
  if (input) {
    input.value = getDateKey(today);
  }

  sheet.classList.remove("hidden");
  backdrop.classList.remove("hidden");
  sheet.setAttribute("aria-hidden", "false");
  backdrop.setAttribute("aria-hidden", "false");
}

function applyGraphPreset() {
  const workId = document.getElementById("graphWorkSelect")?.value;
  const work = getWorkById(workId);
  if (!work) return;

  const startDate = document.getElementById("graphStartDate")?.value;
  if (!startDate) return;

  const baseDate = new Date(`${startDate}T00:00:00`);
  const fillMode = state.fillMode || "month";
  const preset = state.selectedPreset || "2/2";
  let shiftsCount = 0;

  let cycle = [];
  if (preset === "2/2") {
    cycle = [1, 1, 0, 0];
  } else if (preset === "3/3") {
    cycle = [1, 1, 1, 0, 0, 0];
  } else if (preset === "4/3") {
    cycle = [1, 1, 1, 1, 0, 0, 0];
  } else if (preset === "5/2") {
    cycle = [1, 1, 1, 1, 1, 0, 0];
  } else {
    const seq = Number(document.getElementById("shiftSequenceInput")?.value || 3);
    const rest = Number(document.getElementById("restSequenceInput")?.value || 2);
    for (let i = 0; i < seq; i += 1) cycle.push(1);
    for (let i = 0; i < rest; i += 1) cycle.push(0);
  }

  const limitDate = fillMode === "week"
    ? new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + 7)
    : new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);

  const generated = [];
  let cursor = new Date(baseDate);
  while (cursor <= limitDate) {
    const dayIndex = (cursor.getTime() - baseDate.getTime()) / 86400000;
    const patternIndex = Math.floor(dayIndex) % cycle.length;
    const isWorkDay = cycle[patternIndex] === 1;
    if (isWorkDay) {
      generated.push({
        id: uuid(),
        date: getDateKey(cursor),
        workId: work.id,
        type: work.type,
        hours: Number(document.getElementById("graphHoursInput")?.value || 8),
        income: work.type === "hourly" ? Number(document.getElementById("graphHoursInput")?.value || 8) * work.hourlyRate : work.fixedRate,
        weekend: false,
      });
      shiftsCount += 1;
    }
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
  }

  state.shifts = state.shifts.filter((shift) => {
    const isDuplicate = generated.some((item) => item.date === shift.date);
    return !isDuplicate;
  });

  generated.forEach((shift) => state.shifts.push(shift));
  saveShifts();
  renderMainCalendar();
  renderMainStats();
  renderReports();
  closeSheet();
  vibrate([18, 25, 18]);
}

function bindEvents() {
  document.querySelectorAll(".tab-item").forEach((button) => {
    button.addEventListener("click", () => {
      setTab(button.dataset.tab);
      vibrate([10]);
    });
  });

  document.getElementById("prevMonth")?.addEventListener("click", () => {
    state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() - 1, 1);
    renderMainCalendar();
    renderMainStats();
    vibrate([15]);
  });

  document.getElementById("nextMonth")?.addEventListener("click", () => {
    state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() + 1, 1);
    renderMainCalendar();
    renderMainStats();
    vibrate([15]);
  });

  document.getElementById("reportPrevYear")?.addEventListener("click", () => {
    state.reportYear -= 1;
    renderReports();
    vibrate([10]);
  });

  document.getElementById("reportNextYear")?.addEventListener("click", () => {
    state.reportYear += 1;
    renderReports();
    vibrate([10]);
  });

  document.getElementById("addWorkBtn")?.addEventListener("click", () => {
    state.works.push({
      id: uuid(),
      name: "Новая работа",
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      type: "hourly",
      hourlyRate: 220,
      fixedRate: 0,
      currency: "₽",
    });
    saveWorks();
    renderWorksList();
    vibrate([20]);
  });

  document.getElementById("themeToggle")?.addEventListener("click", (event) => {
    const nextTheme = state.settings.theme === "dark" ? "light" : "dark";
    const rect = event.currentTarget.getBoundingClientRect();
    triggerThemeReveal(rect.left + rect.width / 2, rect.top + rect.height / 2);
    setTheme(nextTheme);
    vibrate([18]);
  });

  document.getElementById("sheetBackdrop")?.addEventListener("click", closeSheet);
  document.getElementById("closeShiftSheet")?.addEventListener("click", closeSheet);
  document.getElementById("closeGraphSheet")?.addEventListener("click", closeSheet);
  document.getElementById("graphPresetBtn")?.addEventListener("click", openGraphSheet);

  document.querySelectorAll(".preset-btn").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedPreset = button.dataset.preset;
      document.querySelectorAll(".preset-btn").forEach((node) => node.classList.toggle("active", node === button));
      const custom = document.getElementById("customConfig");
      if (custom) {
        custom.classList.toggle("hidden", state.selectedPreset !== "custom");
      }
      vibrate([12]);
    });
  });

  document.querySelectorAll(".segment-btn").forEach((button) => {
    button.addEventListener("click", () => {
      state.fillMode = button.dataset.fill;
      document.querySelectorAll(".segment-btn").forEach((node) => node.classList.toggle("active", node === button));
      vibrate([8]);
    });
  });

  document.getElementById("applyGraphBtn")?.addEventListener("click", () => {
    applyGraphPreset();
    vibrate([20]);
  });
}

function initialize() {
  if (!state.works.length) {
    state.works = [
      { id: "w1", name: "Кофейня", color: "#7ec8ff", type: "hourly", hourlyRate: 260, fixedRate: 0, currency: "₽" },
      { id: "w2", name: "Тренажерный зал", color: "#8f7bff", type: "fixed", hourlyRate: 0, fixedRate: 4200, currency: "₽" },
      { id: "w3", name: "Доставка", color: "#ffad66", type: "hourly", hourlyRate: 180, fixedRate: 0, currency: "₽" },
    ];
    saveWorks();
  }

  state.selectedWorkId = state.works[0]?.id || null;
  document.getElementById("monthLabel").textContent = formatMonthLabel(state.currentMonth);
  setTheme(state.settings.theme || "light");
  setTab("main");
  renderMainCalendar();
  renderMainStats();
  renderReports();
  renderWorksList();
  bindEvents();
}

initialize();

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("monthLabel").textContent = formatMonthLabel(state.currentMonth);
});

window.addEventListener("resize", () => {
  const indicator = document.querySelector(".tab-indicator");
  if (indicator) {
    indicator.setAttribute("data-active", state.activeTab);
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeSheet();
  }
});

window.addEventListener("beforeunload", () => {
  saveWorks();
  saveShifts();
  saveSettings();
});

setTimeout(() => {
  const indicator = document.querySelector(".tab-indicator");
  if (indicator) indicator.setAttribute("data-active", state.activeTab);
}, 30);






































































































































