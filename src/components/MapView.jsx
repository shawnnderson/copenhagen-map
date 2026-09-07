import { useEffect, useMemo, useRef } from 'react'
import { MapContainer, Marker, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import BaseLayer from './BaseLayer.jsx'
import ClusterLayer from './ClusterLayer.jsx'
import { CITY_CENTER, MAPPABLE } from '../lib/places.js'
import { distanceKm } from '../lib/geo.js'

const CORE_RADIUS_KM = 6 // day trips beyond this don't drive the opening view

function MapController({ active, focus, nudge, sheetOffset, initialBounds }) {
  const map = useMap()
  const fitted = useRef(false)

  useEffect(() => {
    if (active) {
      const id = requestAnimationFrame(() => map.invalidateSize({ animate: false }))
      return () => cancelAnimationFrame(id)
    }
  }, [active, map])

  // Frame every pin once on first paint.
  useEffect(() => {
    if (fitted.current || !active || !initialBounds) return
    fitted.current = true
    map.fitBounds(initialBounds, { padding: [44, 44], maxZoom: 15 })
  }, [active, initialBounds, map])

  // Tapping a pin shouldn't re-centre the map — only nudge it if the sheet
  // would otherwise cover the pin.
  useEffect(() => {
    if (!nudge) return
    const point = map.latLngToContainerPoint([nudge.lat, nudge.lng])
    const limit = map.getSize().y - sheetOffset
    if (point.y > limit) map.panBy([0, point.y - limit + 24], { duration: 0.3 })
  }, [nudge, map, sheetOffset])

  useEffect(() => {
    if (!focus) return
    const zoom = Math.max(map.getZoom(), 15)
    const point = map.project([focus.lat, focus.lng], zoom).add([0, sheetOffset / 2])
    map.flyTo(map.unproject(point, zoom), zoom, { duration: 0.45 })
  }, [focus, map, sheetOffset])

  return null
}

function ControlButton({ onClick, label, dark, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`grid h-11 w-11 place-items-center rounded-full shadow-[0_2px_10px_rgba(22,23,26,0.16)] ring-1 transition active:scale-95 ${
        dark ? 'bg-ink text-white ring-transparent' : 'bg-surface text-ink ring-hairline'
      }`}
    >
      {children}
    </button>
  )
}

export default function MapView({
  active,
  places,
  totalCount,
  selectedId,
  onSelect,
  position,
  focus,
  nudge,
  sheetOffset,
  onLocate,
  locating,
  legendOpen,
  onToggleLegend,
  legend,
}) {
  // Frame the city cluster, not every pin: a day trip 30km up the coast would
  // otherwise zoom the opening view out over empty water. Outliers are still
  // on the map — just a pinch away.
  const initialBounds = useMemo(() => {
    if (!MAPPABLE.length) return null
    const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
    const centre = {
      lat: median(MAPPABLE.map((p) => p.lat)),
      lng: median(MAPPABLE.map((p) => p.lng)),
    }
    const core = MAPPABLE.filter((p) => distanceKm(centre, p) <= CORE_RADIUS_KM)
    return L.latLngBounds((core.length ? core : MAPPABLE).map((p) => [p.lat, p.lng]))
  }, [])

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[CITY_CENTER.lat, CITY_CENTER.lng]}
        zoom={13}
        zoomControl={false}
        maxZoom={18}
        // Leaflet's tile fade-in gets stuck at opacity 0 when invalidateSize
        // fires mid-fade (which it does when this tab becomes visible).
        // Nothing here needs the fade, so skip it entirely.
        fadeAnimation={false}
        attributionControl
        className="h-full w-full"
      >
        <BaseLayer />
        <ClusterLayer places={places} selectedId={selectedId} onSelect={onSelect} />
        {position && (
          <>
            <Circle
              center={[position.lat, position.lng]}
              radius={Math.min(position.accuracy ?? 50, 250)}
              pathOptions={{ color: '#14539e', fillColor: '#14539e', fillOpacity: 0.12, weight: 1 }}
            />
            <Marker
              position={[position.lat, position.lng]}
              icon={L.divIcon({
                className: 'pin',
                html: '<div style="width:15px;height:15px;border-radius:9999px;background:#14539e;border:3px solid #fff;box-shadow:0 1px 5px rgba(22,23,26,.45)"></div>',
                iconSize: [15, 15],
                iconAnchor: [7.5, 7.5],
              })}
            />
          </>
        )}
        <MapController
          active={active}
          focus={focus}
          nudge={nudge}
          sheetOffset={sheetOffset}
          initialBounds={initialBounds}
        />
      </MapContainer>

      {/* Count pill, centred over the map like a caption. */}
      <div className="pointer-events-none absolute inset-x-0 top-3 z-[500] flex justify-center">
        <span className="rounded-full bg-surface px-3.5 py-1.5 text-xs font-semibold text-ink shadow-[0_2px_10px_rgba(22,23,26,0.13)] tabular-nums">
          {places.length === totalCount
            ? `${totalCount} places`
            : `${places.length} of ${totalCount} places`}
        </span>
      </div>

      {/* Legend lives behind an 'i', bottom-left, as a quiet corner affordance. */}
      <div className="absolute bottom-3 left-3 z-[500]">
        {legendOpen && <div className="mb-2">{legend}</div>}
        <ControlButton
          onClick={onToggleLegend}
          label={legendOpen ? 'Hide legend' : 'Show legend'}
          dark={legendOpen}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="9.25" />
            <path d="M12 11v5.5M12 7.6v.1" />
          </svg>
        </ControlButton>
      </div>

      <div className="absolute right-3 bottom-3 z-[500]">
        <ControlButton onClick={onLocate} label="Find places near me" dark>
          {locating ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="animate-spin">
              <path d="M12 3a9 9 0 1 0 9 9" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
              <path d="M21 3 3 10.5l7.5 3L13.5 21 21 3Z" />
            </svg>
          )}
        </ControlButton>
      </div>
    </div>
  )
}
