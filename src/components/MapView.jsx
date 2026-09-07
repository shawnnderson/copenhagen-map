import { useEffect, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import { categoryOf, iconSvgMarkup } from '../lib/categories.js'
import { CITY_CENTER, MAPPABLE } from '../lib/places.js'

const RING_DEFAULT = '#ffffff'
const RING_SELECTED = '#c9a227' // warm gold, as on the reference's active pins

/**
 * Circular badge pin with a short tail: the tail is drawn first so the disc
 * overlaps it and the two read as one shape.
 */
function pinMarkup(categoryKey, selected) {
  const { color } = categoryOf(categoryKey)
  const ring = selected ? RING_SELECTED : RING_DEFAULT
  return `
<svg width="34" height="43" viewBox="0 0 34 43" xmlns="http://www.w3.org/2000/svg">
  <path d="M17 42 L10.2 28 h13.6 Z" fill="${color}"/>
  <circle cx="17" cy="17" r="14.5" fill="${color}" stroke="${ring}" stroke-width="${selected ? 2.8 : 2.2}"/>
  <g transform="translate(9.5,9.5) scale(0.625)">
    ${iconSvgMarkup(categoryKey, { size: 24, color: '#ffffff', width: 2.2 })}
  </g>
</svg>`
}

// Leaflet mutates icon instances, so cache one per (category, selected) pair.
const iconCache = new Map()

function pinIcon(categoryKey, selected) {
  const key = `${categoryKey}:${selected}`
  if (!iconCache.has(key)) {
    iconCache.set(
      key,
      L.divIcon({
        html: pinMarkup(categoryKey, selected),
        className: `pin${selected ? ' pin-selected' : ''}`,
        iconSize: [34, 43],
        iconAnchor: [17, 42],
      }),
    )
  }
  return iconCache.get(key)
}

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
  const initialBounds = useMemo(
    () => (MAPPABLE.length ? L.latLngBounds(MAPPABLE.map((p) => [p.lat, p.lng])) : null),
    [],
  )

  const markers = useMemo(
    () =>
      places.map((place) => (
        <Marker
          key={place.id}
          position={[place.lat, place.lng]}
          icon={pinIcon(place.category, place.id === selectedId)}
          zIndexOffset={place.id === selectedId ? 1000 : 0}
          eventHandlers={{ click: () => onSelect(place.id) }}
          alt={place.name}
        />
      )),
    [places, selectedId, onSelect],
  )

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[CITY_CENTER.lat, CITY_CENTER.lng]}
        zoom={13}
        zoomControl={false}
        attributionControl
        className="h-full w-full"
      >
        {/* Keyless OSM tiles, desaturated in CSS (see .leaflet-tile-pane in
            index.css) so the basemap recedes and pins are the only colour. */}
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
          crossOrigin="anonymous"
        />
        {markers}
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
