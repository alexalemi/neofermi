/**
 * NeoFermi Markdown Editor
 *
 * A live-updating markdown editor with embedded neofermi expression support.
 */

import { createEditor, applyConfig, DEFAULT_CONFIG } from './codemirror-setup.js'
import type { EditorConfig } from './codemirror-setup.js'
import { processMarkdown } from './markdown-processor.js'
import { evaluateExpressions } from './expression-evaluator.js'
import { renderVisualizations, typesetMath, VizType } from './preview-renderer.js'
import type { EditorView } from '@codemirror/view'
import { SYNTAX_HELP } from '../help/syntax.js'

// Constants
const STORAGE_KEY = 'neofermi-editor'
const THEME_KEY = 'neofermi-theme'
const SETTINGS_KEY = 'neofermi-settings'
const DEBOUNCE_MS = 400

const DEFAULT_CONTENT = `# How many piano tuners work in Chicago?

Write prose in markdown and calculations in fenced code blocks. A range like
\`3% to 10%\` means the true value is probably (68%, one sigma) in between;
the answer carries the combined uncertainty and the units.

\`\`\`
households = 3.4 to 4 million
have_piano = 3% to 10%
tunings = 0.5 to 2 per year
capacity = 3 to 5 per day * 220 day/year
tuners = households * have_piano * tunings / capacity
\`\`\`

So Chicago has about \${tuners} piano tuners. The Bureau of Labor Statistics
counts 150 instrument repairers and tuners in the metro area (May 2025),
not counting the self-employed.

Which guess matters most?

\`\`\`
sensitivity(tuners)
\`\`\`

LaTeX works too: $N = H p t / c$.
`

// State
let editorView: EditorView
let vizType: VizType = 'dotplot'
let currentTheme: 'light' | 'dark' = 'light'
let currentConfig: EditorConfig = { ...DEFAULT_CONFIG }
let debounceTimer: ReturnType<typeof setTimeout> | null = null
// Name of the last opened file, reused as the Export filename.
let documentName = 'neofermi-document.md'

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

  // Load editor config (vim, font size, etc.)
  loadConfig()

  // Load content: URL hash > localStorage > default
  const content = loadFromHash() || loadFromStorage() || DEFAULT_CONTENT

  // Initialize CodeMirror with config
  editorView = createEditor(editorPane, content, onContentChange, currentConfig)

  // Initial render
  updatePreview(content)

  // Set up event listeners
  setupResizer()
  setupVizToggle()
  setupThemeToggle()
  setupModals()
  setupSettingsModal()
  setupKeyboardShortcuts()
  setupExport()
  setupShare()
  setupOpen()

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

async function updatePreview(content: string) {
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

    // Typeset any LaTeX math expressions
    await typesetMath(previewContent)

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
  a.download = documentName
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
  // Plot colors are read from the theme tokens, so redraw them.
  renderVisualizations(previewContent, vizType)
}

function setupThemeToggle() {
  const themeBtn = document.getElementById('theme-btn')!
  themeBtn.addEventListener('click', toggleTheme)
}

// =====================
// Editor Config / Settings
// =====================

function loadConfig() {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      currentConfig = { ...DEFAULT_CONFIG, ...parsed }
    }
  } catch {
    // Use defaults on parse error
  }
}

function saveConfig() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(currentConfig, null, 2))
  } catch {
    // Ignore storage errors
  }
}

function setupSettingsModal() {
  const settingsModal = document.getElementById('settings-modal')!
  const settingsBtn = document.getElementById('settings-btn')!
  const closeSettings = document.getElementById('close-settings')!
  const settingsJson = document.getElementById('settings-json') as HTMLTextAreaElement
  const settingsError = document.getElementById('settings-error')!
  const applyBtn = document.getElementById('apply-settings')!
  const resetBtn = document.getElementById('reset-settings')!

  // Open modal
  settingsBtn.addEventListener('click', () => {
    settingsJson.value = JSON.stringify(currentConfig, null, 2)
    settingsError.textContent = ''
    settingsModal.classList.add('visible')
  })

  // Close modal
  closeSettings.addEventListener('click', () => {
    settingsModal.classList.remove('visible')
  })

  settingsModal.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
      settingsModal.classList.remove('visible')
    }
  })

  // Apply settings
  applyBtn.addEventListener('click', () => {
    const result = validateAndParseConfig(settingsJson.value)

    if (result.error) {
      settingsError.textContent = result.error
      return
    }

    currentConfig = result.config!
    applyConfig(editorView, currentConfig)
    saveConfig()
    settingsError.textContent = ''
    settingsModal.classList.remove('visible')
    setStatus('Settings applied')
  })

  // Reset to defaults
  resetBtn.addEventListener('click', () => {
    currentConfig = { ...DEFAULT_CONFIG }
    settingsJson.value = JSON.stringify(currentConfig, null, 2)
    applyConfig(editorView, currentConfig)
    saveConfig()
    settingsError.textContent = ''
    setStatus('Settings reset')
  })
}

/**
 * Parse the settings JSON, merging it over the defaults. Returns the merged
 * config, or an error message if the text isn't valid JSON.
 */
function validateAndParseConfig(jsonStr: string): { config?: EditorConfig; error?: string } {
  try {
    const parsed = JSON.parse(jsonStr)
    return { config: { ...DEFAULT_CONFIG, ...parsed } }
  } catch {
    return { error: 'Invalid JSON' }
  }
}

// =====================
// Modals
// =====================

/** Render the shared DSL cheat-sheet (src/help/syntax.ts) into the help modal. */
function renderSyntaxHelp() {
  const container = document.getElementById('syntax-help')
  if (!container) return
  for (const section of SYNTAX_HELP) {
    const h4 = document.createElement('h4')
    h4.textContent = section.title
    const pre = document.createElement('pre')
    const width = Math.min(28, Math.max(...section.entries.map((e) => e.code.length)))
    pre.textContent = section.entries
      .map((e) => `${e.code.padEnd(width)}  # ${e.note}`)
      .join('\n')
    container.append(h4, pre)
  }
}

function setupModals() {
  renderSyntaxHelp()
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
      document.getElementById('settings-modal')?.classList.remove('visible')
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
// Opening files (button or drag and drop)
// =====================

const OPENABLE = /\.(md|markdown|txt)$/i

/**
 * Replace the document with a file's text. It goes through a normal editor
 * transaction, so Ctrl+Z brings back what was there before.
 */
async function openFile(file: File) {
  if (!OPENABLE.test(file.name) && !file.type.startsWith('text/')) {
    setStatus(`Can't open ${file.name}: choose a .md or .txt file`)
    return
  }
  const text = await file.text()
  editorView.dispatch({
    changes: { from: 0, to: editorView.state.doc.length, insert: text },
    selection: { anchor: 0 },
    scrollIntoView: true,
  })
  documentName = file.name
  // A share-link hash would describe the old document.
  window.history.replaceState(null, '', window.location.pathname)

  // Render now rather than after the debounce, then say what happened.
  if (debounceTimer) clearTimeout(debounceTimer)
  await updatePreview(text)
  setStatus(`Opened ${file.name} (Ctrl+Z to undo)`)
}

function setupOpen() {
  const openBtn = document.getElementById('open-btn')!
  const fileInput = document.getElementById('open-file') as HTMLInputElement
  openBtn.addEventListener('click', () => fileInput.click())
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0]
    if (file) openFile(file)
    fileInput.value = '' // let the same file be chosen again
  })

  // Drag and drop anywhere on the page. Capture phase, so a file dropped on
  // the editor opens as the document instead of CodeMirror inserting it.
  const hasFiles = (e: DragEvent) => e.dataTransfer?.types.includes('Files') ?? false
  let depth = 0 // dragenter/leave fire for every child element crossed
  window.addEventListener('dragenter', (e) => {
    if (!hasFiles(e)) return
    depth++
    document.body.classList.add('dropping')
  }, true)
  window.addEventListener('dragleave', (e) => {
    if (!hasFiles(e)) return
    if (--depth <= 0) {
      depth = 0
      document.body.classList.remove('dropping')
    }
  }, true)
  window.addEventListener('dragover', (e) => {
    if (!hasFiles(e)) return
    e.preventDefault()
    e.dataTransfer!.dropEffect = 'copy'
  }, true)
  window.addEventListener('drop', (e) => {
    if (!hasFiles(e)) return
    e.preventDefault()
    e.stopPropagation()
    depth = 0
    document.body.classList.remove('dropping')
    const file = e.dataTransfer!.files[0]
    if (file) openFile(file)
  }, true)
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
