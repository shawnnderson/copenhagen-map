import { useMemo } from 'react'
import { categoryOf } from '../lib/categories.js'
import { formatDistance } from '../lib/geo.js'
import CategoryIcon from './CategoryIcon.jsx'

function PlaceRow({ place, onSelect, isBookmarked, onToggleBookmark, showDistance }) {
  const cat = categoryOf(place.category)
  const saved = isBookmarked(place.id)

  return (
    <li className="relative flex items-start gap-3 border-b border-hairline bg-surface px-4 py-4">
      <button
        type="button"
        onClick={() => onSelect(place.id)}
        className="flex min-w-0 flex-1 items-start gap-3 text-left"
      >
        <span
          className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full text-white"
          style={{ background: cat.color }}
        >
          <CategoryIcon category={place.category} size={16} strokeWidth={2.1} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="display block truncate text-[17px] text-ink">{place.name}</span>

          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className="eyebrow rounded px-1.5 py-0.5"
              style={{ background: `${cat.color}14`, color: cat.color }}
            >
              {cat.label}
            </span>
            <span className="text-[13px] text-ink-soft">{place.neighborhood}</span>
            {showDistance && place.distanceKm != null && (
              <span className="text-[13px] text-ink-soft tabular-nums">
                · {formatDistance(place.distanceKm)}
              </span>
            )}
          </span>

          {place.note && (
            <span className="mt-1.5 block text-[14px] leading-relaxed text-ink-soft">
              {place.recommendedBy && (
                <span className="eyebrow mr-1.5 text-ink-faint">{place.recommendedBy}</span>
              )}
              {place.note}
            </span>
          )}
        </span>
      </button>

      <button
        type="button"
        onClick={() => onToggleBookmark(place.id)}
        aria-pressed={saved}
        aria-label={saved ? `Remove ${place.name} from saved` : `Save ${place.name}`}
        className="-mr-1 shrink-0 p-2 text-ink"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" className={saved ? 'text-ink' : 'text-ink-faint'}>
          <path d="M6 3.5h12v17l-6-4.5-6 4.5v-17Z" />
        </svg>
      </button>
    </li>
  )
}

export default function ListView({
  places,
  onSelect,
  isBookmarked,
  onToggleBookmark,
  geoStatus,
  onLocate,
  sortedByDistance,
}) {
  // Grouped by neighbourhood when browsing; a flat ranked list when sorted by
  // distance, since grouping would fight the ordering.
  const groups = useMemo(() => {
    if (sortedByDistance) return [{ key: '__near', label: null, items: places }]
    const byArea = new Map()
    for (const p of places) {
      const key = p.neighborhood || 'Elsewhere'
      if (!byArea.has(key)) byArea.set(key, [])
      byArea.get(key).push(p)
    }
    return [...byArea.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, items]) => ({ key, label: key, items }))
  }, [places, sortedByDistance])

  return (
    <div className="h-full overflow-y-auto bg-paper">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <p className="text-[13px] text-ink-soft">
          <span className="font-semibold text-ink tabular-nums">{places.length}</span>{' '}
          {places.length === 1 ? 'place' : 'places'}
          {sortedByDistance && ' · nearest first'}
        </p>
        <button
          type="button"
          onClick={onLocate}
          disabled={geoStatus === 'locating'}
          className="flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-[13px] font-semibold text-white disabled:opacity-55"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" className={geoStatus === 'locating' ? 'animate-spin' : ''}>
            {geoStatus === 'locating' ? <path d="M12 3a9 9 0 1 0 9 9" /> : <path d="M21 3 3 10.5l7.5 3L13.5 21 21 3Z" />}
          </svg>
          {geoStatus === 'locating' ? 'Locating' : 'Near me'}
        </button>
      </div>

      {(geoStatus === 'denied' || geoStatus === 'error') && (
        <p className="mx-4 mb-3 rounded-xl bg-[#f6efdc] px-3.5 py-2.5 text-[13px] leading-relaxed text-[#6b5410]">
          {geoStatus === 'denied'
            ? 'Location permission was denied. Enable it in Settings → Safari → Location to sort by distance.'
            : "Couldn't get a fix — this needs an https:// connection, and a clear view of the sky helps."}
        </p>
      )}

      {groups.map((group) => (
        <section key={group.key}>
          {group.label && (
            <div className="flex items-baseline justify-between border-b border-hairline px-4 pt-4 pb-2">
              <h2 className="display text-[15px] text-ink">{group.label}</h2>
              <span className="text-[13px] text-ink-faint tabular-nums">{group.items.length}</span>
            </div>
          )}
          <ul>
            {group.items.map((place) => (
              <PlaceRow
                key={place.id}
                place={place}
                onSelect={onSelect}
                isBookmarked={isBookmarked}
                onToggleBookmark={onToggleBookmark}
                showDistance={sortedByDistance}
              />
            ))}
          </ul>
        </section>
      ))}

      {places.length === 0 && (
        <p className="px-6 py-20 text-center text-[14px] text-ink-soft">
          Nothing matches these filters.
        </p>
      )}
      <div style={{ height: 'calc(var(--sab) + 4rem)' }} />
    </div>
  )
}
