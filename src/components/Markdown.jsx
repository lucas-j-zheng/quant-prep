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

function protectMath(src) {
  const spans = []
  // Order matters: block $$...$$ before inline $...$. The @@MATH n@@ marker has
  // NO surrounding-space dependency, so math at the start of a list item / line
  // still restores correctly.
  let out = src.replace(/\$\$([\s\S]+?)\$\$/g, (_, m) => {
    spans.push(`$$${m}$$`)
    return `@@MATH${spans.length - 1}@@`
  })
  out = out.replace(/\$([^$\n]+?)\$/g, (_, m) => {
    spans.push(`$${m}$`)
    return `@@MATH${spans.length - 1}@@`
  })
  return { out, spans }
}

function restoreMath(html, spans) {
  return html.replace(/@@MATH(\d+)@@/g, (_, i) => spans[Number(i)])
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
