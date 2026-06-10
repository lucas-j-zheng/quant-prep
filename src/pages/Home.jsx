import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useContent } from '../App.jsx'
import { Card, StatusRow } from '../components/ui.jsx'
import ProgressRing from '../components/ProgressRing.jsx'
import { getAllSectionProgress, getSolvedCountsBySection } from '../db/progress.js'

export default function Home() {
  const content = useContent()
  const [progress, setProgress] = useState(new Map())
  const [solvedCounts, setSolvedCounts] = useState(new Map())

  useEffect(() => {
    let alive = true
    Promise.all([getAllSectionProgress(), getSolvedCountsBySection()]).then(
      ([p, c]) => {
        if (!alive) return
        setProgress(p)
        setSolvedCounts(c)
      }
    )
    return () => {
      alive = false
    }
  }, [])

  const solvedOf = (id) => solvedCounts.get(id) || 0

  let totalProblems = 0
  let totalSolved = 0
  for (const ch of content.chapters)
    for (const s of ch.sections) {
      totalProblems += s.problems.length
      totalSolved += solvedOf(s.id)
    }
  const overall = totalProblems ? totalSolved / totalProblems : 0

  let i = 0 // global stagger index

  return (
    <div className="mx-auto max-w-2xl pb-16">
      {/* Hero */}
      <header className="relative px-5 pb-6 pt-10">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.25em] text-gold/80">
              Interview Prep
            </p>
            <h1 className="font-display text-[2.6rem] font-semibold leading-[0.95] tracking-tight text-cream">
              Quant
              <br />
              <span className="text-gold-soft">Prep</span>
            </h1>
          </div>
          <ProgressRing value={overall} size={88} stroke={7}>
            <div className="text-center">
              <div className="font-mono text-xl font-semibold leading-none text-cream">
                {Math.round(overall * 100)}
                <span className="text-sm text-faint">%</span>
              </div>
              <div className="mt-0.5 text-[9px] uppercase tracking-widest text-faint">
                solved
              </div>
            </div>
          </ProgressRing>
        </div>
        <p className="mt-5 text-sm text-dim">
          <span className="font-mono text-cream">{totalSolved}</span> of{' '}
          <span className="font-mono text-cream">{totalProblems}</span> problems
          solved across{' '}
          <span className="font-mono text-cream">{content.chapters.length}</span>{' '}
          chapters.
        </p>
      </header>

      <div className="space-y-9 px-4">
        {content.chapters.map((ch) => {
          const cTotal = ch.sections.reduce((a, s) => a + s.problems.length, 0)
          const cSolved = ch.sections.reduce((a, s) => a + solvedOf(s.id), 0)
          const cFrac = cTotal ? cSolved / cTotal : 0
          return (
            <section key={ch.id}>
              {/* Chapter header */}
              <div className="mb-3 flex items-center gap-3 px-1">
                <span className="font-mono text-xs text-gold/60">
                  {String(ch.tier).padStart(2, '0')}
                </span>
                <h2 className="font-display text-lg font-semibold text-cream">
                  {ch.title}
                </h2>
                <div className="h-px flex-1 bg-edge" />
                <span className="font-mono text-[11px] text-faint">
                  {cSolved}/{cTotal}
                </span>
                <ProgressRing value={cFrac} size={22} stroke={3} />
              </div>

              {/* Lesson entry */}
              {ch.lesson?.concept_markdown && (
                <Link
                  to={`/chapter/${ch.id}`}
                  className="stagger mb-3 flex items-center gap-3 rounded-xl2 border border-gold/25 bg-gradient-to-br from-gold/[0.12] to-transparent px-4 py-3.5 transition active:scale-[0.985]"
                  style={{ '--i': i++ }}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold/15 text-base">
                    📖
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-[15px] font-semibold text-gold-soft">
                      Lesson — learn {ch.title}
                    </div>
                    <div className="text-xs text-gold/60">
                      {progress.get(`lesson:${ch.id}`)?.read
                        ? '✓ Read · concepts & worked examples'
                        : 'Concepts, formulas & worked examples'}
                    </div>
                  </div>
                  <span className="text-gold/50">→</span>
                </Link>
              )}

              {/* Sections */}
              <div className="space-y-2.5">
                {ch.sections.map((s) => {
                  const prog = progress.get(s.id) || {}
                  const sc = solvedOf(s.id)
                  const frac = s.problems.length ? sc / s.problems.length : 0
                  return (
                    <Card
                      key={s.id}
                      to={`/section/${s.id}`}
                      className="stagger flex items-center gap-4"
                      style={{ '--i': i++ }}
                    >
                      <ProgressRing
                        value={frac}
                        size={42}
                        stroke={4}
                        color={frac >= 1 ? '#56c596' : '#eab04a'}
                      >
                        {frac >= 1 ? (
                          <span className="text-easy text-sm">✓</span>
                        ) : (
                          <span className="font-mono text-[11px] text-dim">
                            {s.problems.length}
                          </span>
                        )}
                      </ProgressRing>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-medium text-cream">
                          {s.title}
                        </h3>
                        <div className="mt-2">
                          <StatusRow
                            read={!!prog.read}
                            solved={!!prog.solved}
                            solvedCount={sc}
                            total={s.problems.length}
                          />
                        </div>
                      </div>
                      <span className="text-faint">›</span>
                    </Card>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>

      <p className="mt-12 px-5 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-faint/60">
        Works offline · Add to Home Screen
      </p>
    </div>
  )
}
