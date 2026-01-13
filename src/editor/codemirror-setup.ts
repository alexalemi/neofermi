/**
 * CodeMirror 6 setup for the NeoFermi markdown editor
 */

import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view'
import { EditorState, Extension } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { syntaxHighlighting, defaultHighlightStyle, HighlightStyle } from '@codemirror/language'
import { tags } from '@lezer/highlight'

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
 * Create a CodeMirror editor instance
 */
export function createEditor(
  parent: HTMLElement,
  initialContent: string,
  onChange: (content: string) => void
): EditorView {
  const updateListener = EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      onChange(update.state.doc.toString())
    }
  })

  const extensions: Extension[] = [
    lineNumbers(),
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
    EditorView.lineWrapping,
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
