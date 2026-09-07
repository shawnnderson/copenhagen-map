import { useEffect, useRef, useState } from 'react'
import { categoryOf } from '../lib/categories.js'
import { googleMapsUrl } from '../lib/places.js'
import { formatDistance } from '../lib/geo.js'
import CategoryIcon from './CategoryIcon.jsx'

function Row({ label, children }) {
  return (
    <div className="flex gap-4 border-t border-hairline py-3">
      <span className="w-20 shrink-0 pt-px text-[13px] text-ink-soft">{label}</span>
      <span className="flex-1 text-[14px] text-ink">{children}</span>
    </div>
  )
}

export default function PlaceSheet({
  place,
  onClose,
  isBookmarked,
  onToggleBookmark,
  days,
  dayOf,
  onAssignDay,
  distanceKm,
}) {
  const [dragY, setDragY] = useState(0)
  const startY = useRef(null)

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
        className="fixed inset-0 z-[900] bg-ink/25"
      />

      <section
        role="dialog"
        aria-label={place.name}
        className="sheet-enter fixed inset-x-0 bottom-0 z-[901] flex max-h-[86vh] flex-col rounded-t-[28px] bg-surface shadow-[0_-8px_40px_rgba(22,23,26,0.22)]"
        style={{
          transform: `translateY(${dragY}px)`,
          transition: startY.current == null ? 'transform 200ms ease' : 'none',
        }}
      >
        <div
          className="drag-handle flex shrink-0 justify-center rounded-t-[28px] pt-3 pb-1"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <span className="h-1 w-9 rounded-full bg-hairline" />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-3">
          {/* Eyebrow: category badge + name, in the category's own colour. */}
          <div className="flex items-center gap-2.5">
            <span
              className="grid h-8 w-8 place-items-center rounded-full text-white"
              style={{ background: cat.color }}
            >
              <CategoryIcon category={place.category} size={16} strokeWidth={2.1} />
            </span>
            <span className="eyebrow" style={{ color: cat.color }}>
              {cat.label}
            </span>
            {place.isHome && (
              <span className="eyebrow rounded-full bg-[#c9a227]/15 px-2 py-1 text-[#7a6114]">
                Staying here
              </span>
            )}
          </div>

          <h2 className="display mt-3 text-[34px] leading-[1.05] text-ink">{place.name}</h2>

          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-ink-soft">
            <span className="font-medium text-ink">{place.neighborhood}</span>
            {distanceKm != null && (
              <>
                <span aria-hidden className="text-ink-faint">
                  ·
                </span>
                <span className="tabular-nums">{formatDistance(distanceKm)} away</span>
              </>
            )}
          </p>

          {place.recommendedBy && (
            <div className="mt-6">
              <p className="eyebrow text-ink-faint">Recommended by</p>
              <p className="mt-2 text-[15px] font-semibold text-ink">{place.recommendedBy}</p>
              {place.note && (
                <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">{place.note}</p>
              )}
            </div>
          )}

          {!place.recommendedBy && place.note && (
            <p className="mt-6 text-[15px] leading-relaxed text-ink-soft">{place.note}</p>
          )}

          <div className="mt-6">
            <Row label="Category">{cat.label}</Row>
            <Row label="Area">{place.neighborhood}</Row>
            <Row label="Day">
              <span className="flex flex-wrap gap-1.5">
                {days.map((day, i) => {
                  const active = assignedDay === day.id
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => onAssignDay(place.id, active ? null : day.id)}
                      aria-pressed={active}
                      className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold transition ${
                        active
                          ? 'border-ink bg-ink text-white'
                          : 'border-hairline bg-white text-ink-soft'
                      }`}
                    >
                      Day {i + 1}
                    </button>
                  )
                })}
              </span>
            </Row>
          </div>
        </div>

        {/* Actions pinned below the scroll area so they're always in thumb reach. */}
        <div
          className="shrink-0 border-t border-hairline px-6 pt-3"
          style={{ paddingBottom: 'calc(var(--sab) + 0.85rem)' }}
        >
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => onToggleBookmark(place.id)}
              aria-pressed={isBookmarked}
              className={`flex flex-1 items-center justify-center gap-2 rounded-full border py-3.5 text-[14px] font-semibold transition active:scale-[0.99] ${
                isBookmarked ? 'border-ink bg-ink text-white' : 'border-hairline bg-white text-ink'
              }`}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill={isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
                <path d="M6 3.5h12v17l-6-4.5-6 4.5v-17Z" />
              </svg>
              {isBookmarked ? 'Saved' : 'Save'}
            </button>
            <a
              href={googleMapsUrl(place)}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={`Open ${place.name} in Google Maps`}
              className="grid h-[50px] w-[50px] shrink-0 place-items-center rounded-full border border-hairline bg-white text-ink active:scale-[0.97]"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round">
                <path d="M12 21s7-6.4 7-11a7 7 0 1 0-14 0c0 4.6 7 11 7 11Z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
            </a>
          </div>

          <a
            href={googleMapsUrl(place)}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-2.5 flex items-center justify-center rounded-full bg-ink py-4 text-[15px] font-semibold text-white active:scale-[0.99]"
          >
            Google Maps
          </a>
        </div>
      </section>
    </>
  )
}
