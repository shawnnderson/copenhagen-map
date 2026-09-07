import { useState } from 'react'
import { CATEGORIES, CATEGORY_KEYS } from '../lib/categories.js'

/** Top-left corner legend. Collapsible, because screen space is scarce on a phone. */
export default function Legend({ counts }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="pointer-events-auto absolute left-3 z-[500]" style={{ top: 'calc(var(--sat) + 0.75rem)' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-xs font-semibold text-ink shadow-lg ring-1 ring-black/5 backdrop-blur"
      >
        <span className="flex -space-x-1">
          {CATEGORY_KEYS.slice(0, 5).map((k) => (
            <span
              key={k}
              className="h-3 w-3 rounded-full ring-2 ring-white"
              style={{ background: CATEGORIES[k].color }}
            />
          ))}
        </span>
        Legend
      </button>

      {open && (
        <ul className="mt-2 w-44 space-y-1.5 rounded-2xl bg-white/95 p-3 text-xs shadow-lg ring-1 ring-black/5 backdrop-blur">
          {CATEGORY_KEYS.map((key) => (
            <li key={key} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ background: CATEGORIES[key].color }}
                />
                <span className="text-ink">{CATEGORIES[key].plural}</span>
              </span>
              <span className="tabular-nums text-ink-soft">{counts[key] ?? 0}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
