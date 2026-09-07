import { CATEGORIES, CATEGORY_KEYS } from '../lib/categories.js'

function Chip({ active, color, onClick, children, ariaLabel }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold shadow-md ring-1 transition ${
        active
          ? 'text-white ring-transparent'
          : 'bg-white/95 text-ink-soft ring-black/5 backdrop-blur'
      }`}
      style={active && color ? { background: color } : undefined}
    >
      {children}
    </button>
  )
}

/**
 * Category chips + "bookmarked only". Sits low on the screen, inside thumb
 * reach, rather than in a traditional top toolbar.
 */
export default function FilterBar({ activeCats, onToggleCat, onReset, bookmarkedOnly, onToggleBookmarked, bookmarkCount }) {
  const allActive = activeCats.length === CATEGORY_KEYS.length

  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto px-3 pb-2 pt-1">
      <Chip active={allActive} color="#0f172a" onClick={onReset}>
        All
      </Chip>

      {CATEGORY_KEYS.map((key) => {
        const cat = CATEGORIES[key]
        const active = activeCats.includes(key)
        return (
          <Chip
            key={key}
            active={active}
            color={cat.color}
            onClick={() => onToggleCat(key)}
            ariaLabel={`${active ? 'Hide' : 'Show'} ${cat.plural.toLowerCase()}`}
          >
            <span aria-hidden>{cat.emoji}</span>
            {cat.label}
          </Chip>
        )
      })}

      <Chip
        active={bookmarkedOnly}
        color="#f59e0b"
        onClick={onToggleBookmarked}
        ariaLabel="Show bookmarked places only"
      >
        <span aria-hidden>★</span>
        Saved
        {bookmarkCount > 0 && <span className="tabular-nums opacity-75">{bookmarkCount}</span>}
      </Chip>
    </div>
  )
}
