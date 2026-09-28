const STORAGE_KEY = "shiftflow-data-v1";
const SETTINGS_KEY = "shiftflow-settings-v1";

const defaultSettings = {
  lang: "ru",
  theme: "light"
};

const state = {
  currentMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  reportMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  selectedDate: null,
  settings: loadSettings(),
  shifts: loadShifts(),
  page: "main"
};

function loadShifts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveShifts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.shifts));
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...defaultSettings };
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return { ...defaultSettings };
  }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
}

function getKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function setTheme() {
  const currentTheme = state.settings.theme;
  document.body.classList.toggle("dark", currentTheme === "dark");
  if (currentTheme === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.body.classList.toggle("dark", prefersDark);
  }
}

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString()} ₽`;
}

function getMonthStats(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const arr = Object.entries(state.shifts).filter(([key]) => {
    const d = new Date(`${key}T00:00:00`);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  let totalHours = 0;
  let totalIncome = 0;
  let totalShifts = 0;

  arr.forEach(([, item]) => {
    if (item.weekend) return;
    totalHours += Number(item.hours || 0);
    totalIncome += Number(item.income || 0);
    totalShifts += 1;
  });

  return { totalHours, totalIncome, totalShifts };
}

function renderCalendar() {
  const grid = document.getElementById("calendarGrid");
  const monthLabel = document.getElementById("monthLabel");
  if (!grid || !monthLabel) return;

  monthLabel.textContent = state.currentMonth.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });

  const year = state.currentMonth.getFullYear();
  const month = state.currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const startDayIndex = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const stats = getMonthStats(state.currentMonth);
  document.getElementById("totalHours").textContent = stats.totalHours.toString();
  document.getElementById("totalShifts").textContent = stats.totalShifts.toString();
  document.getElementById("totalIncome").textContent = formatMoney(stats.totalIncome);

  grid.innerHTML = "";

  const prevMonthDays = new Date(year, month, 0).getDate();

  for (let i = 0; i < startDayIndex; i++) {
    const date = new Date(year, month - 1, prevMonthDays - startDayIndex + i + 1);
    const cell = document.createElement("div");
    cell.className = "calendar-day empty";
    cell.innerHTML = `<span class="day-number">${date.getDate()}</span>`;
    grid.appendChild(cell);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const key = getKey(date);
    const shift = state.shifts[key];
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "calendar-day";

    if (date.getDay() === 0 || date.getDay() === 6) {
      cell.classList.add("weekend");
    }

    if (shift) {
      cell.classList.add("shift-added");
      const label = shift.weekend ? "Выходной" : shift.name || "Смена";
      cell.innerHTML = `
        <span class="day-number">${day}</span>
        <span class="day-badge">${label}</span>
      `;
    } else {
      cell.innerHTML = `<span class="day-number">${day}</span>`;
    }

    cell.addEventListener("click", () => openShiftModal(key));
    grid.appendChild(cell);
  }

  const totalCells = grid.children.length;
  const remaining = (7 - (totalCells % 7)) % 7;
  for (let i = 0; i < remaining; i++) {
    const cell = document.createElement("div");
    cell.className = "calendar-day empty";
    cell.innerHTML = `<span class="day-number">${i + 1}</span>`;
    grid.appendChild(cell);
  }
}

function renderReports() {
  const summaryEl = document.getElementById("reportSummary");
  if (!summaryEl) return;

  const months = getMonthlySummary();
  if (!months.length) {
    summaryEl.innerHTML = '<div class="empty-state">Нет данных за период.</div>';
    return;
  }

  summaryEl.innerHTML = months.map((item) => `
    <div class="report-card glass-panel">
      <h3>${item.label}</h3>
      <div class="report-grid">
        <div class="report-item">
          <span>Часы</span>
          <strong>${item.hours}</strong>
        </div>
        <div class="report-item">
          <span>Смены</span>
          <strong>${item.shifts}</strong>
        </div>
        <div class="report-item">
          <span>Доход</span>
          <strong>${formatMoney(item.income)}</strong>
        </div>
      </div>
    </div>
  `).join("");
}

function getMonthlySummary() {
  const months = new Set();

  Object.keys(state.shifts).forEach((key) => {
    const date = new Date(`${key}T00:00:00`);
    months.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  });

  return [...months].sort().map((key) => {
    const [year, month] = key.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    const entries = Object.entries(state.shifts).filter(([dateKey]) => {
      const d = new Date(`${dateKey}T00:00:00`);
      return d.getFullYear() === Number(year) && d.getMonth() === Number(month) - 1;
    });

    let hours = 0;
    let income = 0;
    let shifts = 0;

    entries.forEach(([, item]) => {
      if (item.weekend) return;
      hours += Number(item.hours || 0);
      income += Number(item.income || 0);
      shifts += 1;
    });

    return {
      label: date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" }),
      hours,
      shifts,
      income
    };
  });
}

function openShiftModal(dateKey) {
  const modal = document.getElementById("shiftModal");
  const form = document.getElementById("shiftForm");
  const deleteBtn = document.getElementById("deleteShiftBtn");
  const dateLabel = document.getElementById("modalDateLabel");
  const shiftName = document.getElementById("shiftName");
  const shiftHours = document.getElementById("shiftHours");
  const shiftIncome = document.getElementById("shiftIncome");
  const isWeekend = document.getElementById("isWeekend");

  const date = new Date(`${dateKey}T00:00:00`);
  dateLabel.textContent = date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

  const existing = state.shifts[dateKey];
  if (existing) {
    shiftName.value = existing.name || "";
    shiftHours.value = existing.hours || "";
    shiftIncome.value = existing.income || "";
    isWeekend.checked = !!existing.weekend;
    deleteBtn.classList.remove("hidden");
  } else {
    shiftName.value = "";
    shiftHours.value = "";
    shiftIncome.value = "";
    isWeekend.checked = false;
    deleteBtn.classList.add("hidden");
  }

  state.selectedDate = dateKey;
  form.dataset.date = dateKey;
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function closeShiftModal() {
  const modal = document.getElementById("shiftModal");
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  state.selectedDate = null;
}

function saveShift(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const dateKey = form.dataset.date;
  if (!dateKey) return;

  const name = document.getElementById("shiftName").value.trim();
  const hours = Number(document.getElementById("shiftHours").value || 0);
  const income = Number(document.getElementById("shiftIncome").value || 0);
  const weekend = document.getElementById("isWeekend").checked;

  if (weekend) {
    state.shifts[dateKey] = { name: "Выходной", hours: 0, income: 0, weekend: true };
  } else if (!name && hours === 0 && income === 0) {
    delete state.shifts[dateKey];
  } else {
    state.shifts[dateKey] = { name: name || "Смена", hours, income, weekend: false };
  }

  saveShifts();
  renderCalendar();
  renderReports();
  closeShiftModal();
}

function deleteShift() {
  if (!state.selectedDate) return;
  delete state.shifts[state.selectedDate];
  saveShifts();
  renderCalendar();
  renderReports();
  closeShiftModal();
}

function setPage(page) {
  state.page = page;
  document.getElementById("mainPage").classList.toggle("hidden", page !== "main");
  document.getElementById("reportsPage").classList.toggle("hidden", page !== "reports");
  document.getElementById("settingsPage").classList.toggle("hidden", page !== "settings");

  document.querySelectorAll(".bottom-nav-link").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.page === page);
  });
}

function updateModeButtons() {
  document.querySelectorAll("[data-lang]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === state.settings.lang);
  });

  document.querySelectorAll("[data-theme]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.theme === state.settings.theme);
  });
}

function bindSettings() {
  document.querySelectorAll("[data-lang]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.settings.lang = btn.dataset.lang;
      saveSettings();
      updateModeButtons();
    });
  });

  document.querySelectorAll("[data-theme]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.settings.theme = btn.dataset.theme;
      saveSettings();
      setTheme();
      updateModeButtons();
    });
  });

  const termsBtn = document.getElementById("openTermsBtn");
  const termsModal = document.getElementById("termsModal");
  const closeTermsBtn = document.getElementById("closeTermsBtn");

  if (termsBtn && termsModal && closeTermsBtn) {
    termsBtn.addEventListener("click", () => {
      termsModal.classList.remove("hidden");
      termsModal.setAttribute("aria-hidden", "false");
    });

    closeTermsBtn.addEventListener("click", () => {
      termsModal.classList.add("hidden");
      termsModal.setAttribute("aria-hidden", "true");
    });

    termsModal.addEventListener("click", (event) => {
      if (event.target === event.currentTarget) {
        termsModal.classList.add("hidden");
        termsModal.setAttribute("aria-hidden", "true");
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setTheme();
  bindSettings();
  updateModeButtons();
  renderCalendar();
  renderReports();

  document.getElementById("prevMonth").addEventListener("click", () => {
    state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() - 1, 1);
    renderCalendar();
  });

  document.getElementById("nextMonth").addEventListener("click", () => {
    state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() + 1, 1);
    renderCalendar();
  });

  document.getElementById("reportPrevMonth").addEventListener("click", () => {
    state.reportMonth = new Date(state.reportMonth.getFullYear(), state.reportMonth.getMonth() - 1, 1);
    document.getElementById("reportMonthLabel").textContent = state.reportMonth.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
    renderReports();
  });

  document.getElementById("reportNextMonth").addEventListener("click", () => {
    state.reportMonth = new Date(state.reportMonth.getFullYear(), state.reportMonth.getMonth() + 1, 1);
    document.getElementById("reportMonthLabel").textContent = state.reportMonth.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
    renderReports();
  });

  document.getElementById("shiftForm").addEventListener("submit", saveShift);
  document.getElementById("closeModalBtn").addEventListener("click", closeShiftModal);
  document.getElementById("deleteShiftBtn").addEventListener("click", deleteShift);
  document.getElementById("shiftModal").addEventListener("click", (event) => {
    if (event.target === event.currentTarget) closeShiftModal();
  });

  document.querySelectorAll(".bottom-nav-link").forEach((btn) => {
    btn.addEventListener("click", () => setPage(btn.dataset.page));
  });

  document.getElementById("reportMonthLabel").textContent = state.reportMonth.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
});
