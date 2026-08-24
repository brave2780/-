export function nanoId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// contentEditable turns a trailing (or repeated) space into a non-breaking
// space to stop the browser from collapsing it, so raw textContent needs
// this normalization before comparing against plain-text markdown shortcuts.
export function normalizeSpaces(text) {
  return text.replace(/ /g, ' ');
}
