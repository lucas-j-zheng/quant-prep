import { Link } from 'react-router-dom'

// Sticky top bar with an optional back affordance.
export function Header({ title, subtitle, back, right }) {
  return (
    <header className="sticky top-0 z-20 border-b border-edge/70 bg-ink/80 px-4 py-3 backdrop-blur-xl">
      <div className="mx-auto flex max-w-2xl items-center gap-3">
        {back && (
          <Link
            to={back}
            aria-label="Back"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-edge text-gold transition active:scale-90 active:bg-edge/60"
          >
            <span className="text-lg leading-none">‹</span>
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-[1.15rem] font-semibold leading-tight text-cream">
            {title}
          </h1>
          {subtitle && <p className="truncate text-xs text-faint">{subtitle}</p>}
        </div>
        {right}
      </div>
    </header>
  )
}

const DIFF = {
  easy: { c: '#56c596', label: 'Easy' },
  medium: { c: '#e3a857', label: 'Medium' },
  hard: { c: '#e0758c', label: 'Hard' },
}

// Small difficulty pill with a colored dot (kept subtle so it never fights the
// gold accent used for progress/CTAs).
export function DifficultyTag({ difficulty }) {
  const d = DIFF[difficulty] || { c: '#9a93a3', label: difficulty }
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
      style={{ color: d.c, borderColor: `${d.c}40`, background: `${d.c}14` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: d.c }} />
      {d.label}
    </span>
  )
}

// Two-signal status row for a section: READ + SOLVED.
export function StatusRow({ read, solved, solvedCount, total }) {
  const Chip = ({ on, label, extra }) => (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ${
        on
          ? 'bg-gold/15 text-gold-soft ring-1 ring-gold/30'
          : 'bg-white/[0.04] text-faint ring-1 ring-edge'
      }`}
    >
      <span className={on ? 'text-gold' : 'text-faint'}>{on ? '●' : '○'}</span>
      {label}
      {extra}
    </span>
  )
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Chip on={read} label="READ" />
      <Chip
        on={solved}
        label="SOLVED"
        extra={
          typeof solvedCount === 'number' && total ? (
            <span className="font-mono text-[10px] opacity-80">
              {' '}
              {solvedCount}/{total}
            </span>
          ) : null
        }
      />
    </div>
  )
}

export function Card({ to, children, className = '', style }) {
  const cls =
    'block rounded-xl2 border border-edge bg-panel/80 p-4 shadow-card transition active:scale-[0.985] active:bg-panel2 ' +
    className
  return to ? (
    <Link to={to} className={cls} style={style}>
      {children}
    </Link>
  ) : (
    <div className={cls} style={style}>
      {children}
    </div>
  )
}
