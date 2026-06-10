import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useContent } from '../App.jsx'
import { getChapter } from '../content/loadContent.js'
import { Header } from '../components/ui.jsx'
import Markdown from '../components/Markdown.jsx'
import { getSectionProgress, setRead } from '../db/progress.js'

export default function Lesson() {
  const content = useContent()
  const { chapterId } = useParams()
  const chapter = getChapter(content, chapterId)
  const key = `lesson:${chapterId}`
  const [read, setReadState] = useState(false)

  useEffect(() => {
    getSectionProgress(key).then((p) => setReadState(!!p.read))
  }, [key])

  if (!chapter) {
    return (
      <>
        <Header title="Not found" back="/" />
        <p className="p-4 text-dim">Unknown chapter.</p>
      </>
    )
  }

  const md = chapter.lesson?.concept_markdown || ''
  const toggle = async () => setReadState((await setRead(key, !read)).read)

  return (
    <div className="mx-auto max-w-2xl pb-16">
      <Header title={`${chapter.title}`} subtitle="Lesson" back="/" />

      <div className="px-4 pt-5">
        <div className="mb-5 flex items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-gold/80">
            Learn from scratch
          </span>
          <div className="h-px flex-1 bg-edge" />
        </div>

        {md ? (
          <article className="animate-fade-up">
            <Markdown>{md}</Markdown>
          </article>
        ) : (
          <p className="text-dim">No lesson available yet for this chapter.</p>
        )}

        <button
          onClick={toggle}
          className={`mt-10 w-full rounded-full px-4 py-3.5 text-center font-semibold transition active:scale-[0.99] ${
            read
              ? 'bg-gold/15 text-gold-soft ring-1 ring-gold/30'
              : 'bg-gold text-ink shadow-glow'
          }`}
        >
          {read ? '✓ Marked as read' : 'Mark lesson as read'}
        </button>
      </div>
    </div>
  )
}
