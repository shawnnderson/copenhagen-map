import { useEffect, useRef, useState } from 'react'
import { categoryOf } from '../lib/categories.js'
import { googleMapsUrl } from '../lib/places.js'
import { formatDistance } from '../lib/geo.js'

/**
 * Bottom sheet for a tapped pin. Swipe down on the handle (or tap the backdrop)
 * to dismiss — everything actionable sits within thumb reach at the bottom.
 */
export default function PlaceSheet({ place, onClose, isBookmarked, onToggleBookmark, days, dayOf, onAssignDay, distanceKm }) {
  const [dragY, setDragY] = useState(0)
  const startY = useRef(null)
  const sheetRef = useRef(null)

  useEffect(() => {
    setDragY(0)
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [place?.id, onClose])

  if (!place) return null

  const cat = categoryOf(place.category)
  const assignedDay = dayOf(place.id)

  const onPointerDown = (e) => {
    startY.current = e.clientY
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e) => {
    if (startY.current == null) return
    setDragY(Math.max(0, e.clientY - startY.current))
  }
  const onPointerUp = () => {
    if (dragY > 90) onClose()
    else setDragY(0)
    startY.current = null
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="fixed inset-0 z-[900] bg-ink/20 backdrop-blur-[1px]"
      />

      <section
        ref={sheetRef}
        role="dialog"
        aria-label={place.name}
        className="sheet-enter fixed inset-x-0 bottom-0 z-[901] max-h-[80vh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl"
        style={{
          transform: `translateY(${dragY}px)`,
          transition: startY.current == null ? 'transform 200ms ease' : 'none',
          paddingBottom: 'calc(var(--sab) + 1rem)',
        }}
      >
        <div
          className="drag-handle sticky top-0 flex justify-center rounded-t-3xl bg-white pb-1 pt-3"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <span className="h-1.5 w-10 rounded-full bg-slate-300" />
        </div>

        <div className="px-5 pt-2">
          <div className="flex items-start gap-3">
            <span
              className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg"
              style={{ background: `${cat.color}1f` }}
              aria-hidden
            >
              {cat.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl leading-tight font-bold text-ink">{place.name}</h2>
              <p className="mt-0.5 text-sm text-ink-soft">
                <span style={{ color: cat.color }} className="font-semibold">
                  {cat.plural}
                </span>
                {place.neighborhood && <> · {place.neighborhood}</>}
                {distanceKm != null && <> · {formatDistance(distanceKm)} away</>}
              </p>
            </div>
          </div>

          {place.note && <p className="mt-4 text-[15px] leading-relaxed text-ink">{place.note}</p>}

          {place.recommendedBy && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-ink-soft">
              <span aria-hidden>💬</span> Recommended by {place.recommendedBy}
            </p>
          )}

          {/* Day assignment feeds straight into the itinerary tab. */}
          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold tracking-wide text-ink-soft uppercase">
              Add to day
            </p>
            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              {days.map((day, i) => {
                const active = assignedDay === day.id
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => onAssignDay(place.id, active ? null : day.id)}
                    aria-pressed={active}
                    className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                      active ? 'bg-ink text-white' : 'bg-slate-100 text-ink-soft'
                    }`}
                  >
                    Day {i + 1}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            <a
              href={googleMapsUrl(place)}
              target="_blank"
              rel="noreferrer noopener"
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-4 text-[15px] font-semibold text-white shadow-lg active:scale-[0.98]"
            >
              <span aria-hidden>🧭</span> Open in Google Maps
            </a>
            <button
              type="button"
              onClick={() => onToggleBookmark(place.id)}
              aria-pressed={isBookmarked}
              className={`flex items-center justify-center gap-2 rounded-2xl px-5 py-4 text-[15px] font-semibold shadow-lg transition active:scale-[0.98] ${
                isBookmarked ? 'bg-amber-400 text-ink' : 'bg-slate-100 text-ink'
              }`}
            >
              <span aria-hidden>{isBookmarked ? '★' : '☆'}</span>
              {isBookmarked ? 'Saved' : 'Save'}
            </button>
          </div>
        </div>
      </section>
    </>
  )
}
