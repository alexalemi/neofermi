/**
 * CSS styles for NeoFermi notebooks
 */

export function getStyles(): string {
  return `
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #1e1e1e;
  color: #d4d4d4;
  line-height: 1.6;
  padding: 20px;
}

.neofermi-notebook {
  max-width: 800px;
  margin: 0 auto;
}

/* Typography */
h1, h2, h3, h4, h5, h6 {
  color: #ffffff;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  font-weight: 600;
}

h1 { font-size: 2em; border-bottom: 1px solid #3e3e3e; padding-bottom: 0.3em; }
h2 { font-size: 1.5em; }
h3 { font-size: 1.25em; }

p {
  margin: 1em 0;
}

a {
  color: #4ec9b0;
}

ul, ol {
  margin: 1em 0;
  padding-left: 2em;
}

blockquote {
  border-left: 4px solid #4ec9b0;
  padding-left: 1em;
  margin: 1em 0;
  color: #888;
}

/* Code blocks (non-NeoFermi) */
pre {
  background: #252525;
  border-radius: 6px;
  padding: 12px;
  overflow-x: auto;
  margin: 1em 0;
}

code {
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
  font-size: 0.9em;
}

p code, li code {
  background: #252525;
  padding: 2px 6px;
  border-radius: 3px;
}

/* NeoFermi cells */
.nf-cell {
  background: #252525;
  border-radius: 8px;
  margin: 1em 0;
  border: 1px solid #3e3e3e;
  overflow: hidden;
}

.nf-code {
  background: #2d2d2d;
  margin: 0;
  padding: 12px;
  border-bottom: 1px solid #3e3e3e;
  border-radius: 0;
}

.nf-code code {
  color: #ce9178;
}

.nf-result {
  padding: 12px;
  background: rgba(206, 145, 120, 0.08);
}

.nf-stats {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nf-stat {
  font-size: 0.9em;
}

.nf-stat strong {
  color: #4ec9b0;
}

.nf-scalar {
  color: #4ec9b0;
  font-weight: 500;
}

.nf-dim {
  color: #888;
  font-style: italic;
  font-size: 0.9em;
}

.nf-error {
  padding: 12px;
  background: rgba(244, 135, 113, 0.1);
  color: #f48771;
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
  font-size: 0.85em;
}

.nf-viz {
  padding: 12px;
  display: flex;
  justify-content: center;
}

.nf-viz canvas {
  border-radius: 4px;
}

/* Tables */
table {
  border-collapse: collapse;
  margin: 1em 0;
  width: 100%;
}

th, td {
  border: 1px solid #3e3e3e;
  padding: 8px 12px;
  text-align: left;
}

th {
  background: #2d2d2d;
  font-weight: 600;
}

/* Horizontal rule */
hr {
  border: none;
  border-top: 1px solid #3e3e3e;
  margin: 2em 0;
}

/* Images */
img {
  max-width: 100%;
  border-radius: 4px;
}
`
}
