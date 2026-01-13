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

function renderDotplot(quantiles, min, max, unit) {
  const width = 300;
  const height = 80;
  const padding = 10;
  const dotRadius = 3;

  const canvas = document.createElement('canvas');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  // Determine if log scale
  const range = max - min;
  const useLog = min > 0 && max > 0 && (max / min) > 100;

  function scale(v) {
    if (useLog) {
      const logMin = Math.log10(min);
      const logMax = Math.log10(max);
      const logV = Math.log10(v);
      return padding + ((logV - logMin) / (logMax - logMin)) * (width - 2 * padding);
    }
    return padding + ((v - min) / range) * (width - 2 * padding);
  }

  // Draw dots
  ctx.fillStyle = '#4ec9b0';
  const numDots = quantiles.length;
  const dotSpacing = (height - 2 * padding - 20) / Math.ceil(Math.sqrt(numDots));

  quantiles.forEach((val, i) => {
    const x = scale(val);
    const row = Math.floor(i / 10);
    const y = padding + row * dotSpacing + dotRadius;

    ctx.beginPath();
    ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
    ctx.fill();
  });

  // Draw axis
  const axisY = height - 15;
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, axisY);
  ctx.lineTo(width - padding, axisY);
  ctx.stroke();

  // Draw axis labels
  ctx.fillStyle = '#888';
  ctx.font = '9px -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(formatAxisNum(min), padding, axisY + 10);
  ctx.textAlign = 'right';
  ctx.fillText(formatAxisNum(max), width - padding, axisY + 10);

  return canvas;
}

function formatAxisNum(n) {
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs >= 10000 || abs < 0.001) return n.toExponential(0);
  if (abs >= 100) return n.toFixed(0);
  if (abs >= 1) return n.toFixed(1);
  return n.toPrecision(2);
}

// Run on page load
document.addEventListener('DOMContentLoaded', renderVisualizations);
`
}
