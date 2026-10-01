// ═══════════════════════════════════════════════════════════
// STATE & STORAGE
// ═══════════════════════════════════════════════════════════

const STORAGE_KEY = 'shiftflow-data-v2';
const WORKS_KEY = 'shiftflow-works-v2';

const state = {
  currentMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  reportYear: new Date().getFullYear(),
  shifts: loadShifts(),
  works: loadWorks(),
  currentPage: 'main',
  selectedShiftDate: null,
  selectedWorkId: null,
};

const defaultWorks = [
  { id: '1', name: 'Дневная', color: '#00d9ff', type: 'hourly', rate: 400, currency: '₽' },
  { id: '2', name: 'Ночная', color: '#a78bfa', type: 'hourly', rate: 500, currency: '₽' },
  { id: '3', name: 'Выходной', color: '#fbbf24', type: 'fixed', rate: 0, currency: '₽' },
];

function loadShifts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function loadWorks() {
  try {
    const raw = localStorage.getItem(WORKS_KEY);
    return raw ? JSON.parse(raw) : defaultWorks;
  } catch {
    return defaultWorks;
  }
}

function saveShifts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.shifts));
}

function saveWorks() {
  localStorage.setItem(WORKS_KEY, JSON.stringify(state.works));
}

// ═══════════════════════════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════════════════════════

function getDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getTodayKey() {
  return getDateKey(new Date());
}

function getWorkById(id) {
  return state.works.find(w => w.id === id);
}

function formatCurrency(value, currency = '₽') {
  return `${Math.round(value).toLocaleString('ru-RU')} ${currency}`;
}

function monthName(date) {
  return date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
}

// ═══════════════════════════════════════════════════════════
// CALENDAR & STATS
// ═══════════════════════════════════════════════════════════

function getMonthStats(date) {
  const y = date.getFullYear();
  const m = date.getMonth();
  
  let income = 0, hours = 0, shifts = 0, weekends = 0;

  Object.entries(state.shifts).forEach(([key, shift]) => {
    const d = new Date(key + 'T00:00:00');
    if (d.getFullYear() !== y || d.getMonth() !== m) return;

    if (shift.isWeekend) {
      weekends++;
    } else {
      income += Number(shift.income || 0);
      hours += Number(shift.hours || 0);
      shifts++;
    }
  });

  return { income, hours, shifts, weekends };
}

function renderCalendar() {
  const grid = document.getElementById('calendarGrid');
  const label = document.getElementById('monthLabel');
  if (!grid || !label) return;

  const y = state.currentMonth.getFullYear();
  const m = state.currentMonth.getMonth();
  const firstDay = new Date(y, m, 1);
  const startIdx = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const prevDays = new Date(y, m, 0).getDate();

  label.textContent = monthName(state.currentMonth);
  grid.innerHTML = '';

  const today = getTodayKey();
  const stats = getMonthStats(state.currentMonth);

  // Prev month empty cells
  for (let i = 0; i < startIdx; i++) {
    const d = prevDays - startIdx + i + 1;
    const cell = document.createElement('div');
    cell.className = 'calendar-day empty';
    cell.textContent = d;
    grid.appendChild(cell);
  }

  // Days of month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(y, m, day);
    const key = getDateKey(date);
    const shift = state.shifts[key];
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'calendar-day';
    cell.textContent = day;

    let classes = [];
    if (date.getDay() % 6 === 0) classes.push('weekend');
    if (key === today) classes.push('today');
    if (shift) classes.push('shift-added');

    cell.className = 'calendar-day ' + classes.join(' ');
    cell.addEventListener('click', () => openShiftSheet(key));
    grid.appendChild(cell);
  }

  // Next month empty cells
  const totalCells = grid.children.length;
  const remaining = (7 - (totalCells % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day empty';
    cell.textContent = i;
    grid.appendChild(cell);
  }

  // Update KPI
  const currency = state.works[0]?.currency || '₽';
  document.getElementById('sumIncome').textContent = formatCurrency(stats.income, currency);
  document.getElementById('sumShifts').textContent = stats.shifts;
  document.getElementById('sumHours').textContent = Math.round(stats.hours * 10) / 10;
}

function renderWorkGrid() {
  const grid = document.getElementById('workGrid');
  if (!grid) return;

  grid.innerHTML = state.works
    .filter(w => w.type === 'hourly' || w.id)
    .map(work => `
      <button class="work-card" style="color: ${work.color}" type="button" data-work-id="${work.id}">
        <span class="work-card-dot" style="background: ${work.color}"></span>
        <span class="work-card-name">${work.name}</span>
        <span class="work-card-rate">${formatCurrency(work.rate, work.currency)}/ч</span>
      </button>
    `)
    .join('');

  document.querySelectorAll('.work-card').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.workId;
      openShiftSheet(null, id);
    });
  });
}

// ═══════════════════════════════════════════════════════════
// SHIFT SHEET
// ═══════════════════════════════════════════════════════════

function openShiftSheet(dateKey, workId = null) {
  const sheet = document.getElementById('shiftSheet');
  const backdrop = document.getElementById('sheetBackdrop');
  const title = document.getElementById('sheetTitle');
  const dateInput = document.getElementById('sheetDate');
  const hourlyFields = document.getElementById('hourlyFields');
  const fixedFields = document.getElementById('fixedFields');
  const rateToggle = document.getElementById('rateModeToggle');

  if (!sheet || !backdrop) return;

  // If clicking on calendar day
  if (dateKey) {
    const date = new Date(dateKey + 'T00:00:00');
    dateInput.value = dateKey;
    state.selectedShiftDate = dateKey;

    const existing = state.shifts[dateKey];
    if (existing) {
      const work = getWorkById(existing.workId);
      if (work) {
        title.textContent = work.name;
        document.getElementById('sheetHours').value = existing.hours || 8;
        document.getElementById('sheetRate').value = work.rate;
        updateIncomePreview();
      }
    } else {
      title.textContent = 'Новая смена';
      document.getElementById('sheetHours').value = 8;
      document.getElementById('sheetRate').value = 400;
    }
  } else {
    // Tapping work card
    dateInput.value = getDateKey(new Date());
    state.selectedShiftDate = getDateKey(new Date());
    const work = getWorkById(workId);
    if (work) {
      title.textContent = work.name;
      document.getElementById('sheetRate').value = work.rate;
      document.getElementById('sheetHours').value = 8;
      updateIncomePreview();
    }
  }

  rateToggle.querySelectorAll('.segment').forEach(s => s.classList.remove('active'));
  rateToggle.querySelector('[data-mode="hourly"]').classList.add('active');
  hourlyFields.classList.remove('hidden');
  fixedFields.classList.add('hidden');

  sheet.classList.remove('hidden');
  backdrop.classList.remove('hidden');
  sheet.setAttribute('aria-hidden', 'false');
}

function closeShiftSheet() {
  const sheet = document.getElementById('shiftSheet');
  const backdrop = document.getElementById('sheetBackdrop');
  if (sheet) sheet.classList.add('hidden');
  if (backdrop) backdrop.classList.add('hidden');
  sheet?.setAttribute('aria-hidden', 'true');
}

function updateIncomePreview() {
  const hours = Number(document.getElementById('sheetHours').value || 0);
  const rate = Number(document.getElementById('sheetRate').value || 0);
  const income = hours * rate;
  const work = state.works[0];
  const currency = work?.currency || '₽';
  document.getElementById('sheetIncomePreview').textContent = formatCurrency(income, currency);
}

function saveShift() {
  if (!state.selectedShiftDate) return;

  const hours = Number(document.getElementById('sheetHours').value || 0);
  const rate = Number(document.getElementById('sheetRate').value || 0);
  const income = hours * rate;
  const work = state.works[0];

  state.shifts[state.selectedShiftDate] = {
    workId: work.id,
    hours,
    income,
    isWeekend: false,
    date: state.selectedShiftDate,
  };

  saveShifts();
  renderCalendar();
  renderReports();
  closeShiftSheet();
  hapticPulse('success');
}

function markWeekend() {
  if (!state.selectedShiftDate) return;
  state.shifts[state.selectedShiftDate] = {
    workId: null,
    hours: 0,
    income: 0,
    isWeekend: true,
    date: state.selectedShiftDate,
  };
  saveShifts();
  renderCalendar();
  renderReports();
  closeShiftSheet();
  hapticPulse('success');
}

// ═══════════════════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════════════════

function getYearStats(year) {
  const months = {};
  for (let m = 0; m < 12; m++) {
    months[m] = { income: 0, hours: 0, shifts: 0, weekends: 0 };
  }

  Object.entries(state.shifts).forEach(([key, shift]) => {
    const d = new Date(key + 'T00:00:00');
    if (d.getFullYear() !== year) return;

    const m = d.getMonth();
    if (shift.isWeekend) {
      months[m].weekends++;
    } else {
      months[m].income += shift.income || 0;
      months[m].hours += shift.hours || 0;
      months[m].shifts++;
    }
  });

  return months;
}

function renderReports() {
  const list = document.getElementById('reportList');
  if (!list) return;

  const monthNames = [
    'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
    'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'
  ];

  const yearStats = getYearStats(state.reportYear);
  const work = state.works[0];
  const currency = work?.currency || '₽';

  let html = '';
  Object.entries(yearStats).forEach(([m, stats]) => {
    const monthName = monthNames[Number(m)];
    html += `
      <div class="report-card glass-panel">
        <h3>${monthName}</h3>
        <div class="report-grid">
          <div class="report-item">
            <span>💰 Доход</span>
            <strong>${formatCurrency(stats.income, currency)}</strong>
          </div>
          <div class="report-item">
            <span>📅 Смены</span>
            <strong>${stats.shifts}</strong>
          </div>
          <div class="report-item">
            <span>⏱ Часы</span>
            <strong>${Math.round(stats.hours * 10) / 10}</strong>
          </div>
          <div class="report-item">
            <span>🌴 Выходные</span>
            <strong>${stats.weekends}</strong>
          </div>
        </div>
      </div>
    `;
  });

  list.innerHTML = html || '<div class="empty-state">Нет данных за период</div>';

  // Year chart
  renderYearChart(yearStats, currency);
}

function renderYearChart(yearStats, currency) {
  const chart = document.getElementById('yearChart');
  const yearLabel = document.getElementById('yearLabelReports');
  if (!chart || !yearLabel) return;

  yearLabel.textContent = state.reportYear.toString();

  const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
  const maxIncome = Math.max(...Object.values(yearStats).map(s => s.income), 1);

  let html = '';
  Object.entries(yearStats).forEach(([m, stats]) => {
    const height = (stats.income / maxIncome) * 100;
    html += `
      <div class="year-bar" style="height: ${height}%" title="${monthNames[m]}: ${formatCurrency(stats.income, currency)}"></div>
    `;
  });

  chart.innerHTML = html;

  const totalIncome = Object.values(yearStats).reduce((sum, s) => sum + s.income, 0);
  document.getElementById('yearTotalValue').textContent = formatCurrency(totalIncome, currency);
}

// ═══════════════════════════════════════════════════════════
// SETTINGS & WORKS
// ═══════════════════════════════════════════════════════════

function renderSettingsList() {
  const list = document.getElementById('settingsList');
  if (!list) return;

  list.innerHTML = state.works
    .map(work => `
      <div class="work-setting-item" data-work-id="${work.id}">
        <div class="work-setting-info">
          <span class="work-card-dot" style="background: ${work.color}; margin-right: 8px;"></span>
          <span class="work-setting-name">${work.name}</span>
          <span class="work-setting-detail">${work.type === 'hourly' ? 'Почасовая' : 'Фиксированная'} • ${formatCurrency(work.rate, work.currency)}</span>
        </div>
        <div class="work-setting-actions">
          <button class="work-btn-edit" type="button" data-work-id="${work.id}">✎</button>
          <button class="work-btn-delete" type="button" data-work-id="${work.id}">✕</button>
        </div>
      </div>
    `)
    .join('');

  list.querySelectorAll('.work-btn-edit').forEach(btn => {
    btn.addEventListener('click', () => openWorkModal(btn.dataset.workId));
  });

  list.querySelectorAll('.work-btn-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteWork(btn.dataset.workId));
  });
}

function openWorkModal(workId = null) {
  const modal = document.getElementById('workModal');
  const form = document.getElementById('workForm');
  const title = document.getElementById('workModalTitle');
  const deleteBtn = document.getElementById('deleteWorkBtn');

  if (!modal || !form) return;

  if (workId) {
    const work = getWorkById(workId);
    if (work) {
      title.textContent = 'Редактировать работу';
      document.getElementById('workNameInput').value = work.name;
      document.getElementById('workColorInput').value = work.color;
      document.getElementById('workRateInput').value = work.rate;
      document.getElementById('workCurrencyInput').value = work.currency;
      document.getElementById('workTypeToggle').querySelectorAll('.segment').forEach(s => {
        s.classList.toggle('active', s.dataset.type === work.type);
      });
      deleteBtn.classList.remove('hidden');
      form.dataset.workId = workId;
    }
  } else {
    title.textContent = 'Добавить работу';
    form.reset();
    document.getElementById('workColorInput').value = '#00d9ff';
    document.getElementById('workCurrencyInput').value = '₽';
    document.getElementById('workTypeToggle').querySelectorAll('.segment').forEach((s, i) => {
      s.classList.toggle('active', i === 0);
    });
    deleteBtn.classList.add('hidden');
    delete form.dataset.workId;
  }

  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
  hapticPulse('impact');
}

function closeWorkModal() {
  const modal = document.getElementById('workModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  }
}

function saveWork(e) {
  e.preventDefault();
  const form = e.target;
  const name = document.getElementById('workNameInput').value.trim();
  const color = document.getElementById('workColorInput').value;
  const rate = Number(document.getElementById('workRateInput').value || 0);
  const currency = document.getElementById('workCurrencyInput').value;
  const type = document.querySelector('#workTypeToggle .segment.active').dataset.type;

  if (!name) {
    alert('Введите название работы');
    return;
  }

  if (form.dataset.workId) {
    const work = getWorkById(form.dataset.workId);
    if (work) {
      work.name = name;
      work.color = color;
      work.rate = rate;
      work.currency = currency;
      work.type = type;
    }
  } else {
    state.works.push({
      id: Date.now().toString(),
      name,
      color,
      rate,
      currency,
      type,
    });
  }

  saveWorks();
  renderSettingsList();
  renderWorkGrid();
  closeWorkModal();
  hapticPulse('success');
}

function deleteWork(workId) {
  if (confirm('Удалить эту работу?')) {
    state.works = state.works.filter(w => w.id !== workId);
    saveWorks();
    renderSettingsList();
    renderWorkGrid();
    hapticPulse('warning');
  }
}

// ═══════════════════════════════════════════════════════════
// GRAPH / SCHEDULE PRESETS
// ═══════════════════════════════════════════════════════════

function openGraphSheet() {
  const sheet = document.getElementById('graphSheet');
  const backdrop = document.getElementById('sheetBackdrop');
  if (!sheet || !backdrop) return;

  document.getElementById('graphStartDate').value = getDateKey(new Date());
  
  sheet.classList.remove('hidden');
  backdrop.classList.remove('hidden');
  sheet.setAttribute('aria-hidden', 'false');
}

function closeGraphSheet() {
  const sheet = document.getElementById('graphSheet');
  const backdrop = document.getElementById('sheetBackdrop');
  if (sheet) sheet.classList.add('hidden');
  if (backdrop) backdrop.classList.add('hidden');
  sheet?.setAttribute('aria-hidden', 'true');
}

function applySchedulePreset() {
  const presetEl = document.querySelector('.preset-btn.active');
  const preset = presetEl?.dataset.preset;
  if (!preset) return;

  const startDate = new Date(document.getElementById('graphStartDate').value);
  const shiftHours = Number(document.getElementById('graphShiftHours').value || 8);
  const endMonth = document.getElementById('graphEndMonth').checked;
  const endWeek = document.getElementById('graphEndWeek').checked;

  const presets = {
    '2/2': [2, 2],
    '3/3': [3, 3],
    '4/3': [4, 3],
    '5/2': [5, 2],
    'custom': [
      Number(document.getElementById('customShifts').value || 4),
      Number(document.getElementById('customDaysOff').value || 3),
    ],
  };

  const [shiftsCount, daysOffCount] = presets[preset] || [2, 2];
  const cycleLen = shiftsCount + daysOffCount;

  let current = new Date(startDate);
  let idx = 0;
  const endDate = endMonth ? new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0) : endWeek ? new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000) : new Date(startDate.getTime() + cycleLen * 24 * 60 * 60 * 1000);

  // Cascade fill
  while (current <= endDate) {
    const key = getDateKey(current);
    const pos = idx % cycleLen;

    if (pos < shiftsCount) {
      // Work day
      const work = state.works.find(w => w.type === 'hourly') || state.works[0];
      state.shifts[key] = {
        workId: work.id,
        hours: shiftHours,
        income: shiftHours * work.rate,
        isWeekend: false,
        date: key,
      };
    } else {
      // Day off
      state.shifts[key] = {
        workId: null,
        hours: 0,
        income: 0,
        isWeekend: true,
        date: key,
      };
    }

    idx++;
    current = new Date(current.getTime() + 24 * 60 * 60 * 1000);

    // Cascade delay animation (0.02s per day)
    setTimeout(() => {
      renderCalendar();
    }, (idx - 1) * 20);
  }

  saveShifts();
  renderCalendar();
  renderReports();
  closeGraphSheet();
  hapticPulse('success');
}

// ═══════════════════════════════════════════════════════════
// PAGE NAVIGATION
// ═══════════════════════════════════════════════════════════

function setPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(page + 'Page')?.classList.add('active');

  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === page);
  });

  state.currentPage = page;
  hapticPulse('impact');
}

// ═══════════════════════════════════════════════════════════
// HAPTIC & ANIMATIONS
// ═══════════════════════════════════════════════════════════

function hapticPulse(type = 'impact') {
  if ('vibrate' in navigator) {
    const patterns = {
      soft: [20],
      impact: [30],
      success: [10, 30, 10],
      warning: [50, 20, 50],
    };
    navigator.vibrate(patterns[type] || [20]);
  }
}

function circularThemeTransition(e) {
  const x = e.clientX;
  const y = e.clientY;
  
  const circle = document.createElement('div');
  circle.style.cssText = `
    position: fixed;
    left: ${x}px;
    top: ${y}px;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(0, 217, 255, 0.4), transparent);
    pointer-events: none;
    animation: themeWave 0.7s ease-out forwards;
    z-index: 100;
  `;

  document.body.appendChild(circle);
  setTimeout(() => circle.remove(), 700);
}

// ═══════════════════════════════════════════════════════════
// INIT & EVENT LISTENERS
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  // Main page
  renderCalendar();
  renderWorkGrid();
  renderReports();
  renderSettingsList();

  // Calendar nav
  document.getElementById('prevMonthBtn')?.addEventListener('click', () => {
    state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() - 1, 1);
    renderCalendar();
    hapticPulse('impact');
  });

  document.getElementById('nextMonthBtn')?.addEventListener('click', () => {
    state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() + 1, 1);
    renderCalendar();
    hapticPulse('impact');
  });

  // Year nav
  document.getElementById('prevYearBtn')?.addEventListener('click', () => {
    state.reportYear--;
    renderReports();
    hapticPulse('impact');
  });

  document.getElementById('nextYearBtn')?.addEventListener('click', () => {
    state.reportYear++;
    renderReports();
    hapticPulse('impact');
  });

  // Tab navigation
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.addEventListener('click', () => {
      setPage(btn.dataset.page);
    });
  });

  // Shift sheet
  document.getElementById('closeShiftSheet')?.addEventListener('click', closeShiftSheet);
  document.getElementById('sheetBackdrop')?.addEventListener('click', closeShiftSheet);
  document.getElementById('saveShiftBtn')?.addEventListener('click', saveShift);
  document.getElementById('markWeekend')?.addEventListener('click', markWeekend);

  document.getElementById('sheetHours')?.addEventListener('input', updateIncomePreview);
  document.getElementById('sheetRate')?.addEventListener('input', updateIncomePreview);

  document.getElementById('rateModeToggle')?.querySelectorAll('.segment').forEach(seg => {
    seg.addEventListener('click', () => {
      const hourly = seg.dataset.mode === 'hourly';
      document.getElementById('hourlyFields')?.classList.toggle('hidden', !hourly);
      document.getElementById('fixedFields')?.classList.toggle('hidden', hourly);
    });
  });

  // Graph sheet
  document.getElementById('openGraphSheet')?.addEventListener('click', openGraphSheet);
  document.getElementById('closeGraphSheet')?.addEventListener('click', closeGraphSheet);
  document.getElementById('applyGraphBtn')?.addEventListener('click', applySchedulePreset);

  document.getElementById('graphSheet')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeGraphSheet();
  });

  // Preset buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Work modal
  document.getElementById('addWorkBtn')?.addEventListener('click', () => openWorkModal());
  document.getElementById('closeWorkModal')?.addEventListener('click', closeWorkModal);
  document.getElementById('workForm')?.addEventListener('submit', saveWork);
  document.getElementById('deleteWorkBtn')?.addEventListener('click', () => {
    if (confirm('Удалить работу?')) {
      const workId = document.getElementById('workForm').dataset.workId;
      deleteWork(workId);
    }
  });

  document.getElementById('workModal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeWorkModal();
  });

  document.getElementById('workTypeToggle')?.querySelectorAll('.segment').forEach(seg => {
    seg.addEventListener('click', () => {
      document.querySelectorAll('#workTypeToggle .segment').forEach(s => s.classList.remove('active'));
      seg.classList.add('active');
    });
  });

  // Quick shift
  document.getElementById('addShiftQuick')?.addEventListener('click', () => openShiftSheet());

  // Work selector in graph
  document.getElementById('workSelector')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('segment')) {
      document.querySelectorAll('#workSelector .segment').forEach(s => s.classList.remove('active'));
      e.target.classList.add('active');
    }
  });

  // Theme transition (circular ripple on click)
  document.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
      circularThemeTransition(e);
    }
  });

  // Set initial page
  setPage('main');
});

// ═══════════════════════════════════════════════════════════
// THEME WAVE ANIMATION
// ═══════════════════════════════════════════════════════════

const style = document.createElement('style');
style.textContent = `
  @keyframes themeWave {
    0% {
      opacity: 1;
      transform: scale(0.5);
    }
    100% {
      opacity: 0;
      transform: scale(2);
    }
  }
`;
document.head.appendChild(style);
