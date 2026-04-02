// ===== STATE =====
let parsedData = null;
let selectedAlgo = 'min';
let chartInstance = null;

// ===== UPLOAD HANDLING =====
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const calcBtn = document.getElementById('calcBtn');

uploadZone.addEventListener('click', () => fileInput.click());
uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault(); uploadZone.classList.remove('drag-over');
  if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', e => { if (e.target.files.length) handleFile(e.target.files[0]); });

function handleFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const wb = XLSX.read(e.target.result, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      parsedData = parseSheet(raw);
      fileName.textContent = file.name + ' — ' + parsedData.materials.length + ' materials loaded';
      fileInfo.classList.add('show');
      calcBtn.disabled = false;
      document.getElementById('results').style.display = 'none';
    } catch (err) { alert('Error parsing file: ' + err.message); }
  };
  reader.readAsArrayBuffer(file);
}

// ===== PARSING =====
function parseIndianNumber(v) {
  if (v == null || v === '') return NaN;
  let s = String(v).trim().replace(/[\s"]/g, '');
  s = s.replace(/,/g, '');
  const n = parseFloat(s);
  return (isNaN(n) || n === 0) ? NaN : n;
}

function classifyColumn(header) {
  if (!header) return null;
  const h = String(header).toLowerCase();
  if (/formula|aptransco|tgtransco|kptcl|mpptcl|msetcl|bihar/i.test(h)) return 'ssr';
  if (/cg|siemens|\bge\b|hitachi|budgetary/i.test(h)) return 'budgetary';
  if (/\bpo\b|purchase/i.test(h)) return 'po';
  return null;
}

function parseSheet(raw) {
  // Row indices: 0=empty, 1=main headers, 2=sub-headers, 3+=data
  const subHeaders = raw[2] || [];
  const columns = [];
  for (let i = 0; i < subHeaders.length; i++) {
    const group = classifyColumn(subHeaders[i]);
    if (group) columns.push({ index: i, name: String(subHeaders[i]).trim(), group });
  }

  const materials = [];
  for (let r = 3; r < raw.length; r++) {
    const row = raw[r];
    const name = String(row[1] || '').trim();
    if (!name) continue;

    const prices = { ssr: [], budgetary: [], po: [], all: [] };
    columns.forEach(col => {
      const val = parseIndianNumber(row[col.index]);
      if (!isNaN(val)) {
        prices[col.group].push({ source: col.name, value: val });
        prices.all.push({ source: col.name, value: val, group: col.group });
      }
    });
    if (prices.all.length > 0) materials.push({ name, prices });
  }
  return { materials, columns };
}

// ===== ALGORITHMS =====
function algoMin(vals) { return Math.min(...vals); }
function algoAvg(vals) { return vals.reduce((a, b) => a + b, 0) / vals.length; }
function algoWeightedAvg(prices) {
  const ssrVals = prices.ssr.map(p => p.value);
  const poVals = prices.po.map(p => p.value);
  const budVals = prices.budgetary.map(p => p.value);
  let num = 0, den = 0;
  if (ssrVals.length) { num += algoAvg(ssrVals) * 0.4; den += 0.4; }
  if (poVals.length) { num += algoAvg(poVals) * 0.35; den += 0.35; }
  if (budVals.length) { num += algoAvg(budVals) * 0.25; den += 0.25; }
  return den > 0 ? num / den : NaN;
}
function algoMedian(vals) {
  const s = [...vals].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function algoSigma(vals) {
  const mean = algoAvg(vals);
  const sd = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length);
  const filtered = vals.filter(v => Math.abs(v - mean) <= sd);
  return filtered.length ? algoAvg(filtered) : mean;
}
function algoKMeans(vals) {
  if (vals.length <= 1) return vals[0] || NaN;
  let c1 = Math.min(...vals), c2 = Math.max(...vals);
  for (let iter = 0; iter < 50; iter++) {
    const g1 = [], g2 = [];
    vals.forEach(v => (Math.abs(v - c1) <= Math.abs(v - c2) ? g1 : g2).push(v));
    const nc1 = g1.length ? algoAvg(g1) : c1;
    const nc2 = g2.length ? algoAvg(g2) : c2;
    if (Math.abs(nc1 - c1) < 0.01 && Math.abs(nc2 - c2) < 0.01) break;
    c1 = nc1; c2 = nc2;
  }
  return Math.min(c1, c2);
}

function runAlgo(algo, mat) {
  const vals = mat.prices.all.map(p => p.value);
  if (!vals.length) return NaN;
  switch (algo) {
    case 'min': return algoMin(vals);
    case 'avg': return algoAvg(vals);
    case 'wavg': return algoWeightedAvg(mat.prices);
    case 'median': return algoMedian(vals);
    case 'sigma': return algoSigma(vals);
    case 'kmeans': return algoKMeans(vals);
  }
}

const ALGO_NAMES = {
  min: 'Minimum', avg: 'Simple Avg', wavg: 'Weighted Avg',
  median: 'Median', sigma: 'Mean−1σ', kmeans: 'K-Means'
};
const ALGO_KEYS = Object.keys(ALGO_NAMES);

// ===== SELECTION =====
function selectAlgo(el) {
  document.querySelectorAll('.algo-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  selectedAlgo = el.dataset.algo;
}

// ===== FORMAT =====
function fmt(n) {
  if (isNaN(n) || n == null) return '—';
  return '₹ ' + Math.round(n).toLocaleString('en-IN');
}

// ===== CALCULATE =====
function calculate() {
  if (!parsedData) return;
  const { materials } = parsedData;

  // Run all algos for all materials
  const results = {};
  ALGO_KEYS.forEach(algo => {
    results[algo] = materials.map(m => runAlgo(algo, m));
  });

  const selResults = results[selectedAlgo];
  const validSel = selResults.filter(v => !isNaN(v));
  const avgBest = validSel.length ? algoAvg(validSel) : 0;

  // Market high = highest single price across all materials
  const allPrices = materials.flatMap(m => m.prices.all.map(p => p.value));
  const marketHigh = Math.max(...allPrices);
  const marketLow = Math.min(...allPrices);
  const savings = marketHigh > 0 ? ((marketHigh - avgBest) / marketHigh * 100) : 0;

  // KPI Main
  document.getElementById('kpiMain').innerHTML =
    `<div class="label">${ALGO_NAMES[selectedAlgo]} — Average Best Price</div>
     <div class="value">${fmt(avgBest)}</div>
     <div class="sub">↓ ${savings.toFixed(1)}% savings vs market high</div>`;

  // KPI Row
  document.getElementById('kpiRow').innerHTML =
    `<div class="kpi-card"><span class="kpi-icon">💰</span><div class="kpi-val">${fmt(marketLow)}</div><div class="kpi-label">Lowest Rate Found</div></div>
     <div class="kpi-card"><span class="kpi-icon">📦</span><div class="kpi-val">${materials.length}</div><div class="kpi-label">Materials Analyzed</div></div>
     <div class="kpi-card"><span class="kpi-icon">📈</span><div class="kpi-val">${fmt(marketHigh)}</div><div class="kpi-label">Highest Market Rate</div></div>`;

  // Material Cards
  let matHtml = '';
  materials.forEach((m, i) => {
    const bestVal = selResults[i];
    const bestSrc = !isNaN(bestVal) ? m.prices.all.reduce((best, p) =>
      Math.abs(p.value - bestVal) < Math.abs(best.value - bestVal) ? p : best, m.prices.all[0]) : null;

    matHtml += `<div class="mat-card"><div class="mat-card-head"><h4>${m.name}</h4>
      <span class="mat-card-best">${fmt(bestVal)}</span></div><div class="mat-card-body">`;

    ['ssr', 'budgetary', 'po'].forEach(g => {
      if (m.prices[g].length) {
        const label = g === 'ssr' ? 'SSR Values' : g === 'budgetary' ? 'Budgetary Offers' : 'Purchase Orders';
        matHtml += `<div class="price-group"><div class="price-group-label">${label}</div>`;
        m.prices[g].forEach(p => {
          const isBest = bestSrc && p.source === bestSrc.source && p.value === bestSrc.value;
          matHtml += `<div class="price-row${isBest ? ' best-price' : ''}"><span class="src">${p.source}</span><span class="val">${fmt(p.value)}</span></div>`;
        });
        matHtml += '</div>';
      }
    });
    matHtml += '</div></div>';
  });
  document.getElementById('matGrid').innerHTML = matHtml;

  // Comparison Table
  let tHtml = '<thead><tr><th>Material</th>';
  ALGO_KEYS.forEach(a => tHtml += `<th class="${a === selectedAlgo ? 'hl' : ''}">${ALGO_NAMES[a]}</th>`);
  tHtml += '</tr></thead><tbody>';
  materials.forEach((m, i) => {
    tHtml += `<tr><td>${m.name}</td>`;
    ALGO_KEYS.forEach(a => tHtml += `<td class="${a === selectedAlgo ? 'hl' : ''}">${fmt(results[a][i])}</td>`);
    tHtml += '</tr>';
  });
  // Average row
  tHtml += '<tr style="font-weight:700;border-top:2px solid var(--border)"><td>AVERAGE</td>';
  ALGO_KEYS.forEach(a => {
    const valid = results[a].filter(v => !isNaN(v));
    tHtml += `<td class="${a === selectedAlgo ? 'hl' : ''}">${fmt(valid.length ? algoAvg(valid) : NaN)}</td>`;
  });
  tHtml += '</tr></tbody>';
  document.getElementById('compTable').innerHTML = tHtml;

  // Chart
  if (chartInstance) chartInstance.destroy();
  const colors = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4'];
  chartInstance = new Chart(document.getElementById('priceChart'), {
    type: 'line',
    data: {
      labels: materials.map(m => m.name.length > 25 ? m.name.slice(0, 22) + '…' : m.name),
      datasets: ALGO_KEYS.map((a, idx) => ({
        label: ALGO_NAMES[a],
        data: results[a],
        borderColor: colors[idx],
        backgroundColor: colors[idx] + '22',
        borderWidth: a === selectedAlgo ? 3.5 : 1.5,
        pointRadius: a === selectedAlgo ? 5 : 3,
        tension: 0.3,
        fill: a === selectedAlgo
      }))
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: '#e2e8f0', font: { family: 'Inter' } } },
        tooltip: {
          callbacks: { label: ctx => ctx.dataset.label + ': ' + fmt(ctx.parsed.y) }
        }
      },
      scales: {
        x: { ticks: { color: '#8899b4', font: { size: 10 } }, grid: { color: '#1e2a42' } },
        y: {
          ticks: { color: '#8899b4', callback: v => '₹' + (v / 100000).toFixed(1) + 'L' },
          grid: { color: '#1e2a42' }
        }
      }
    }
  });

  document.getElementById('results').style.display = 'block';
  document.getElementById('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
