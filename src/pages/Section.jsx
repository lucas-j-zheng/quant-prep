import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useContent } from '../App.jsx'
import { getSection } from '../content/loadContent.js'
import { Header, DifficultyTag, StatusRow } from '../components/ui.jsx'
import ProgressRing from '../components/ProgressRing.jsx'
import Markdown from '../components/Markdown.jsx'
import { getSectionProgress, setRead, getSolvedSet } from '../db/progress.js'

export default function Section() {
  const content = useContent()
  const { sectionId } = useParams()
  const section = getSection(content, sectionId)

  const [prog, setProg] = useState({ read: false, solved: false })
  const [solvedSet, setSolvedSet] = useState(new Set())
  const hasLesson = !!section?.lesson?.concept_markdown
  const [tab, setTab] = useState('lesson')

  useEffect(() => {
    setTab(hasLesson ? 'lesson' : 'problems')
  }, [sectionId, hasLesson])

  useEffect(() => {
    if (!section) return
    getSectionProgress(sectionId).then(setProg)
    getSolvedSet(sectionId).then(setSolvedSet)
  }, [sectionId, section])

  if (!section) {
    return (
      <>
        <Header title="Not found" back="/" />
        <p className="p-4 text-dim">Unknown section.</p>
      </>
    )
  }

  const toggleRead = async () => setProg(await setRead(sectionId, !prog.read))
  const lesson = section.lesson || {}
  const frac = section.problems.length ? solvedSet.size / section.problems.length : 0

  const tabs = [...(hasLesson ? [['lesson', 'Lesson']] : []), ['problems', `Problems · ${section.problems.length}`]]

  return (
    <div className="mx-auto max-w-2xl pb-14">
      <Header
        title={section.title}
        back="/"
        right={
          <ProgressRing value={frac} size={36} stroke={4} color={frac >= 1 ? '#56c596' : '#eab04a'}>
            <span className="font-mono text-[10px] text-dim">
              {solvedSet.size}
            </span>
          </ProgressRing>
        }
      />

      <div className="px-4 pt-4">
        <StatusRow
          read={prog.read}
          solved={prog.solved}
          solvedCount={solvedSet.size}
          total={section.problems.length}
        />
      </div>

      {/* Segmented tabs */}
      <div className="sticky top-[61px] z-10 mt-4 bg-ink/80 px-4 pb-3 pt-1 backdrop-blur-xl">
        <div className="flex gap-1 rounded-full border border-edge bg-panel/60 p-1">
          {tabs.map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`flex-1 rounded-full px-3 py-2 text-[13px] font-semibold transition ${
                tab === k
                  ? 'bg-gold text-ink shadow-glow'
                  : 'text-dim active:bg-edge/50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {hasLesson && tab === 'lesson' ? (
        <div className="animate-fade-in px-4 pt-1">
          {lesson.concept_markdown && (
            <Markdown>{lesson.concept_markdown}</Markdown>
          )}

          {Array.isArray(lesson.worked_examples) && lesson.worked_examples.length > 0 && (
            <div className="mt-6 space-y-4">
              <h4 className="font-mono text-xs font-bold uppercase tracking-widest text-gold">
                Worked examples
              </h4>
              {lesson.worked_examples.map((ex, idx) => (
                <div key={idx} className="rounded-xl2 border border-edge bg-panel/70 p-4 shadow-card">
                  <Markdown>{`**Example ${idx + 1}.** ${ex.prompt}`}</Markdown>
                  <div className="mt-3 border-t border-edge pt-3">
                    <Markdown>{ex.solution_markdown}</Markdown>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={toggleRead}
            className={`mt-8 w-full rounded-full px-4 py-3.5 text-center font-semibold transition active:scale-[0.99] ${
              prog.read
                ? 'bg-gold/15 text-gold-soft ring-1 ring-gold/30'
                : 'bg-gold text-ink shadow-glow'
            }`}
          >
            {prog.read ? '✓ Marked as read' : 'Mark lesson as read'}
          </button>
        </div>
      ) : (
        <ul className="animate-fade-in space-y-2.5 px-4 pt-1">
          {section.problems.map((p, idx) => {
            const done = solvedSet.has(p.id)
            return (
              <li key={p.id} className="stagger" style={{ '--i': idx }}>
                <Link
                  to={`/section/${sectionId}/problem/${p.id}`}
                  className="flex items-center gap-3.5 rounded-xl2 border border-edge bg-panel/80 p-4 shadow-card transition active:scale-[0.985] active:bg-panel2"
                >
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                      done
                        ? 'bg-easy/20 text-easy ring-1 ring-easy/40'
                        : 'bg-white/[0.04] font-mono text-faint ring-1 ring-edge'
                    }`}
                  >
                    {done ? '✓' : idx + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium text-cream">
                    {p.title || `Problem ${idx + 1}`}
                  </span>
                  {p.solutions && p.solutions.length > 1 && (
                    <span className="font-mono text-[10px] text-gold/70">
                      {p.solutions.length} ways
                    </span>
                  )}
                  <span className="shrink-0">
                    <DifficultyTag difficulty={p.difficulty} />
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
