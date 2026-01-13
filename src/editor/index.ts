/**
 * NeoFermi Markdown Editor
 *
 * A live-updating markdown editor with embedded neofermi expression support.
 */

import { createEditor } from './codemirror-setup.js'
import { processMarkdown } from './markdown-processor.js'
import { evaluateExpressions } from './expression-evaluator.js'
import { renderVisualizations, VizType } from './preview-renderer.js'
import type { EditorView } from '@codemirror/view'

// Constants
const STORAGE_KEY = 'neofermi-editor'
const THEME_KEY = 'neofermi-theme'
const DEBOUNCE_MS = 400

const DEFAULT_CONTENT = `# NeoFermi Editor

Write markdown with embedded calculations. Use fenced code blocks for NeoFermi expressions:

\`\`\`
distance = 10 to 100 km
time = 1 to 2 hours
speed = distance / time
\`\`\`

Reference variables inline: the speed is approximately \${speed}.

## Try more examples

\`\`\`
# How many piano tuners in Chicago?
population = 2.7e6          # Chicago metro population
pianos_per_household = 1 of 20    # ~5% of households have pianos
households = population / 2.5      # avg household size
pianos = households * pianos_per_household

tunings_per_year = 1 to 2
tuning_time = 2 hours
tunings_per_tuner = 8 hours * 250 days / tuning_time

piano_tuners = pianos * tunings_per_year / tunings_per_tuner
\`\`\`

There are approximately \${piano_tuners} piano tuners in Chicago.
`

// State
let editorView: EditorView
let vizType: VizType = 'dotplot'
let currentTheme: 'light' | 'dark' = 'light'
let debounceTimer: ReturnType<typeof setTimeout> | null = null

// DOM Elements
const editorPane = document.getElementById('editor-pane')!
const previewContent = document.getElementById('preview-content')!
const statusEl = document.getElementById('status')!
const resizer = document.getElementById('resizer')!

// =====================
// Initialization
// =====================

function init() {
  // Load and apply saved theme
  loadTheme()

  // Load content: URL hash > localStorage > default
  const content = loadFromHash() || loadFromStorage() || DEFAULT_CONTENT

  // Initialize CodeMirror
  editorView = createEditor(editorPane, content, onContentChange)

  // Initial render
  updatePreview(content)

  // Set up event listeners
  setupResizer()
  setupVizToggle()
  setupThemeToggle()
  setupModals()
  setupKeyboardShortcuts()
  setupExport()
  setupShare()

  setStatus('Ready')
}

// =====================
// Preview Updates
// =====================

function onContentChange(content: string) {
  // Save to localStorage immediately
  saveToStorage(content)

  // Debounce preview updates
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  debounceTimer = setTimeout(() => {
    updatePreview(content)
  }, DEBOUNCE_MS)
}

function updatePreview(content: string) {
  setStatus('Evaluating...')

  try {
    // Process markdown and extract expressions
    const doc = processMarkdown(content)

    // Evaluate all expressions top-to-bottom
    const results = evaluateExpressions(doc.expressions)

    // Render the preview HTML
    const html = doc.render(results)
    previewContent.innerHTML = html

    // Render visualizations
    renderVisualizations(previewContent, vizType)

    setStatus('Ready')
  } catch (err) {
    console.error('Preview error:', err)
    setStatus('Error')
  }
}

// =====================
// Storage
// =====================

function saveToStorage(content: string) {
  try {
    localStorage.setItem(STORAGE_KEY, content)
  } catch {
    // Ignore storage errors
  }
}

function loadFromStorage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

// =====================
// URL Hash Sharing
// =====================

function encodeContent(content: string): string {
  return btoa(encodeURIComponent(content))
}

function decodeContent(encoded: string): string | null {
  try {
    return decodeURIComponent(atob(encoded))
  } catch {
    return null
  }
}

function loadFromHash(): string | null {
  const hash = window.location.hash.slice(1)
  if (!hash) return null
  return decodeContent(hash)
}

function shareDocument() {
  const content = editorView.state.doc.toString()
  if (!content.trim()) {
    setStatus('Nothing to share')
    return
  }

  const encoded = encodeContent(content)
  const url = `${window.location.origin}${window.location.pathname}#${encoded}`

  // Update URL without reload
  window.history.replaceState(null, '', `#${encoded}`)

  // Copy to clipboard
  navigator.clipboard.writeText(url).then(() => {
    setStatus('Link copied!')
  }).catch(() => {
    prompt('Share this link:', url)
    setStatus('Link ready')
  })
}

// =====================
// Export
// =====================

function exportDocument() {
  const content = editorView.state.doc.toString()
  if (!content.trim()) {
    setStatus('Nothing to export')
    return
  }

  const blob = new Blob([content], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'neofermi-document.md'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  setStatus('Exported')
}

// =====================
// Resizer
// =====================

function setupResizer() {
  let isResizing = false
  let startX = 0
  let startWidth = 0

  resizer.addEventListener('mousedown', (e) => {
    isResizing = true
    startX = e.clientX
    startWidth = editorPane.offsetWidth
    resizer.classList.add('dragging')
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  })

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return

    const diff = e.clientX - startX
    const newWidth = Math.max(200, Math.min(startWidth + diff, window.innerWidth - 200))
    editorPane.style.flex = 'none'
    editorPane.style.width = `${newWidth}px`
  })

  document.addEventListener('mouseup', () => {
    if (!isResizing) return
    isResizing = false
    resizer.classList.remove('dragging')
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  })

  // Touch support for mobile
  resizer.addEventListener('touchstart', (e) => {
    isResizing = true
    startX = e.touches[0].clientX
    startWidth = editorPane.offsetWidth
    resizer.classList.add('dragging')
  })

  document.addEventListener('touchmove', (e) => {
    if (!isResizing) return

    const diff = e.touches[0].clientX - startX
    const newWidth = Math.max(200, Math.min(startWidth + diff, window.innerWidth - 200))
    editorPane.style.flex = 'none'
    editorPane.style.width = `${newWidth}px`
  })

  document.addEventListener('touchend', () => {
    if (!isResizing) return
    isResizing = false
    resizer.classList.remove('dragging')
  })
}

// =====================
// Viz Toggle
// =====================

function setupVizToggle() {
  const buttons = document.querySelectorAll('[data-viz]')

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const newVizType = (btn as HTMLElement).dataset.viz as VizType
      if (newVizType === vizType) return

      vizType = newVizType

      // Update button states
      buttons.forEach((b) => b.classList.remove('active'))
      btn.classList.add('active')

      // Re-render visualizations
      renderVisualizations(previewContent, vizType)
    })
  })
}

// =====================
// Theme Toggle
// =====================

function loadTheme() {
  const saved = localStorage.getItem(THEME_KEY)
  if (saved === 'dark' || saved === 'light') {
    currentTheme = saved
  } else {
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      currentTheme = 'dark'
    }
  }
  applyTheme()
}

function applyTheme() {
  const themeBtn = document.getElementById('theme-btn')!

  if (currentTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark')
    themeBtn.textContent = 'Light'
  } else {
    document.documentElement.removeAttribute('data-theme')
    themeBtn.textContent = 'Dark'
  }
}

function toggleTheme() {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark'
  applyTheme()
  localStorage.setItem(THEME_KEY, currentTheme)
}

function setupThemeToggle() {
  const themeBtn = document.getElementById('theme-btn')!
  themeBtn.addEventListener('click', toggleTheme)
}

// =====================
// Modals
// =====================

function setupModals() {
  const helpModal = document.getElementById('help-modal')!
  const helpBtn = document.getElementById('help-btn')!
  const closeHelp = document.getElementById('close-help')!

  helpBtn.addEventListener('click', () => {
    helpModal.classList.add('visible')
  })

  closeHelp.addEventListener('click', () => {
    helpModal.classList.remove('visible')
  })

  helpModal.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
      helpModal.classList.remove('visible')
    }
  })
}

// =====================
// Keyboard Shortcuts
// =====================

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + S: Share
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      shareDocument()
      return
    }

    // Ctrl/Cmd + E: Export
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
      e.preventDefault()
      exportDocument()
      return
    }

    // Escape: Close modals
    if (e.key === 'Escape') {
      document.getElementById('help-modal')?.classList.remove('visible')
    }
  })
}

// =====================
// Export/Share Buttons
// =====================

function setupExport() {
  const exportBtn = document.getElementById('export-btn')!
  exportBtn.addEventListener('click', exportDocument)
}

function setupShare() {
  const shareBtn = document.getElementById('share-btn')!
  shareBtn.addEventListener('click', shareDocument)
}

// =====================
// Status
// =====================

function setStatus(msg: string) {
  statusEl.textContent = msg
}

// =====================
// Start
// =====================

init()
