import { CATEGORIES, CATEGORY_KEYS } from '../lib/categories.js'
import CategoryIcon from './CategoryIcon.jsx'

/**
 * Chips wrap onto as many rows as they need rather than scrolling sideways,
 * so the whole filter set is visible at once. A chip fills with its own
 * category colour when active and is a hairline outline when it isn't.
 */
function Chip({ active, color, onClick, label, count, children, ariaLabel }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      className="flex shrink-0 items-center gap-1.5 rounded-full border py-1.5 pr-3 pl-2 text-[13px] font-semibold transition"
      style={
        active
          ? { background: color, borderColor: color, color: '#fff' }
          : { background: '#fff', borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }
      }
    >
      <span
        className="grid h-5 w-5 place-items-center rounded-full"
        style={active ? { background: 'rgb(255 255 255 / 0.22)' } : { background: `${color}18`, color }}
      >
        {children}
      </span>
      {label}
      {count != null && (
        <span className="tabular-nums" style={{ opacity: active ? 0.72 : 0.45 }}>
          {count}
        </span>
      )}
    </button>
  )
}

export default function FilterBar({
  selectedCats,
  onToggleCat,
  onReset,
  bookmarkedOnly,
  onToggleBookmarked,
  bookmarkCount,
  counts,
  total,
}) {
  // No selection means everything shows, so "All" is the filled chip and the
  // rest are outlines. Picking one narrows to it; picking more adds them.
  const filtering = selectedCats.length > 0 || bookmarkedOnly
  const allActive = !filtering

  return (
    <div className="flex flex-wrap gap-1.5 px-3 pb-2.5">
      <Chip active={allActive} color="#16171a" onClick={onReset} label="All" count={total}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </Chip>

      {CATEGORY_KEYS.map((key) => {
        const cat = CATEGORIES[key]
        const active = selectedCats.includes(key)
        return (
          <Chip
            key={key}
            active={active}
            color={cat.color}
            onClick={() => onToggleCat(key)}
            label={cat.label}
            count={counts[key] ?? 0}
            ariaLabel={`${active ? 'Hide' : 'Show'} ${cat.label.toLowerCase()}`}
          >
            <CategoryIcon category={key} size={12} strokeWidth={2.4} />
          </Chip>
        )
      })}

      <Chip
        active={bookmarkedOnly}
        color="#8a6a12"
        onClick={onToggleBookmarked}
        label="Saved"
        count={bookmarkCount}
        ariaLabel="Show saved places only"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round">
          <path d="M6 3.5h12v17l-6-4.5-6 4.5v-17Z" />
        </svg>
      </Chip>
    </div>
  )
}
