/* =========================================================
   app.js — Budget & Pengeluaran App
   Vanilla JS | LocalStorage | Chart.js
   ========================================================= */

'use strict';

// ── Constants ────────────────────────────────────────────
const STORAGE_KEY = 'budgetApp_transactions';

const CATEGORY_ICON = {
  Makanan: '🍔',
  Transportasi: '🚗',
  Hiburan: '🎮',
};

const CATEGORY_COLORS = {
  Makanan: '#e53e3e',
  Transportasi: '#3b82f6',
  Hiburan: '#38a169',
};

const MONTH_NAMES = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember',
];

// ── State ────────────────────────────────────────────────
let transactions = loadFromStorage();
let chart = null;

// ── DOM References ───────────────────────────────────────
const form           = document.getElementById('transactionForm');
const nameInput      = document.getElementById('itemName');
const amountInput    = document.getElementById('itemAmount');
const categoryInput  = document.getElementById('itemCategory');
const nameError      = document.getElementById('nameError');
const amountError    = document.getElementById('amountError');
const categoryError  = document.getElementById('categoryError');
const totalBalance   = document.getElementById('totalBalance');
const transactionList= document.getElementById('transactionList');
const listEmpty      = document.getElementById('listEmpty');
const chartCanvas    = document.getElementById('expenseChart');
const chartEmpty     = document.getElementById('chartEmpty');
const sortBy         = document.getElementById('sortBy');
const monthFilter    = document.getElementById('monthFilter');
const monthlySummary = document.getElementById('monthlySummaryContent');
const toggleTheme    = document.getElementById('toggleTheme');

// ── LocalStorage Helpers ─────────────────────────────────
function loadFromStorage() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

// ── Utilities ────────────────────────────────────────────
function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function getMonthKey(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthLabel(key) {
  const [year, month] = key.split('-');
  return `${MONTH_NAMES[parseInt(month, 10) - 1]} ${year}`;
}

// ── Validation ───────────────────────────────────────────
function validateForm() {
  let valid = true;

  // Reset
  [nameInput, amountInput, categoryInput].forEach(el => el.classList.remove('error'));
  nameError.textContent = '';
  amountError.textContent = '';
  categoryError.textContent = '';

  const name = nameInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const category = categoryInput.value;

  if (!name) {
    nameError.textContent = 'Nama barang wajib diisi.';
    nameInput.classList.add('error');
    valid = false;
  }

  if (!amountInput.value || isNaN(amount) || amount <= 0) {
    amountError.textContent = 'Masukkan jumlah yang valid (lebih dari 0).';
    amountInput.classList.add('error');
    valid = false;
  }

  if (!category) {
    categoryError.textContent = 'Pilih kategori terlebih dahulu.';
    categoryInput.classList.add('error');
    valid = false;
  }

  return valid;
}

// ── Add Transaction ──────────────────────────────────────
form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!validateForm()) return;

  const transaction = {
    id: generateId(),
    name: nameInput.value.trim(),
    amount: parseFloat(amountInput.value),
    category: categoryInput.value,
    date: new Date().toISOString(),
  };

  transactions.unshift(transaction);
  saveToStorage();
  renderAll();

  // Reset form
  form.reset();
  nameInput.focus();
});

// ── Delete Transaction ───────────────────────────────────
function deleteTransaction(id) {
  transactions = transactions.filter(t => t.id !== id);
  saveToStorage();
  renderAll();
}

// ── Sorting ──────────────────────────────────────────────
function getSortedTransactions(list) {
  const value = sortBy.value;
  return [...list].sort((a, b) => {
    switch (value) {
      case 'date-desc':   return new Date(b.date) - new Date(a.date);
      case 'date-asc':    return new Date(a.date) - new Date(b.date);
      case 'amount-desc': return b.amount - a.amount;
      case 'amount-asc':  return a.amount - b.amount;
      case 'category':    return a.category.localeCompare(b.category);
      default:            return 0;
    }
  });
}

// ── Filter by Month ──────────────────────────────────────
function getFilteredTransactions() {
  const selected = monthFilter.value;
  if (selected === 'all') return transactions;
  return transactions.filter(t => getMonthKey(t.date) === selected);
}

// ── Render: Balance ──────────────────────────────────────
function renderBalance(list) {
  const total = list.reduce((sum, t) => sum + t.amount, 0);
  totalBalance.textContent = formatRupiah(total);
}

// ── Render: Month Filter Options ─────────────────────────
function renderMonthOptions() {
  const keys = [...new Set(transactions.map(t => getMonthKey(t.date)))].sort((a, b) => b.localeCompare(a));
  const current = monthFilter.value;

  monthFilter.innerHTML = '<option value="all">Semua Bulan</option>';
  keys.forEach(key => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = getMonthLabel(key);
    if (key === current) opt.selected = true;
    monthFilter.appendChild(opt);
  });
}

// ── Render: Monthly Summary ──────────────────────────────
function renderMonthlySummary(list) {
  // Group by month
  const groups = {};
  list.forEach(t => {
    const key = getMonthKey(t.date);
    if (!groups[key]) groups[key] = { total: 0, count: 0 };
    groups[key].total += t.amount;
    groups[key].count += 1;
  });

  const keys = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  if (keys.length === 0) {
    monthlySummary.innerHTML = '<p style="color:var(--text-muted);font-size:.875rem;">Belum ada data.</p>';
    return;
  }

  monthlySummary.innerHTML = keys.map(key => `
    <div class="monthly-item">
      <div class="m-label">${getMonthLabel(key)}</div>
      <div class="m-value">${formatRupiah(groups[key].total)}</div>
      <div class="m-count">${groups[key].count} transaksi</div>
    </div>
  `).join('');
}

// ── Render: Transaction List ─────────────────────────────
function renderTransactionList(list) {
  const sorted = getSortedTransactions(list);

  if (sorted.length === 0) {
    listEmpty.style.display = 'block';
    transactionList.innerHTML = '';
    return;
  }

  listEmpty.style.display = 'none';
  transactionList.innerHTML = sorted.map(t => {
    const icon = CATEGORY_ICON[t.category] || '📦';
    const date = new Date(t.date);
    const dateLabel = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

    return `
      <li class="transaction-item" data-id="${t.id}">
        <span class="item-icon" aria-hidden="true">${icon}</span>
        <div class="item-info">
          <div class="item-name">${escapeHtml(t.name)}</div>
          <div class="item-meta">
            <span class="cat-badge cat-${t.category}">${t.category}</span>
            <span>${dateLabel}</span>
          </div>
        </div>
        <span class="item-amount">${formatRupiah(t.amount)}</span>
        <button class="btn btn-danger" onclick="deleteTransaction('${t.id}')" aria-label="Hapus ${escapeHtml(t.name)}">Hapus</button>
      </li>
    `;
  }).join('');
}

// ── Render: Pie Chart ────────────────────────────────────
function renderChart(list) {
  // Aggregate by category
  const totals = {};
  list.forEach(t => {
    totals[t.category] = (totals[t.category] || 0) + t.amount;
  });

  const labels = Object.keys(totals);
  const data   = Object.values(totals);
  const colors = labels.map(l => CATEGORY_COLORS[l] || '#94a3b8');

  if (labels.length === 0) {
    chartEmpty.style.display = 'block';
    chartCanvas.style.display = 'none';
    if (chart) { chart.destroy(); chart = null; }
    return;
  }

  chartEmpty.style.display = 'none';
  chartCanvas.style.display = 'block';

  if (chart) {
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.data.datasets[0].backgroundColor = colors;
    chart.update();
    return;
  }

  chart = new Chart(chartCanvas, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderColor: getComputedStyle(document.body).getPropertyValue('--surface').trim() || '#fff',
        borderWidth: 3,
        hoverOffset: 10,
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 16,
            font: { size: 13, family: "'Segoe UI', sans-serif" },
            color: getComputedStyle(document.body).getPropertyValue('--text').trim() || '#1a202c',
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct = ((ctx.parsed / total) * 100).toFixed(1);
              return ` ${formatRupiah(ctx.parsed)} (${pct}%)`;
            },
          },
        },
      },
    },
  });
}

// ── Render All ───────────────────────────────────────────
function renderAll() {
  renderMonthOptions();
  const filtered = getFilteredTransactions();
  renderBalance(filtered);
  renderMonthlySummary(filtered);
  renderTransactionList(filtered);
  renderChart(filtered);
}

// ── Sort Change ──────────────────────────────────────────
sortBy.addEventListener('change', renderAll);

// ── Month Filter Change ──────────────────────────────────
monthFilter.addEventListener('change', renderAll);

// ── Dark / Light Mode ────────────────────────────────────
(function initTheme() {
  const saved = localStorage.getItem('budgetApp_theme') || 'light';
  applyTheme(saved);
})();

toggleTheme.addEventListener('click', () => {
  const isDark = document.body.classList.contains('dark');
  applyTheme(isDark ? 'light' : 'dark');
});

function applyTheme(theme) {
  document.body.classList.remove('light', 'dark');
  document.body.classList.add(theme);
  toggleTheme.textContent = theme === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('budgetApp_theme', theme);

  // Update chart legend colour on theme change
  if (chart) {
    const textColor = getComputedStyle(document.body).getPropertyValue('--text').trim();
    chart.options.plugins.legend.labels.color = textColor;
    chart.update();
  }
}

// ── XSS Protection ───────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Initial Render ───────────────────────────────────────
renderAll();
