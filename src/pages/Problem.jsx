import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useContent } from '../App.jsx'
import { getSection, getProblem } from '../content/loadContent.js'
import { Header, DifficultyTag } from '../components/ui.jsx'
import Markdown from '../components/Markdown.jsx'
import { getProblemSolved, setProblemSolved } from '../db/progress.js'

export default function Problem() {
  const content = useContent()
  const { sectionId, problemId } = useParams()
  const navigate = useNavigate()

  const section = getSection(content, sectionId)
  const problem = getProblem(content, sectionId, problemId)

  const [revealed, setRevealed] = useState(false)
  const [activeSol, setActiveSol] = useState(0)
  const [solved, setSolved] = useState(false)
  const [sectionSolved, setSectionSolved] = useState(false)

  useEffect(() => {
    setRevealed(false)
    setActiveSol(0)
    setSectionSolved(false)
    getProblemSolved(sectionId, problemId).then(setSolved)
  }, [sectionId, problemId])

  if (!section || !problem) {
    return (
      <>
        <Header title="Not found" back={`/section/${sectionId}`} />
        <p className="p-4 text-dim">Unknown problem.</p>
      </>
    )
  }

  const idx = section.problems.findIndex((p) => p.id === problemId)
  const prev = section.problems[idx - 1]
  const next = section.problems[idx + 1]
  const solutions = problem.solutions || []

  const toggleSolved = async () => {
    const newVal = !solved
    setSolved(newVal)
    const allIds = section.problems.map((p) => p.id)
    const { section: rec } = await setProblemSolved(sectionId, problemId, newVal, allIds)
    setSectionSolved(rec.solved)
  }

  return (
    <div className="problem-page mx-auto max-w-2xl">
      <Header
        title={problem.title || `Problem ${idx + 1}`}
        subtitle={`${section.title} · ${idx + 1} of ${section.problems.length}`}
        back={`/section/${sectionId}`}
      />

      <div className="px-4 pt-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <DifficultyTag difficulty={problem.difficulty} />
          {Array.isArray(problem.tags) &&
            problem.tags.map((t) => (
              <span
                key={t}
                className="rounded-full border border-edge px-2.5 py-1 text-[11px] text-faint"
              >
                {t}
              </span>
            ))}
        </div>

        {/* Prompt */}
        <div className="animate-fade-up rounded-3xl border border-edge bg-panel/80 p-5 shadow-card">
          <Markdown className="text-[1.02rem] text-cream">
            {problem.prompt_markdown}
          </Markdown>
        </div>

        {!revealed ? (
          <button
            onClick={() => setRevealed(true)}
            className="mt-4 w-full rounded-full bg-gold px-4 py-4 text-center font-semibold text-ink shadow-glow transition active:scale-[0.99]"
          >
            Reveal solution
          </button>
        ) : (
          <div className="mt-4 animate-fade-up space-y-4">
            {/* Answer */}
            <div className="rounded-3xl border border-easy/30 bg-gradient-to-br from-easy/[0.12] to-transparent p-5">
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-easy">
                Answer
              </div>
              <div className="mt-1.5 font-mono text-[1.05rem] leading-relaxed text-[#cdeede]">
                <Markdown className="!font-mono">{String(problem.answer)}</Markdown>
              </div>
            </div>

            {/* Solution approaches */}
            {solutions.length > 0 && (
              <div>
                {solutions.length > 1 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {solutions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveSol(i)}
                        className={`rounded-full px-3.5 py-2 text-[13px] font-medium transition ${
                          activeSol === i
                            ? 'bg-gold/15 text-gold-soft ring-1 ring-gold/40'
                            : 'border border-edge text-dim active:bg-edge/50'
                        }`}
                      >
                        {s.label || `Approach ${i + 1}`}
                      </button>
                    ))}
                  </div>
                )}
                <div className="rounded-3xl border border-edge bg-panel/70 p-5 shadow-card">
                  {solutions.length === 1 && solutions[0].label && (
                    <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-gold">
                      {solutions[0].label}
                    </div>
                  )}
                  <Markdown>{solutions[activeSol]?.markdown || ''}</Markdown>
                </div>
              </div>
            )}

            {problem.source && problem.source !== 'original' && (
              <a
                href={problem.source}
                target="_blank"
                rel="noreferrer"
                className="block break-all font-mono text-[11px] text-faint underline-offset-2 hover:underline"
              >
                {problem.source}
              </a>
            )}

            {!problem.verified && (
              <p className="text-[11px] text-medium">⚠ Unverified problem.</p>
            )}
          </div>
        )}
      </div>

      {/* Sticky action bar (respects the iPhone home-indicator safe area) */}
      <div className="action-bar fixed inset-x-0 bottom-0 z-20 border-t border-edge/70 bg-ink/85 px-4 pt-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-2.5">
          <button
            disabled={!prev}
            onClick={() => prev && navigate(`/section/${sectionId}/problem/${prev.id}`)}
            aria-label="Previous"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-edge text-dim transition active:scale-90 disabled:opacity-25"
          >
            ‹
          </button>
          <button
            onClick={toggleSolved}
            className={`h-12 flex-1 rounded-full text-center text-[15px] font-semibold transition active:scale-[0.99] ${
              solved
                ? 'bg-easy/15 text-easy ring-1 ring-easy/40'
                : 'bg-easy text-ink'
            }`}
          >
            {solved ? '✓ Solved correctly' : 'Mark solved correctly'}
          </button>
          <button
            disabled={!next}
            onClick={() => next && navigate(`/section/${sectionId}/problem/${next.id}`)}
            aria-label="Next"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-edge text-dim transition active:scale-90 disabled:opacity-25"
          >
            ›
          </button>
        </div>
        {sectionSolved && (
          <p className="mx-auto mt-2 max-w-2xl text-center text-[11px] text-easy">
            🎉 Every problem in “{section.title}” solved — section complete.
          </p>
        )}
      </div>
    </div>
  )
}
