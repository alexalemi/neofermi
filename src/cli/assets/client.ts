/**
 * Browser client script for NeoFermi notebooks
 *
 * Handles SSE live reload and client-side visualization rendering.
 */

export function getClientScript(): string {
  return `
// SSE Live Reload
const eventSource = new EventSource('/events');

eventSource.addEventListener('reload', () => {
  console.log('Reloading...');
  window.location.reload();
});

eventSource.addEventListener('connected', () => {
  console.log('Connected to NeoFermi notebook server');
});

eventSource.addEventListener('error', (e) => {
  console.log('SSE connection error, will retry...');
});

// Visualization Rendering
function renderVisualizations() {
  document.querySelectorAll('.nf-viz').forEach(el => {
    const samplesStr = el.dataset.samples;
    const unit = el.dataset.unit || '';
    const min = parseFloat(el.dataset.min || '0');
    const max = parseFloat(el.dataset.max || '1');

    if (!samplesStr) return;

    try {
      const samples = JSON.parse(samplesStr);
      const canvas = renderDotplot(samples, min, max, unit);
      el.appendChild(canvas);
    } catch (err) {
      console.error('Failed to render visualization:', err);
    }
  });
}

// Nice number for tick marks (1, 2, 5, 10, 20, 50, etc.)
function niceNum(x, round) {
  if (x === 0) return 0;
  const exp = Math.floor(Math.log10(Math.abs(x)));
  const f = x / Math.pow(10, exp);
  let nf;
  if (round) {
    nf = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10;
  } else {
    nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  }
  return nf * Math.pow(10, exp);
}

function generateLinearTicks(min, max, maxTicks = 5) {
  const range = niceNum(max - min, false);
  const spacing = niceNum(range / (maxTicks - 1), true);
  const niceMin = Math.floor(min / spacing) * spacing;
  const niceMax = Math.ceil(max / spacing) * spacing;
  const ticks = [];
  for (let t = niceMin; t <= niceMax + spacing * 0.5; t += spacing) {
    if (t >= min && t <= max) ticks.push(t);
  }
  return ticks;
}

function generateLogTicks(min, max) {
  if (min <= 0 || max <= 0) return [];
  const minExp = Math.floor(Math.log10(min));
  const maxExp = Math.ceil(Math.log10(max));
  const ticks = [];
  for (let exp = minExp; exp <= maxExp; exp++) {
    const tick = Math.pow(10, exp);
    if (tick >= min * 0.99 && tick <= max * 1.01) ticks.push(tick);
  }
  if (ticks.length <= 2) {
    const allTicks = [];
    for (let exp = minExp; exp <= maxExp; exp++) {
      for (const mult of [1, 2, 5]) {
        const tick = mult * Math.pow(10, exp);
        if (tick >= min * 0.99 && tick <= max * 1.01) allTicks.push(tick);
      }
    }
    return allTicks;
  }
  return ticks;
}

function formatAxisNum(n) {
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs >= 10000 || abs < 0.001) return n.toExponential(0);
  if (Math.abs(n - Math.round(n)) < 0.001) return Math.round(n).toString();
  if (abs >= 100) return n.toFixed(0);
  if (abs >= 10) return n.toFixed(1);
  if (abs >= 1) return n.toFixed(2);
  return n.toPrecision(2);
}

function renderDotplot(quantiles, min, max, unit) {
  const width = 500;
  const height = 90;
  const padding = 30;
  const dotRadius = 4;
  const axisHeight = 20;

  const canvas = document.createElement('canvas');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  // Determine if log scale (2+ decades)
  const useLog = min > 0 && max > 0 && (max / min) > 100;

  function scale(v) {
    if (useLog) {
      const logMin = Math.log10(min);
      const logMax = Math.log10(max);
      const logV = Math.log10(v);
      return padding + ((logV - logMin) / (logMax - logMin)) * (width - 2 * padding);
    }
    return padding + ((v - min) / (max - min)) * (width - 2 * padding);
  }

  // Generate nice ticks
  const ticks = useLog ? generateLogTicks(min, max) : generateLinearTicks(min, max, 5);

  // Bin dots by X position to stack them
  const binWidth = dotRadius * 2.2;
  const bins = new Map();
  quantiles.forEach(v => {
    const x = scale(v);
    const binIndex = Math.round(x / binWidth);
    if (!bins.has(binIndex)) bins.set(binIndex, []);
    bins.get(binIndex).push({ x, v });
  });

  // Draw stacked dots from bottom up
  const baseY = height - axisHeight - dotRadius - 2;
  ctx.fillStyle = '#4ec9b0';
  bins.forEach(dots => {
    dots.forEach((dot, i) => {
      const y = baseY - i * (dotRadius * 2.2);
      if (y > dotRadius) {
        ctx.beginPath();
        ctx.arc(dot.x, y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  });

  // Draw axis line
  const axisY = height - axisHeight;
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, axisY);
  ctx.lineTo(width - padding, axisY);
  ctx.stroke();

  // Draw ticks and labels
  ctx.fillStyle = '#999';
  ctx.font = '10px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ticks.forEach(tick => {
    const x = scale(tick);
    // Tick mark
    ctx.beginPath();
    ctx.moveTo(x, axisY);
    ctx.lineTo(x, axisY + 4);
    ctx.stroke();
    // Label
    ctx.fillText(formatAxisNum(tick), x, axisY + 14);
  });

  // Unit label on right
  if (unit) {
    ctx.fillStyle = '#777';
    ctx.textAlign = 'right';
    ctx.fillText(unit, width - 5, axisY + 14);
  }

  return canvas;
}

// Run on page load
document.addEventListener('DOMContentLoaded', renderVisualizations);
`
}
