/**
 * Browser client script for NeoFermi notebooks
 *
 * Handles SSE live reload and injects the pre-bundled visualization script.
 */

import { clientVizScript } from './_generated-client-viz.js'

export function getClientScript(): string {
  return `
// SSE Live Reload
const eventSource = new EventSource('/events');

eventSource.addEventListener('reload', () => {
  console.log('Reloading...');
  window.location.reload();
});

eventSource.addEventListener('connected', () => {
  console.log('Connected to NeoFermi notebook server');
});

eventSource.addEventListener('error', (e) => {
  console.log('SSE connection error, will retry...');
});

// Visualization rendering (bundled from canonical modules)
${clientVizScript}
`
}
