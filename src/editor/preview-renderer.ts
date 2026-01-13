/**
 * Preview renderer for NeoFermi markdown editor
 *
 * Renders the preview HTML and attaches visualization canvases
 * to distribution results.
 */

import { createDotplotCanvas, createHistogramCanvas } from '../visualization/index.js'

export type VizType = 'dotplot' | 'histogram'

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
