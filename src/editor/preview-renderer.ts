/**
 * Preview renderer for NeoFermi markdown editor
 *
 * Renders the preview HTML and attaches visualization canvases
 * to distribution results.
 */

import { createDotplotCanvas, createHistogramCanvas } from '../visualization/index.js'

// Declare MathJax types for TypeScript
declare global {
  interface Window {
    MathJax?: {
      typesetPromise?: (elements?: HTMLElement[]) => Promise<void>
      texReset?: () => void
      typesetClear?: (elements?: HTMLElement[]) => void
    }
    MathJaxReady?: boolean
  }
}

export type VizType = 'dotplot' | 'histogram'

/**
 * Typeset math expressions in the container using MathJax
 */
export async function typesetMath(container: HTMLElement): Promise<void> {
  if (!window.MathJaxReady || !window.MathJax?.typesetPromise) {
    return
  }

  try {
    // Clear any previously typeset math in this container
    if (window.MathJax.typesetClear) {
      window.MathJax.typesetClear([container])
    }
    // Typeset the container
    await window.MathJax.typesetPromise([container])
  } catch (err) {
    console.warn('MathJax typesetting error:', err)
  }
}

/**
 * Render visualizations for all nf-viz placeholders in the container
 */
export function renderVisualizations(
  container: HTMLElement,
  vizType: VizType,
  options: { width?: number; height?: number } = {}
): void {
  // Colors come from the theme tokens in styles.css so dark mode follows.
  const css = getComputedStyle(container)
  const dotColor = css.getPropertyValue('--viz-dot').trim() || 'rgba(46, 90, 172, 0.85)'
  const axisColor = css.getPropertyValue('--text-muted').trim() || '#6b6b7b'
  const height = options.height || 96

  const vizElements = container.querySelectorAll('.nf-viz')

  vizElements.forEach((el) => {
    const vizEl = el as HTMLElement

    // Parse data attributes. Histograms need the finer quantile set —
    // binning the 20 dotplot quantiles produces single-digit noise counts.
    const samplesJson =
      vizType === 'histogram'
        ? vizEl.dataset.histSamples || vizEl.dataset.samples
        : vizEl.dataset.samples
    const unit = vizEl.dataset.unit || ''

    if (!samplesJson) {
      return
    }

    let samples: number[]
    try {
      samples = JSON.parse(samplesJson)
    } catch {
      return
    }

    // Clear any existing canvas
    vizEl.innerHTML = ''

    // Fit the column, but stay a figure rather than a banner.
    const width = options.width || Math.round(Math.min(440, Math.max(240, vizEl.clientWidth - 32)))
    const vizOptions = {
      width,
      height,
      numDots: 20,
      numBins: 25,
      dotRadius: 6, // Larger dots create wider bins for better stacking
      dotColor,
      barColor: dotColor,
      axisColor,
      axisLabel: unit, // Show unit as axis label
    }

    let canvas: HTMLCanvasElement | null
    if (vizType === 'histogram') {
      canvas = createHistogramCanvas(samples, unit, vizOptions)
    } else {
      canvas = createDotplotCanvas(samples, unit, vizOptions)
    }

    if (canvas) {
      vizEl.appendChild(canvas)
    }
  })
}
