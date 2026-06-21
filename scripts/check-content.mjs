#!/usr/bin/env node
// Content guard: validate every authored LaTeX span in public/content.json.
//
// This catches two classes of regression before they can ship:
//   (A) LaTeX that KaTeX cannot parse (typos, unbalanced braces, bad macros).
//   (B) The "unescaped math in innerHTML" bug: a bare `<` inside a formula
//       (e.g. \sum_{i<j}, P(X < Y)) used to be parsed by the browser as the
//       start of an HTML tag, swallowing the rest of the formula. The fix
//       HTML-escapes restored math spans; this guard asserts that escaping
//       still happens so the bug can never silently return.
//
// It reuses the EXACT pipeline functions from src/components/markdownCore.js
// (protectMath for span extraction + currency classification, mdToHtml for
// the rendered HTML), so the guard's notion of "what is a math span" matches
// the app exactly and cannot drift.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import katex from 'katex'
import { protectMath, mdToHtml } from '../src/components/markdownCore.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CONTENT_PATH = resolve(__dirname, '../public/content.json')

// --- Load + parse ----------------------------------------------------------
let root
try {
  root = JSON.parse(readFileSync(CONTENT_PATH, 'utf8'))
} catch (e) {
  console.error(`[check-content] Failed to load/parse ${CONTENT_PATH}:`)
  console.error(`  ${e.message}`)
  process.exit(1)
}

// --- Recursively collect every string field with a JSON-path locator -------
const strings = [] // { path, value }
function walk(node, path) {
  if (typeof node === 'string') {
    strings.push({ path, value: node })
  } else if (Array.isArray(node)) {
    node.forEach((v, i) => walk(v, `${path}[${i}]`))
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      // Prefer a human-friendly key when the object carries an id.
      walk(v, path ? `${path}.${k}` : k)
    }
  }
}
walk(root, '')

// --- Extract math spans via the app's own protectMath ----------------------
// protectMath returns spans WITH their delimiters ($...$ or $$...$$). We strip
// the delimiters to get the inner LaTeX and remember displayMode.
function spansFrom(text) {
  const { spans } = protectMath(text)
  return spans.map((raw) => {
    const displayMode = raw.startsWith('$$')
    const inner = displayMode ? raw.slice(2, -2) : raw.slice(1, -1)
    return { raw, inner, displayMode }
  })
}

// --- Run the checks --------------------------------------------------------
const failures = []
let total = 0
let ok = 0

for (const { path, value } of strings) {
  if (!value.includes('$')) continue
  for (const { inner, displayMode } of spansFrom(value)) {
    total++
    try {
      katex.renderToString(inner, { throwOnError: true, displayMode })
      ok++
    } catch (e) {
      failures.push({
        kind: 'katex',
        path,
        latex: inner,
        displayMode,
        message: e.message,
      })
    }
  }
}

// --- Structural escaping check (the original bug, caught directly) ---------
// For any string whose math contains an HTML-significant char (`<`, `>`, `&`),
// the rendered HTML must contain the ESCAPED entity, never the raw char inside
// the restored math region. This assertion FAILS on the old (unescaped)
// restoreMath and PASSES on the fixed one.
//
// We also run a synthetic canary so the guard is meaningful even if real
// content never happens to contain `<` in math.
function structuralCheck(label, text, path) {
  const { spans } = protectMath(text)
  // Only math spans that actually carry an HTML-significant char are relevant.
  const risky = spans.some((s) => /[<>&]/.test(s))
  if (!risky) return
  const html = mdToHtml(text)
  // The fixed pipeline escapes `<`/`>` from math to `&lt;`/`&gt;`. If a raw
  // `<` that came from a math span survives into the HTML, the browser would
  // mis-parse it as a tag. Detect a `<` that is NOT the start of one of the
  // small set of real tags our renderer emits.
  const KNOWN_TAGS =
    /<\/?(?:p|h[1-6]|ul|ol|li|hr|em|strong|code|pre|div|table|thead|tbody|tr|th|td|span)\b/
  let idx = 0
  while ((idx = html.indexOf('<', idx)) !== -1) {
    const rest = html.slice(idx)
    if (!KNOWN_TAGS.test(rest.slice(0, 40))) {
      failures.push({
        kind: 'structural',
        path,
        latex: label,
        message:
          `Unescaped '<' leaked into rendered HTML near: ` +
          JSON.stringify(html.slice(idx, idx + 40)) +
          `. Math spans must be HTML-escaped on restore (see restoreMath).`,
      })
      return
    }
    idx += 1
  }
}

for (const { path, value } of strings) {
  if (value.includes('$')) structuralCheck(value, value, path)
}

// Synthetic canary: a span containing `<` MUST round-trip as escaped HTML.
const CANARY = 'Inequality $\\sum_{i<j} x_i < y$ holds.'
{
  const html = mdToHtml(CANARY)
  if (!html.includes('&lt;')) {
    failures.push({
      kind: 'canary',
      path: '<synthetic canary>',
      latex: CANARY,
      message:
        'Canary failed: math containing "<" was NOT HTML-escaped by mdToHtml. ' +
        'restoreMath must escape spans (this is the regression that shipped broken).',
    })
  }
  if (/<(?!\/?(?:p|span|em|strong|code)\b)[^\s/]/.test(html.replace(/<p>|<\/p>/g, ''))) {
    // Belt-and-suspenders: ensure no raw `<x` from the formula survived.
    const stripped = html.replace(/<\/?(?:p|span|em|strong|code)[^>]*>/g, '')
    if (/</.test(stripped)) {
      failures.push({
        kind: 'canary',
        path: '<synthetic canary>',
        latex: CANARY,
        message:
          'Canary failed: a raw "<" from the formula survived into HTML: ' +
          JSON.stringify(stripped),
      })
    }
  }
}

// --- Report ----------------------------------------------------------------
console.log(`[check-content] Scanned ${strings.length} string fields.`)
console.log(`[check-content] Math spans validated: ${total} (KaTeX OK: ${ok}).`)

if (failures.length === 0) {
  console.log('[check-content] PASS — all LaTeX renders and is properly escaped.')
  process.exit(0)
}

console.error(`\n[check-content] FAIL — ${failures.length} problem(s):\n`)
for (const f of failures) {
  console.error(`  • [${f.kind}] ${f.path}`)
  if (f.displayMode !== undefined) {
    console.error(`      mode:  ${f.displayMode ? 'display ($$..$$)' : 'inline ($..$)'}`)
  }
  console.error(`      latex: ${JSON.stringify(f.latex)}`)
  console.error(`      error: ${f.message}`)
}
console.error('')
process.exit(1)
