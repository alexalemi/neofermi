/**
 * Browser-side dotplot renderer for NeoFermi notebooks
 *
 * This file is bundled by esbuild into an IIFE, then embedded as a string
 * constant in the CLI bundle. It uses the canonical visualization modules
 * (axisUtils + quantileDotplot) so the rendering logic lives in one place.
 *
 * Theme colors are read from CSS custom properties (--nf-dot-color, etc.)
 * set by the notebook stylesheet.
 */

import {
  shouldUseLogScale,
  generateLinearTicks,
  generateLogTicks,
  formatAxisNumber,
  createScale,
} from '../../visualization/axisUtils.js'

function getColor(el: Element, prop: string, fallback: string): string {
  return getComputedStyle(el).getPropertyValue(prop).trim() || fallback
}

export function renderDotplots(): void {
  document.querySelectorAll('.nf-viz').forEach((el) => {
    const samplesStr = (el as HTMLElement).dataset.samples
    const unit = (el as HTMLElement).dataset.unit || ''
    const min = parseFloat((el as HTMLElement).dataset.min || '0')
    const max = parseFloat((el as HTMLElement).dataset.max || '1')

    if (!samplesStr) return

    let samples: number[]
    try {
      samples = JSON.parse(samplesStr)
    } catch {
      return
    }
    if (samples.length === 0) return

    // Read theme colors from CSS custom properties
    const dotColor = getColor(el, '--nf-dot-color', '#4ec9b0')
    const axisColor = getColor(el, '--nf-axis-color', '#666')
    const labelColor = getColor(el, '--nf-label-color', '#999')
    const unitColor = getColor(el, '--nf-unit-color', '#777')
    const bgColor = getColor(el, '--nf-viz-bg', 'transparent')

    const width = 280
    const height = 90
    const padding = 25
    const dotRadius = 5
    const axisHeight = 20

    const dpr = window.devicePixelRatio || 1
    const canvas = document.createElement('canvas')
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = width + 'px'
    canvas.style.height = height + 'px'
    el.appendChild(canvas)

    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)

    // Background
    if (bgColor !== 'transparent') {
      ctx.fillStyle = bgColor
      ctx.fillRect(0, 0, width, height)
    }

    const useLog = shouldUseLogScale(min, max)
    const scale = createScale(min, max, padding, width - padding, useLog)

    // Generate nice ticks
    const ticks = useLog
      ? generateLogTicks(min, max)
      : generateLinearTicks(min, max, 5)

    // Bin dots by X position to stack them vertically
    const binWidth = dotRadius * 2.2
    const bins = new Map<number, number[]>()
    for (const v of samples) {
      const x = scale(v)
      const binIndex = Math.round(x / binWidth)
      if (!bins.has(binIndex)) bins.set(binIndex, [])
      bins.get(binIndex)!.push(v)
    }

    // Draw stacked dots
    const baseY = height - axisHeight - dotRadius - 2
    ctx.fillStyle = dotColor
    bins.forEach((dots, binIndex) => {
      const x = binIndex * binWidth
      dots.forEach((_v, i) => {
        const y = baseY - i * (dotRadius * 2.2)
        if (y > dotRadius) {
          ctx.beginPath()
          ctx.arc(x, y, dotRadius, 0, Math.PI * 2)
          ctx.fill()
        }
      })
    })

    // Draw axis line
    const axisY = height - axisHeight
    ctx.strokeStyle = axisColor
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(padding, axisY)
    ctx.lineTo(width - padding, axisY)
    ctx.stroke()

    // Draw ticks and labels
    ctx.fillStyle = labelColor
    ctx.font = '10px -apple-system, sans-serif'
    ctx.textAlign = 'center'
    for (const tick of ticks) {
      const x = scale(tick)
      ctx.beginPath()
      ctx.moveTo(x, axisY)
      ctx.lineTo(x, axisY + 4)
      ctx.stroke()
      ctx.fillText(formatAxisNumber(tick), x, axisY + 14)
    }

    // Unit label on right
    if (unit) {
      ctx.fillStyle = unitColor
      ctx.textAlign = 'right'
      ctx.fillText(unit, width - 5, axisY + 14)
    }
  })
}

// Auto-run on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderDotplots)
} else {
  renderDotplots()
}
