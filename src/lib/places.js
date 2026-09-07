import raw from '../data/places.json'

export const CITY = 'Copenhagen'
export const CITY_CENTER = { lat: 55.6761, lng: 12.5683 }

// Danish letters don't decompose under NFD, so transliterate them first.
const DANISH = { '\u00e6': 'ae', '\u00f8': 'oe', '\u00e5': 'aa' }

function slug(name) {
  return String(name)
    .toLowerCase()
    .replace(/[\u00e6\u00f8\u00e5]/g, (c) => DANISH[c])
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function hasCoords(p) {
  return Number.isFinite(p.lat) && Number.isFinite(p.lng) && !(p.lat === 0 && p.lng === 0)
}

// Stable ids derived from the name so bookmarks and itineraries survive edits to
// places.json. Duplicate names get a numeric suffix.
const seen = new Map()

export const PLACES = raw.map((p) => {
  const base = slug(p.name)
  const n = (seen.get(base) ?? 0) + 1
  seen.set(base, n)
  return { ...p, id: n === 1 ? base : `${base}-${n}`, hasCoords: hasCoords(p) }
})

export const MAPPABLE = PLACES.filter((p) => p.hasCoords)

export const PLACES_BY_ID = new Map(PLACES.map((p) => [p.id, p]))

export function googleMapsUrl(place) {
  // '+' rather than %20 for the classic maps.google.com/?q=name+city form.
  const q = encodeURIComponent(`${place.name} ${CITY}`).replace(/%20/g, '+')
  return `https://maps.google.com/?q=${q}`
}
