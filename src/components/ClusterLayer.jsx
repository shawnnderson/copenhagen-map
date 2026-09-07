import { useEffect, useMemo, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.markercluster'
import { categoryOf, iconSvgMarkup } from '../lib/categories.js'

const RING_DEFAULT = '#ffffff'
const RING_SELECTED = '#c9a227'
const CLUSTER_INK = '#2f3033'

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

/** Cluster badge: same silhouette as a pin, scaled with the count. */
function clusterMarkup(count, color) {
  const r = count < 10 ? 16 : count < 50 ? 19 : 22
  const w = r * 2 + 5
  const h = r * 2 + 5 + 11
  const cx = w / 2
  const cy = r + 2.5
  const font = count < 10 ? 14 : count < 100 ? 15 : 13
  return `
<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
  <path d="M${cx} ${h - 1} L${cx - 6.4} ${cy + r - 3} h12.8 Z" fill="${color}"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" stroke="#ffffff" stroke-width="2.2"/>
  <text x="${cx}" y="${cy}" fill="#ffffff" font-size="${font}" font-weight="700"
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        text-anchor="middle" dominant-baseline="central">${count}</text>
</svg>`
}

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

/** A cluster takes the colour of whichever category dominates it. */
function dominantColor(markers) {
  const tally = new Map()
  for (const m of markers) {
    const c = m.options.placeCategory
    tally.set(c, (tally.get(c) ?? 0) + 1)
  }
  let best = null
  let bestN = -1
  let tied = false
  for (const [c, n] of tally) {
    if (n > bestN) {
      best = c
      bestN = n
      tied = false
    } else if (n === bestN) {
      tied = true
    }
  }
  // A mixed cluster with no clear winner reads better as neutral ink.
  return tied ? CLUSTER_INK : categoryOf(best).color
}

export default function ClusterLayer({ places, selectedId, onSelect }) {
  const map = useMap()
  const groupRef = useRef(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  const group = useMemo(
    () =>
      L.markerClusterGroup({
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: true,
        maxClusterRadius: 46,
        disableClusteringAtZoom: 17,
        iconCreateFunction: (cluster) => {
          const markers = cluster.getAllChildMarkers()
          const count = cluster.getChildCount()
          const size = count < 10 ? 37 : count < 50 ? 43 : 49
          return L.divIcon({
            html: clusterMarkup(count, dominantColor(markers)),
            className: 'pin',
            iconSize: [size, size + 11],
            iconAnchor: [size / 2, size + 10],
          })
        },
      }),
    [],
  )

  useEffect(() => {
    groupRef.current = group
    map.addLayer(group)
    return () => {
      map.removeLayer(group)
    }
  }, [group, map])

  useEffect(() => {
    group.clearLayers()
    const markers = places.map((place) =>
      L.marker([place.lat, place.lng], {
        icon: pinIcon(place.category, place.id === selectedId),
        placeCategory: place.category,
        zIndexOffset: place.id === selectedId ? 1000 : 0,
        alt: place.name,
      }).on('click', () => onSelectRef.current(place.id)),
    )
    group.addLayers(markers)
  }, [group, places, selectedId])

  return null
}
