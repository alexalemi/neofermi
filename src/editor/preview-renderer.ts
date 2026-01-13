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
  const width = options.width || 280
  const height = options.height || 105

  const vizElements = container.querySelectorAll('.nf-viz')

  vizElements.forEach((el) => {
    const vizEl = el as HTMLElement

    // Parse data attributes
    const samplesJson = vizEl.dataset.samples
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

    // Create visualization canvas
    const vizOptions = {
      width,
      height,
      numDots: 20,
      numBins: 25,
      dotColor: '#4ec9b0',
      barColor: '#4ec9b0',
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
