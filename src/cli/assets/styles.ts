/**
 * CSS for rendered NeoFermi notebooks (CLI output and the examples pages).
 *
 * The look is a well-set scientific paper: one serif for prose and for
 * computed results, monospace only for code the reader could type. Light
 * and dark share one template so they can't drift apart.
 */

interface Palette {
  paper: string
  ink: string
  muted: string
  rule: string
  codeBg: string
  accent: string
  resultBg: string
  error: string
  errorBg: string
  dot: string
}

const LIGHT: Palette = {
  paper: '#ffffff',
  ink: '#1a1a2e',
  muted: '#6b6b7b',
  rule: '#e2e2ea',
  codeBg: '#f7f7fa',
  accent: '#2e5aac',
  resultBg: '#f4f6fb',
  error: '#b42318',
  errorBg: '#fdf3f2',
  dot: 'rgba(46, 90, 172, 0.85)',
}

const DARK: Palette = {
  paper: '#16161f',
  ink: '#e6e6ee',
  muted: '#9a9aab',
  rule: '#2c2c3a',
  codeBg: '#1d1d28',
  accent: '#8fb0ec',
  resultBg: '#1b1f2c',
  error: '#f09a8f',
  errorBg: '#2a1a1a',
  dot: 'rgba(143, 176, 236, 0.9)',
}

/** Google Fonts stylesheet for the two families the pages use. */
export const FONT_LINKS = `<link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap">`

export function getStyles(darkMode: boolean = false): string {
  return paperStyles(darkMode ? DARK : LIGHT)
}

function paperStyles(c: Palette): string {
  return `
* { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  --serif: 'Source Serif 4', 'Iowan Old Style', Georgia, serif;
  --mono: 'JetBrains Mono', ui-monospace, 'SFMono-Regular', Menlo, monospace;
}

body {
  font-family: var(--serif);
  font-size: 18px;
  line-height: 1.6;
  background: ${c.paper};
  color: ${c.ink};
  padding: 48px 24px 96px;
  font-variant-numeric: lining-nums;
  -webkit-font-smoothing: antialiased;
}

.neofermi-notebook {
  max-width: 42rem;
  margin: 0 auto;
}

.nf-back {
  display: inline-block;
  font-size: 15px;
  color: ${c.muted};
  text-decoration: none;
  margin-bottom: 40px;
}
.nf-back:hover { color: ${c.accent}; }

h1, h2, h3, h4 {
  font-weight: 600;
  line-height: 1.2;
  color: ${c.ink};
}
h1 { font-size: 2.3rem; margin-bottom: 0.6em; letter-spacing: -0.01em; }
h2 { font-size: 1.4rem; margin: 2.2em 0 0.5em; }
h3 { font-size: 1.15rem; margin: 1.8em 0 0.4em; }

p, ul, ol { margin: 0.9em 0; }
ul, ol { padding-left: 1.4em; }
li + li { margin-top: 0.25em; }
strong { font-weight: 600; }

a { color: ${c.accent}; text-underline-offset: 2px; }

blockquote {
  margin: 1.2em 0;
  padding-left: 1em;
  border-left: 2px solid ${c.rule};
  color: ${c.muted};
}

code {
  font-family: var(--mono);
  font-size: 0.8em;
}
p code, li code, td code {
  background: ${c.codeBg};
  padding: 0.1em 0.35em;
  border-radius: 3px;
}

pre {
  font-family: var(--mono);
  background: ${c.codeBg};
  padding: 14px 16px;
  overflow-x: auto;
  margin: 1.2em 0;
  border-radius: 4px;
}

/* NeoFermi cells: code, then the answer it produces */
.nf-cell { margin: 1.4em 0 1.8em; }

.nf-code {
  margin: 0;
  border-left: 2px solid ${c.rule};
  border-radius: 0;
  font-size: 15px;
  line-height: 1.65;
}
.nf-code code { font-size: 14px; color: ${c.ink}; }

.nf-result {
  padding: 10px 18px 2px;
  border-left: 2px solid ${c.accent};
  background: ${c.resultBg};
  font-size: 1.15rem;
}
.nf-result:last-child { padding-bottom: 10px; }

.nf-label {
  font-family: var(--mono);
  font-size: 14px;
  color: ${c.muted};
  margin-right: 0.35em;
}
.nf-scalar { color: ${c.accent}; font-weight: 600; font-variant-numeric: tabular-nums lining-nums; }
.nf-ci { color: ${c.muted}; font-variant-numeric: tabular-nums lining-nums; }
.nf-dim { color: ${c.muted}; font-style: italic; font-size: 0.85em; }

.nf-viz {
  padding: 2px 18px 12px;
  border-left: 2px solid ${c.accent};
  background: ${c.resultBg};
  --nf-dot-color: ${c.dot};
  --nf-axis-color: ${c.muted};
  --nf-label-color: ${c.muted};
  --nf-unit-color: ${c.muted};
  --nf-viz-bg: transparent;
}
.nf-viz canvas { max-width: 100%; height: auto; }

.nf-report {
  font-family: var(--mono);
  font-size: 13px;
  line-height: 1.5;
  margin: 0;
  padding: 10px 18px 12px;
  border-left: 2px solid ${c.accent};
  border-radius: 0;
  background: ${c.resultBg};
  color: ${c.muted};
  white-space: pre;
  overflow-x: auto;
}

.nf-error {
  padding: 10px 18px;
  border-left: 2px solid ${c.error};
  background: ${c.errorBg};
  color: ${c.error};
  font-family: var(--mono);
  font-size: 14px;
}

/* Inline \${…} results in prose */
.nf-inline { font-weight: 600; color: ${c.accent}; font-variant-numeric: tabular-nums lining-nums; }

table {
  border-collapse: collapse;
  margin: 1.2em 0;
  width: 100%;
  font-size: 0.95em;
  font-variant-numeric: tabular-nums lining-nums;
}
th, td {
  border-bottom: 1px solid ${c.rule};
  padding: 7px 10px 7px 0;
  text-align: left;
  vertical-align: top;
}
th { font-weight: 600; border-bottom-color: ${c.ink}; }

hr { border: none; border-top: 1px solid ${c.rule}; margin: 2.4em 0; }
img { max-width: 100%; }

:focus-visible { outline: 2px solid ${c.accent}; outline-offset: 2px; }

@media (max-width: 600px) {
  body { font-size: 17px; padding: 28px 16px 64px; }
  h1 { font-size: 1.9rem; }
  .nf-code code { font-size: 13px; }
}
`
}
