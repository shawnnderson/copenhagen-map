import { useEffect, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import { categoryOf } from '../lib/categories.js'
import { CITY_CENTER, MAPPABLE } from '../lib/places.js'

const PIN_SVG = (color, ring) => `
<svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
  <path d="M15 39C15 39 28 22.5 28 14A13 13 0 1 0 2 14C2 22.5 15 39 15 39Z"
        fill="${color}" stroke="${ring}" stroke-width="2"/>
  <circle cx="15" cy="14" r="5" fill="#ffffff"/>
</svg>`

// Leaflet mutates icon instances, so build one per category and reuse it.
const iconCache = new Map()

function pinIcon(categoryKey, selected) {
  const key = `${categoryKey}:${selected}`
  if (!iconCache.has(key)) {
    const { color } = categoryOf(categoryKey)
    iconCache.set(
      key,
      L.divIcon({
        html: PIN_SVG(color, selected ? '#0f172a' : '#ffffff'),
        className: `pin${selected ? ' pin-selected' : ''}`,
        iconSize: [30, 40],
        iconAnchor: [15, 39],
      }),
    )
  }
  return iconCache.get(key)
}

/**
 * Imperative map behaviour that has to reach into the Leaflet instance:
 * resizing when the tab becomes visible, and flying to a place while keeping
 * the pin clear of the bottom sheet.
 */
function MapController({ active, focus, nudge, sheetOffset, initialBounds }) {
  const map = useMap()
  const fitted = useRef(false)

  // Frame every pin once on first paint, rather than a fixed city centre that
  // can leave outlying places off-screen.
  useEffect(() => {
    if (fitted.current || !active || !initialBounds) return
    fitted.current = true
    map.fitBounds(initialBounds, { padding: [40, 40], maxZoom: 15 })
  }, [active, initialBounds, map])

  useEffect(() => {
    if (active) {
      // The container was display:none while another tab was up.
      const id = requestAnimationFrame(() => map.invalidateSize({ animate: false }))
      return () => cancelAnimationFrame(id)
    }
  }, [active, map])

  // Tapping a pin shouldn't move the map — unless the sheet would cover the pin,
  // in which case nudge it up by just enough to clear.
  useEffect(() => {
    if (!nudge) return
    const point = map.latLngToContainerPoint([nudge.lat, nudge.lng])
    const limit = map.getSize().y - sheetOffset
    if (point.y > limit) map.panBy([0, point.y - limit + 24], { duration: 0.3 })
  }, [nudge, map, sheetOffset])

  useEffect(() => {
    if (!focus) return
    const zoom = Math.max(map.getZoom(), 15)
    // Shift the centre down so the pin lands above the sheet, not behind it.
    const point = map.project([focus.lat, focus.lng], zoom).add([0, sheetOffset / 2])
    map.flyTo(map.unproject(point, zoom), zoom, { duration: 0.45 })
  }, [focus, map, sheetOffset])

  return null
}

export default function MapView({ active, places, selectedId, onSelect, position, focus, nudge, sheetOffset }) {
  // Based on every mappable place, so filtering doesn't change the opening view.
  const initialBounds = useMemo(() => {
    if (MAPPABLE.length === 0) return null
    return L.latLngBounds(MAPPABLE.map((p) => [p.lat, p.lng]))
  }, [])

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
    <MapContainer
      center={[CITY_CENTER.lat, CITY_CENTER.lng]}
      zoom={13}
      zoomControl={false}
      attributionControl
      preferCanvas
      className="h-full w-full"
    >
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
            pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.15, weight: 1 }}
          />
          <Marker
            position={[position.lat, position.lng]}
            icon={L.divIcon({
              className: 'pin',
              html: '<div style="width:16px;height:16px;border-radius:9999px;background:#2563eb;border:3px solid #fff;box-shadow:0 1px 4px rgba(15,23,42,.5)"></div>',
              iconSize: [16, 16],
              iconAnchor: [8, 8],
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
  )
}
