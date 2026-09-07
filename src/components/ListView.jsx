import { categoryOf } from '../lib/categories.js'
import { formatDistance } from '../lib/geo.js'

/** Flat list, optionally sorted by distance from the device's current position. */
export default function ListView({ places, onSelect, isBookmarked, onToggleBookmark, position, geoStatus, onLocate, sortedByDistance }) {
  return (
    <div className="h-full overflow-y-auto bg-slate-100" style={{ paddingTop: 'calc(var(--sat) + 0.5rem)' }}>
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-ink">Places</h1>
            <p className="text-xs text-ink-soft">
              {places.length} shown
              {sortedByDistance ? ' · nearest first' : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onLocate}
            disabled={geoStatus === 'locating'}
            className="flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md disabled:opacity-60"
          >
            <span aria-hidden>{geoStatus === 'locating' ? '⏳' : '📍'}</span>
            {geoStatus === 'locating' ? 'Locating…' : 'Near me'}
          </button>
        </div>
        {geoStatus === 'denied' && (
          <p className="mt-2 rounded-lg bg-amber-100 px-3 py-2 text-xs text-amber-900">
            Location permission was denied. Enable it in Settings → Safari → Location to sort by distance.
          </p>
        )}
        {geoStatus === 'error' && (
          <p className="mt-2 rounded-lg bg-amber-100 px-3 py-2 text-xs text-amber-900">
            Couldn't get a fix. Try again once you have a clearer view of the sky.
          </p>
        )}
      </header>

      <ul className="divide-y divide-slate-200">
        {places.map((place) => {
          const cat = categoryOf(place.category)
          const saved = isBookmarked(place.id)
          return (
            <li key={place.id} className="flex items-center gap-1 bg-white">
              <button
                type="button"
                onClick={() => onSelect(place.id)}
                className="flex min-w-0 flex-1 items-start gap-3 px-4 py-4 text-left active:bg-slate-50"
              >
                <span
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm"
                  style={{ background: `${cat.color}1f` }}
                  aria-hidden
                >
                  {cat.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-ink">{place.name}</span>
                  <span className="mt-0.5 block truncate text-xs text-ink-soft">
                    {place.neighborhood}
                    {place.recommendedBy && <> · via {place.recommendedBy}</>}
                  </span>
                  {position && place.distanceKm != null && (
                    <span className="mt-1 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 tabular-nums">
                      {formatDistance(place.distanceKm)}
                    </span>
                  )}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onToggleBookmark(place.id)}
                aria-pressed={saved}
                aria-label={saved ? `Remove ${place.name} from saved` : `Save ${place.name}`}
                className="px-4 py-5 text-xl"
              >
                <span className={saved ? 'text-amber-500' : 'text-slate-300'}>{saved ? '★' : '☆'}</span>
              </button>
            </li>
          )
        })}
      </ul>

      {places.length === 0 && (
        <p className="px-6 py-16 text-center text-sm text-ink-soft">
          Nothing matches these filters.
        </p>
      )}
      <div style={{ height: 'calc(var(--sab) + 5rem)' }} />
    </div>
  )
}
