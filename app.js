const STORAGE_KEY = "shiftflow-data-v1";
const SETTINGS_KEY = "shiftflow-settings-v1";

const defaultSettings = {
  lang: "ru",
  theme: "light",
  hourRate: 300,
  requiredHours: 160
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
  const targetYear = date.getFullYear();
  const targetMonth = date.getMonth();
  const arr = Object.entries(state.shifts).filter(([key]) => {
    const d = new Date(`${key}T00:00:00`);
    return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
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

function updateSummary() {
  const stats = getMonthStats(new Date());
  document.getElementById("totalHours").textContent = stats.totalHours.toString();
  document.getElementById("totalShifts").textContent = stats.totalShifts.toString();
  document.getElementById("totalIncome").textContent = formatMoney(stats.totalIncome);
}

function renderShiftList() {
  const list = document.getElementById("shiftsList");
  const entries = Object.entries(state.shifts).sort(([a], [b]) => new Date(a) - new Date(b));

  if (!entries.length) {
    list.innerHTML = '<div class="empty-state">Пока нет ни одной смены. Добавьте первую смену.</div>';
    return;
  }

  list.innerHTML = entries.map(([key, item]) => {
    const date = new Date(`${key}T00:00:00`);
    const label = item.weekend ? "Выходной" : item.name || "Смена";
    return `
      <button class="shift-item" type="button" data-date="${key}">
        <div class="shift-left">
          <span class="shift-date">${date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
          <strong>${label}</strong>
        </div>
        <div class="shift-meta">
          <span>${item.hours || 0} ч</span>
          <span>${formatMoney(item.income || 0)}</span>
        </div>
      </button>
    `;
  }).join("");

  document.querySelectorAll(".shift-item").forEach((el) => {
    el.addEventListener("click", () => openShiftModal(el.dataset.date));
  });
}

function renderReports() {
  const summaryEl = document.getElementById("reportSummary");
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
    const label = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    months.add(label);
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
  updateSummary();
  renderShiftList();
  renderReports();
  closeShiftModal();
}

function deleteShift() {
  if (!state.selectedDate) return;
  delete state.shifts[state.selectedDate];
  saveShifts();
  updateSummary();
  renderShiftList();
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

function syncSettingsInputs() {
  document.getElementById("hourRate").value = state.settings.hourRate || "";
  document.getElementById("requiredHours").value = state.settings.requiredHours || "";
}

function bindSettings() {
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.settings.lang = btn.dataset.lang;
      saveSettings();
      updateButtonsState();
    });
  });

  document.querySelectorAll(".theme-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.settings.theme = btn.dataset.theme;
      saveSettings();
      setTheme();
      updateButtonsState();
    });
  });

  document.getElementById("hourRate").addEventListener("input", (event) => {
    state.settings.hourRate = Number(event.target.value || 0);
    saveSettings();
  });

  document.getElementById("requiredHours").addEventListener("input", (event) => {
    state.settings.requiredHours = Number(event.target.value || 0);
    saveSettings();
  });

  document.getElementById("openTermsBtn").addEventListener("click", () => {
    document.getElementById("termsModal").classList.remove("hidden");
  });

  document.getElementById("closeTermsBtn").addEventListener("click", () => {
    document.getElementById("termsModal").classList.add("hidden");
  });

  document.getElementById("termsModal").addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
      event.currentTarget.classList.add("hidden");
    }
  });
}

function updateButtonsState() {
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === state.settings.lang);
  });

  document.querySelectorAll(".theme-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.theme === state.settings.theme);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setTheme();
  syncSettingsInputs();
  bindSettings();
  updateButtonsState();
  updateSummary();
  renderShiftList();
  renderReports();

  document.getElementById("addShiftBtn").addEventListener("click", () => {
    const today = new Date();
    openShiftModal(getKey(today));
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
