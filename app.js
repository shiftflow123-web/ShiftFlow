const STORAGE_KEY = "shiftflow-data-v1";
const SETTINGS_KEY = "shiftflow-settings-v1";

const defaultSettings = {
  lang: "ru",
  theme: "light"
};

const translations = {
  ru: {
    brand: "Shift Flow",
    tagline: "Управляй смены, контролируй доход",
    nav_home: "Главная",
    nav_reports: "Отчеты",
    nav_settings: "Настройки",
    total_hours: "Часы",
    total_shifts: "Смены",
    total_income: "Доход",
    shift_name: "Наименование смены",
    shift_hours: "Количество часов",
    shift_income: "Доход",
    weekend_day: "Выходной день",
    delete_shift: "Удалить смену",
    save: "Сохранить",
    language: "Язык",
    theme: "Тема",
    theme_light: "Светлая",
    theme_dark: "Темная",
    theme_system: "Как в системе",
    terms_button: "Пользовательское соглашение",
    terms_title: "Пользовательское соглашение",
    terms_text:
      "Настоящее приложение предназначено для учета рабочих смен, расчета часов и дохода. Пользователь несет ответственность за корректность вводимых данных. Приложение использует локальное хранение для сохранения данных на устройстве.",
    month_format: (date) =>
      new Intl.DateTimeFormat("ru-RU", {
        month: "long",
        year: "numeric"
      }).format(date),
    hours_short: "Часов",
    shifts_short: "Смен",
    income_short: "Доход",
    no_data: "Нет данных"
  },
  en: {
    brand: "Shift Flow",
    tagline: "Manage shifts, track your income",
    nav_home: "Home",
    nav_reports: "Reports",
    nav_settings: "Settings",
    total_hours: "Hours",
    total_shifts: "Shifts",
    total_income: "Income",
    shift_name: "Shift name",
    shift_hours: "Hours worked",
    shift_income: "Income",
    weekend_day: "Day off",
    delete_shift: "Delete shift",
    save: "Save",
    language: "Language",
    theme: "Theme",
    theme_light: "Light",
    theme_dark: "Dark",
    theme_system: "System",
    terms_button: "User agreement",
    terms_title: "User agreement",
    terms_text:
      "This application is designed to track work shifts, calculate hours and income. The user is responsible for the accuracy of the entered data. The application uses local storage to save data on the device.",
    month_format: (date) =>
      new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric"
      }).format(date),
    hours_short: "Hours",
    shifts_short: "Shifts",
    income_short: "Income",
    no_data: "No data"
  }
};

const state = {
  currentMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  reportMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  selectedDate: null,
  settings: loadSettings(),
  shifts: loadShifts()
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

function applyLanguage() {
  const lang = state.settings.lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    const text = translations[lang][key];
    if (typeof text === "function") {
      el.textContent = text(new Date());
    } else if (text) {
      el.textContent = text;
    }
  });

  document.documentElement.lang = lang;

  const monthLabel = document.getElementById("monthLabel");
  if (monthLabel) {
    monthLabel.textContent = translations[lang].month_format(state.currentMonth);
  }

  const reportMonthLabel = document.getElementById("reportMonthLabel");
  if (reportMonthLabel) {
    reportMonthLabel.textContent = translations[lang].month_format(state.reportMonth);
  }

  updateButtonsState();
}

function updateButtonsState() {
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === state.settings.lang);
  });

  document.querySelectorAll(".theme-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.theme === state.settings.theme);
  });
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

  monthLabel.textContent = translations[state.settings.lang].month_format(state.currentMonth);

  const year = state.currentMonth.getFullYear();
  const month = state.currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const startDayIndex = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthStats = getMonthStats(state.currentMonth);
  const totalHoursEl = document.getElementById("totalHours");
  const totalShiftsEl = document.getElementById("totalShifts");
  const totalIncomeEl = document.getElementById("totalIncome");

  if (totalHoursEl) totalHoursEl.textContent = monthStats.totalHours.toString();
  if (totalShiftsEl) totalShiftsEl.textContent = monthStats.totalShifts.toString();
  if (totalIncomeEl) totalIncomeEl.textContent = formatMoney(monthStats.totalIncome);

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

function openShiftModal(dateKey) {
  const modal = document.getElementById("shiftModal");
  const form = document.getElementById("shiftForm");
  const deleteBtn = document.getElementById("deleteShiftBtn");
  const modalDateLabel = document.getElementById("modalDateLabel");
  const shiftName = document.getElementById("shiftName");
  const shiftHours = document.getElementById("shiftHours");
  const shiftIncome = document.getElementById("shiftIncome");
  const isWeekend = document.getElementById("isWeekend");

  state.selectedDate = dateKey;
  const date = new Date(`${dateKey}T00:00:00`);
  modalDateLabel.textContent = new Intl.DateTimeFormat(state.settings.lang === "ru" ? "ru-RU" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);

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

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  form.dataset.date = dateKey;
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

  const shiftName = document.getElementById("shiftName").value.trim();
  const shiftHours = Number(document.getElementById("shiftHours").value || 0);
  const shiftIncome = Number(document.getElementById("shiftIncome").value || 0);
  const isWeekendChecked = document.getElementById("isWeekend").checked;

  if (isWeekendChecked) {
    state.shifts[dateKey] = {
      name: "Выходной",
      hours: 0,
      income: 0,
      weekend: true
    };
  } else {
    if (!shiftName && shiftHours === 0 && shiftIncome === 0) {
      delete state.shifts[dateKey];
    } else {
      state.shifts[dateKey] = {
        name: shiftName || "Смена",
        hours: shiftHours,
        income: shiftIncome,
        weekend: false
      };
    }
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

function renderReports() {
  const summaryEl = document.getElementById("reportSummary");
  if (!summaryEl) return;

  const months = getMonthlySummary();
  const lang = state.settings.lang;

  summaryEl.innerHTML = "";

  if (!months.length) {
    summaryEl.innerHTML = `<div class="summary-card"><h3>${translations[lang].no_data}</h3></div>`;
    return;
  }

  months.forEach((item) => {
    const card = document.createElement("div");
    card.className = "summary-card";
    card.innerHTML = `
      <div class="summary-header">
        <h3>${item.label}</h3>
      </div>
      <div class="summary-grid">
        <div class="summary-item">
          <small>${translations[lang].hours_short}</small>
          <strong>${item.hours}</strong>
        </div>
        <div class="summary-item">
          <small>${translations[lang].shifts_short}</small>
          <strong>${item.shifts}</strong>
        </div>
        <div class="summary-item">
          <small>${translations[lang].income_short}</small>
          <strong>${formatMoney(item.income)}</strong>
        </div>
      </div>
    `;
    summaryEl.appendChild(card);
  });
}

function getMonthlySummary() {
  const months = new Set();

  Object.keys(state.shifts).forEach((key) => {
    const date = new Date(`${key}T00:00:00`);
    const label = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    months.add(label);
  });

  const sorted = [...months].sort();

  return sorted.map((key) => {
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
      label: new Intl.DateTimeFormat(state.settings.lang === "ru" ? "ru-RU" : "en-US", {
        month: "long",
        year: "numeric"
      }).format(date),
      hours,
      shifts,
      income
    };
  });
}

function changeMonth(delta) {
  state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() + delta, 1);
  renderCalendar();
}

function changeReportMonth(delta) {
  state.reportMonth = new Date(state.reportMonth.getFullYear(), state.reportMonth.getMonth() + delta, 1);
  const label = document.getElementById("reportMonthLabel");
  if (label) {
    label.textContent = translations[state.settings.lang].month_format(state.reportMonth);
  }
  renderReports();
}

function initSettings() {
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.settings.lang = btn.dataset.lang;
      saveSettings();
      applyLanguage();
      renderCalendar();
      renderReports();
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

  const openTermsBtn = document.getElementById("openTermsBtn");
  const termsModal = document.getElementById("termsModal");
  const closeTermsBtn = document.getElementById("closeTermsBtn");

  if (openTermsBtn) {
    openTermsBtn.addEventListener("click", () => {
      termsModal.classList.remove("hidden");
    });
  }

  if (closeTermsBtn) {
    closeTermsBtn.addEventListener("click", () => {
      termsModal.classList.add("hidden");
    });
  }

  if (termsModal) {
    termsModal.addEventListener("click", (e) => {
      if (e.target === termsModal) {
        termsModal.classList.add("hidden");
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setTheme();
  applyLanguage();
  updateButtonsState();

  const prevMonthBtn = document.getElementById("prevMonth");
  const nextMonthBtn = document.getElementById("nextMonth");
  if (prevMonthBtn) prevMonthBtn.addEventListener("click", () => changeMonth(-1));
  if (nextMonthBtn) nextMonthBtn.addEventListener("click", () => changeMonth(1));

  const reportPrevBtn = document.getElementById("reportPrevMonth");
  const reportNextBtn = document.getElementById("reportNextMonth");
  if (reportPrevBtn) reportPrevBtn.addEventListener("click", () => changeReportMonth(-1));
  if (reportNextBtn) reportNextBtn.addEventListener("click", () => changeReportMonth(1));

  const shiftForm = document.getElementById("shiftForm");
  if (shiftForm) {
    shiftForm.addEventListener("submit", saveShift);
  }

  const closeModalBtn = document.getElementById("closeModalBtn");
  if (closeModalBtn) closeModalBtn.addEventListener("click", closeShiftModal);

  const deleteBtn = document.getElementById("deleteShiftBtn");
  if (deleteBtn) deleteBtn.addEventListener("click", deleteShift);

  const modal = document.getElementById("shiftModal");
  if (modal) {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeShiftModal();
      }
    });
  }

  renderCalendar();
  renderReports();
  initSettings();
});
