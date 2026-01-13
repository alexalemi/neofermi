/**
 * CodeMirror 6 setup for the NeoFermi markdown editor
 */

import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view'
import { EditorState, Extension, Compartment } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { syntaxHighlighting, defaultHighlightStyle, HighlightStyle } from '@codemirror/language'
import { tags } from '@lezer/highlight'
import { vim } from '@replit/codemirror-vim'

// Compartments for dynamically reconfigurable options
const vimCompartment = new Compartment()
const lineNumbersCompartment = new Compartment()
const lineWrappingCompartment = new Compartment()
const tabSizeCompartment = new Compartment()
const fontSizeCompartment = new Compartment()

/**
 * Editor configuration options (exposed in settings modal)
 */
export interface EditorConfig {
  lineNumbers: boolean
  lineWrapping: boolean
  tabSize: number
  fontSize: number
  vim: boolean
}

export const DEFAULT_CONFIG: EditorConfig = {
  lineNumbers: true,
  lineWrapping: true,
  tabSize: 2,
  fontSize: 14,
  vim: false,
}

/**
 * Theme-agnostic base styles for CodeMirror
 * Colors are handled via CSS variables in styles.css
 */
const baseTheme = EditorView.theme({
  '.cm-content': {
    fontFamily: "'Menlo', 'Monaco', 'Courier New', monospace",
  },
  '.cm-foldPlaceholder': {
    backgroundColor: 'transparent',
    border: 'none',
  },
  // Vim mode cursor styling
  '.cm-fat-cursor': {
    background: 'var(--accent) !important',
  },
  '.cm-cursor-primary': {
    borderLeftColor: 'var(--text-primary)',
  },
})

/**
 * Syntax highlighting styles
 */
const highlightStyle = HighlightStyle.define([
  { tag: tags.heading, fontWeight: 'bold' },
  { tag: tags.heading1, fontSize: '1.4em' },
  { tag: tags.heading2, fontSize: '1.2em' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strong, fontWeight: 'bold' },
  { tag: tags.quote, fontStyle: 'italic' },
])

/**
 * Create a font size theme extension
 */
function fontSizeTheme(size: number): Extension {
  return EditorView.theme({
    '.cm-content': { fontSize: `${size}px` },
    '.cm-gutters': { fontSize: `${size}px` },
  })
}

/**
 * Create a CodeMirror editor instance
 */
export function createEditor(
  parent: HTMLElement,
  initialContent: string,
  onChange: (content: string) => void,
  config: EditorConfig = DEFAULT_CONFIG
): EditorView {
  const updateListener = EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      onChange(update.state.doc.toString())
    }
  })

  const extensions: Extension[] = [
    // Compartmentalized options (can be reconfigured at runtime)
    lineNumbersCompartment.of(config.lineNumbers ? lineNumbers() : []),
    lineWrappingCompartment.of(config.lineWrapping ? EditorView.lineWrapping : []),
    tabSizeCompartment.of(EditorState.tabSize.of(config.tabSize)),
    fontSizeCompartment.of(fontSizeTheme(config.fontSize)),
    vimCompartment.of(config.vim ? vim() : []),
    // Static extensions
    highlightActiveLine(),
    highlightActiveLineGutter(),
    history(),
    markdown(),
    baseTheme,
    syntaxHighlighting(highlightStyle),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    keymap.of([
      ...defaultKeymap,
      ...historyKeymap,
    ]),
    updateListener,
  ]

  const state = EditorState.create({
    doc: initialContent,
    extensions,
  })

  return new EditorView({
    state,
    parent,
  })
}

/**
 * Apply editor configuration (reconfigures all compartments)
 */
export function applyConfig(view: EditorView, config: EditorConfig): void {
  view.dispatch({
    effects: [
      lineNumbersCompartment.reconfigure(config.lineNumbers ? lineNumbers() : []),
      lineWrappingCompartment.reconfigure(config.lineWrapping ? EditorView.lineWrapping : []),
      tabSizeCompartment.reconfigure(EditorState.tabSize.of(config.tabSize)),
      fontSizeCompartment.reconfigure(fontSizeTheme(config.fontSize)),
      vimCompartment.reconfigure(config.vim ? vim() : []),
    ],
  })
}

/**
 * Update the editor content programmatically
 */
export function setEditorContent(view: EditorView, content: string): void {
  view.dispatch({
    changes: {
      from: 0,
      to: view.state.doc.length,
      insert: content,
    },
  })
}
