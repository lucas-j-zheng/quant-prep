import { useEffect, useRef, useMemo } from 'react'
import renderMathInElement from 'katex/contrib/auto-render'
import { mdToHtml } from './markdownCore.js'

// Lightweight Markdown -> HTML for our authored content.json (trusted input).
// All pure string-processing lives in ./markdownCore.js so the content guard
// (scripts/check-content.mjs) can validate the exact same pipeline. Keep logic
// changes in markdownCore.js, not here.

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
