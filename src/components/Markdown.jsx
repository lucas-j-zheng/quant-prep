import { useEffect, useRef, useMemo } from 'react'
import renderMathInElement from 'katex/contrib/auto-render'

// Lightweight Markdown -> HTML for our authored content.json (trusted input).
// Strategy:
//   1. Pull fenced ```code``` blocks out FIRST so their contents are never
//      treated as math/markdown (back-ticks, *, _, |, $ inside code are literal).
//   2. Pull math spans ($...$ / $$...$$) out so markdown transforms never
//      corrupt LaTeX; KaTeX auto-render replaces the placeholders on mount.
//   3. Render the remaining markdown (headings, lists, tables, paragraphs,
//      bold, inline code), then restore math and code placeholders.

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Step 1: extract fenced code blocks. Returns text with ` CODE<n> ` placeholders
// (surrounded by spaces + on their own line) and the rendered <pre> HTML list.
function protectCode(src) {
  const blocks = []
  // ```lang\n ... \n``` — lang is optional. Non-greedy body, multiline.
  // Marker is space-independent (@@CODE n@@) so it survives list/paragraph trims.
  const out = src.replace(/```[ \t]*([^\n`]*)\n([\s\S]*?)```/g, (_, lang, body) => {
    const code = escapeHtml(body.replace(/\n$/, ''))
    blocks.push(
      `<div class="code-scroll"><pre><code>${code}</code></pre></div>`
    )
    return `\n\n@@CODE${blocks.length - 1}@@\n\n`
  })
  return { out, blocks }
}

// --- Math vs. currency disambiguation -------------------------------------
// A bare `$` is ambiguous: it can open inline math ($1/2$) or be a literal
// dollar sign ($10,000). KaTeX's auto-render treats every `$` as a math
// delimiter, so prose currency gets swallowed into bogus math spans. We
// classify each `$` here, BEFORE KaTeX runs, and route currency to an
// ignored <span> so KaTeX never sees it.
const PROSE_WORD = /[A-Za-z]{3,}/g
const MATH_FUNCS = new Set([
  'cos', 'sin', 'tan', 'log', 'exp', 'max', 'min', 'lim', 'det', 'gcd', 'mod',
  'sec', 'csc', 'cot', 'var', 'cov', 'arg', 'sup', 'inf',
])
// A span ending in a dangling binary operator (e.g. "3 = ", "7 + ", "1/36 ≈ +")
// is a currency mis-pairing like "$3 = $7", not a real equation.
const TRAILING_OP = /[-+×÷=≈≤≥−]\s*$/

// Real math expresses words via \text{...}; bare English prose => not math.
function hasProse(inner) {
  const stripped = inner
    .replace(
      /\\(?:text|mathrm|mathbf|mathit|mathsf|operatorname|textbf|textit)\s*\{[^{}]*\}/g,
      ' '
    )
    // Sub/superscript groups hold math labels, not prose (e.g. \theta_{MLE},
    // R^{2}). Drop them so an all-caps label isn't mistaken for a word.
    .replace(/[_^]\{[^{}]*\}/g, ' ')
    .replace(/[_^][A-Za-z0-9]/g, ' ')
    .replace(/\\[a-zA-Z]+/g, ' ') // drop \command
    .replace(/\\./g, ' ') // drop \% \$ \, etc.
  const words = stripped.match(PROSE_WORD) || []
  return words.some((w) => !MATH_FUNCS.has(w.toLowerCase()))
}

// Index of the next un-escaped single `$` on the same line, or -1.
function findClose(s, from) {
  for (let i = from; i < s.length; i++) {
    const c = s[i]
    if (c === '\n') return -1
    if (c === '\\') {
      i++ // a backslash escapes the next char (e.g. \$ inside math)
      continue
    }
    if (c === '$') return i
  }
  return -1
}

// Pull math spans into @@MATH n@@ placeholders and currency `$` into @@CUR@@.
function protectMath(src) {
  const spans = []
  let out = ''
  let i = 0
  const n = src.length
  while (i < n) {
    const c = src[i]
    // Explicit literal dollar: \$  -> currency (and drop the backslash).
    if (c === '\\' && src[i + 1] === '$') {
      out += '@@CUR@@'
      i += 2
      continue
    }
    if (c === '$') {
      // Block math $$...$$
      if (src[i + 1] === '$') {
        const end = src.indexOf('$$', i + 2)
        if (end !== -1) {
          spans.push(src.slice(i, end + 2))
          out += `@@MATH${spans.length - 1}@@`
          i = end + 2
          continue
        }
      }
      const close = findClose(src, i + 1)
      const inner = close === -1 ? '' : src.slice(i + 1, close)
      // Currency if it can't form a clean math span: no closer on the line, or
      // it contains prose. A trailing operator only signals currency when a
      // digit immediately follows the closer (the "$3 = $7" arithmetic shape);
      // a math span that merely ends in "=" before prose (e.g. "$E_i =$ text")
      // is real math, not currency.
      const after = close === -1 ? '' : src[close + 1] || ''
      const isCurrency =
        close === -1 ||
        hasProse(inner) ||
        (TRAILING_OP.test(inner) && /\d/.test(after))
      if (isCurrency) {
        out += '@@CUR@@'
        i += 1
        continue
      }
      spans.push(src.slice(i, close + 1))
      out += `@@MATH${spans.length - 1}@@`
      i = close + 1
      continue
    }
    out += c
    i++
  }
  return { out, spans }
}

function restoreMath(html, spans) {
  return html
    // Escape the LaTeX before it re-enters innerHTML: a bare `<` (e.g.
    // \sum_{i<j} or P(X < Y)) would otherwise be parsed as the start of an
    // HTML tag, swallowing the rest of the formula. The browser decodes the
    // entities back to literal chars in the text node, so KaTeX auto-render
    // still sees the original LaTeX.
    .replace(/@@MATH(\d+)@@/g, (_, i) => escapeHtml(spans[Number(i)]))
    // Currency renders as a literal `$` inside a class KaTeX is told to skip.
    .replace(/@@CUR@@/g, '<span class="kx-cur">$</span>')
}

function restoreCode(html, blocks) {
  // Placeholder may sit alone in a <p> after paragraph wrapping; unwrap it.
  return html
    .replace(/<p>\s*@@CODE(\d+)@@\s*<\/p>/g, (_, i) => blocks[Number(i)])
    .replace(/@@CODE(\d+)@@/g, (_, i) => blocks[Number(i)])
}

function inline(text) {
  // Apply to already-escaped text. Bold, then italic, then inline code.
  // Italic is multiplication-safe: it requires a non-space immediately inside
  // both asterisks, so "8 * 7 * 6" (space-padded *) is never italicized.
  return text
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(\S(?:[^*\n]*?\S)?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
}

// A pipe-table row -> array of trimmed cell strings (drops leading/trailing pipe).
function splitRow(line) {
  let s = line.trim()
  if (s.startsWith('|')) s = s.slice(1)
  if (s.endsWith('|')) s = s.slice(0, -1)
  return s.split('|').map((c) => c.trim())
}

const isTableSep = (line) => /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(line) && line.includes('-')
const isTableRow = (line) => line.trim().startsWith('|')

function renderTable(header, rows) {
  const th = header.map((c) => `<th>${inline(escapeHtml(c))}</th>`).join('')
  const body = rows
    .map(
      (r) =>
        `<tr>${r.map((c) => `<td>${inline(escapeHtml(c))}</td>`).join('')}</tr>`
    )
    .join('')
  return `<div class="table-scroll"><table><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table></div>`
}

function mdToHtml(src) {
  const { out: noCode, blocks } = protectCode(src.trim())
  const { out, spans } = protectMath(noCode)
  const lines = out.split('\n')
  const html = []
  let listType = null // 'ul' | 'ol' | null
  let para = []

  const flushPara = () => {
    if (para.length) {
      html.push(`<p>${inline(escapeHtml(para.join(' ')))}</p>`)
      para = []
    }
  }
  const closeList = () => {
    if (listType) {
      html.push(`</${listType}>`)
      listType = null
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const line = raw.replace(/\s+$/, '')
    if (!line.trim()) {
      flushPara()
      closeList()
      continue
    }

    // Pipe table: a header row immediately followed by a separator row.
    if (isTableRow(line) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      flushPara()
      closeList()
      const header = splitRow(line)
      const rows = []
      i += 2 // skip header + separator
      while (i < lines.length && isTableRow(lines[i]) && lines[i].trim()) {
        rows.push(splitRow(lines[i]))
        i++
      }
      i-- // for-loop will increment
      html.push(renderTable(header, rows))
      continue
    }

    // Horizontal rule: a line of only ---, ***, or ___ (3+).
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      flushPara()
      closeList()
      html.push('<hr />')
      continue
    }

    const h = line.match(/^(#{1,4})\s+(.*)$/)
    if (h) {
      flushPara()
      closeList()
      const level = h[1].length + 1 // start at <h2>
      html.push(`<h${level}>${inline(escapeHtml(h[2]))}</h${level}>`)
      continue
    }
    const ul = line.match(/^[-*]\s+(.*)$/)
    const ol = line.match(/^\d+\.\s+(.*)$/)
    if (ul || ol) {
      flushPara()
      const type = ul ? 'ul' : 'ol'
      if (listType !== type) {
        closeList()
        listType = type
        html.push(`<${type}>`)
      }
      html.push(`<li>${inline(escapeHtml((ul || ol)[1]))}</li>`)
      continue
    }
    closeList()
    para.push(line.trim())
  }
  flushPara()
  closeList()

  return restoreCode(restoreMath(html.join('\n'), spans), blocks)
}

export default function Markdown({ children, className = '' }) {
  const ref = useRef(null)
  const html = useMemo(() => mdToHtml(children || ''), [children])

  useEffect(() => {
    if (!ref.current) return
    try {
      renderMathInElement(ref.current, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
        ],
        // Don't let KaTeX touch our code blocks.
        ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
        // Currency dollars are wrapped in .kx-cur so they stay literal `$`.
        ignoredClasses: ['kx-cur'],
        throwOnError: false,
      })
    } catch {
      /* leave raw on failure */
    }
  }, [html])

  return (
    <div
      ref={ref}
      className={`prose-quant ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
