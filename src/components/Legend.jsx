import { CATEGORIES, CATEGORY_KEYS } from '../lib/categories.js'
import CategoryIcon from './CategoryIcon.jsx'

/** Corner legend, opened from the 'i' control on the map. */
export default function Legend({ counts }) {
  return (
    <div className="w-52 rounded-2xl bg-surface p-3.5 shadow-[0_6px_24px_rgba(22,23,26,0.16)] ring-1 ring-hairline">
      <p className="eyebrow mb-2.5 text-ink-faint">Legend</p>
      <ul className="space-y-2">
        {CATEGORY_KEYS.map((key) => (
          <li key={key} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2.5">
              <span
                className="grid h-6 w-6 place-items-center rounded-full text-white"
                style={{ background: CATEGORIES[key].color }}
              >
                <CategoryIcon category={key} size={13} strokeWidth={2.3} />
              </span>
              <span className="text-[13px] font-medium text-ink">{CATEGORIES[key].label}</span>
            </span>
            <span className="text-xs text-ink-faint tabular-nums">{counts[key] ?? 0}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
