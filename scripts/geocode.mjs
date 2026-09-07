#!/usr/bin/env node
/**
 * Fills in missing lat/lng in src/data/places.json using Nominatim.
 *
 * This is a BUILD-TIME script. The app never geocodes at runtime — it only ever
 * reads coordinates that are already committed to places.json.
 *
 * Nominatim usage policy (https://operations.osmfoundation.org/policies/nominatim/):
 *   - absolute maximum of 1 request per second
 *   - a real, identifying User-Agent is required
 * Both are enforced below. Results are cached in scripts/.geocode-cache.json so
 * re-runs make zero network requests for places already resolved.
 *
 * Usage:
 *   npm run geocode                 # fill in anything missing
 *   npm run geocode -- --force      # re-geocode everything, ignoring cache
 *   npm run geocode -- --dry-run    # show what would change, write nothing
 *   npm run geocode -- --city "Aarhus, Denmark"
 */
import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const PLACES_PATH = resolve(HERE, '../src/data/places.json')
const CACHE_PATH = resolve(HERE, '.geocode-cache.json')

const ENDPOINT = 'https://nominatim.openstreetmap.org/search'
const RATE_LIMIT_MS = 1100 // 1 req/sec with headroom
const CONTACT = process.env.GEOCODE_CONTACT || 'copenhagen-map (personal trip planner)'
const USER_AGENT = `copenhagen-map/1.0 (+${CONTACT})`

const args = process.argv.slice(2)
const has = (flag) => args.includes(flag)
const valueOf = (flag, fallback) => {
  const i = args.indexOf(flag)
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback
}

const FORCE = has('--force')
const DRY_RUN = has('--dry-run')
const CITY = valueOf('--city', 'Copenhagen, Denmark')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function needsCoords(place) {
  const bad = (n) => typeof n !== 'number' || !Number.isFinite(n)
  return FORCE || bad(place.lat) || bad(place.lng) || (place.lat === 0 && place.lng === 0)
}

function queryFor(place) {
  // `geocodeQuery` is an escape hatch for places OSM files under a different
  // name than you want displayed ("Finn Juhls Hus" vs "Finn Juhl's House").
  if (place.geocodeQuery) return place.geocodeQuery
  // Neighborhood meaningfully disambiguates common names ("Ruby", "Hart").
  // An optional per-place `city` covers day trips outside the default city.
  return [place.name, place.neighborhood, place.city || CITY].filter(Boolean).join(', ')
}

async function loadJson(path, fallback) {
  if (!existsSync(path)) return fallback
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch (err) {
    console.error(`✗ Could not parse ${path}: ${err.message}`)
    process.exit(1)
  }
}

async function geocode(query) {
  const url = `${ENDPOINT}?${new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: '1',
    addressdetails: '1',
  })}`

  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  })

  if (res.status === 429 || res.status === 503) {
    throw new Error(`rate limited by Nominatim (HTTP ${res.status}) — wait a minute and re-run`)
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)

  const [hit] = await res.json()
  if (!hit) return null

  const a = hit.address ?? {}
  // Nominatim's district fields, most specific first. Used only to fill a
  // neighborhood that was left blank — never to overwrite one you wrote.
  const neighborhood =
    a.neighbourhood || a.suburb || a.quarter || a.city_district || a.borough || a.town || null

  return {
    lat: Number(Number(hit.lat).toFixed(6)),
    lng: Number(Number(hit.lon).toFixed(6)),
    neighborhood,
    displayName: hit.display_name,
    osmId: `${hit.osm_type ?? '?'}/${hit.osm_id ?? '?'}`,
    fetchedAt: new Date().toISOString(),
  }
}

async function main() {
  const places = await loadJson(PLACES_PATH, null)
  if (!Array.isArray(places)) {
    console.error(`✗ ${PLACES_PATH} must contain a JSON array.`)
    process.exit(1)
  }

  const cache = await loadJson(CACHE_PATH, {})
  const pending = places.filter(needsCoords)

  if (pending.length === 0) {
    console.log(`✓ All ${places.length} places already have coordinates. Nothing to do.`)
    return
  }

  console.log(`Geocoding ${pending.length} of ${places.length} place(s) against "${CITY}".`)
  if (DRY_RUN) console.log('(dry run — no files will be written)\n')

  let resolved = 0
  let failed = 0
  let requests = 0

  for (const place of pending) {
    const query = queryFor(place)
    let hit = FORCE ? null : cache[query]

    if (hit) {
      console.log(`  · ${place.name} — cached`)
    } else {
      // Rate limit applies only to actual network requests.
      if (requests > 0) await sleep(RATE_LIMIT_MS)
      requests++
      try {
        hit = await geocode(query)
      } catch (err) {
        console.error(`  ✗ ${place.name} — ${err.message}`)
        failed++
        continue
      }
      if (!hit) {
        console.warn(`  ? ${place.name} — no match for "${query}"`)
        failed++
        continue
      }
      cache[query] = hit
      console.log(`  ✓ ${place.name} — ${hit.lat}, ${hit.lng}`)
      console.log(`      ${hit.displayName}`)
    }

    place.lat = hit.lat
    place.lng = hit.lng
    if (!place.neighborhood && hit.neighborhood) place.neighborhood = hit.neighborhood
    resolved++
  }

  if (!DRY_RUN && resolved > 0) {
    await writeFile(PLACES_PATH, `${JSON.stringify(places, null, 2)}\n`, 'utf8')
    await writeFile(CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`, 'utf8')
  }

  console.log(
    `\n${DRY_RUN ? 'Would resolve' : 'Resolved'} ${resolved} place(s)` +
      (failed ? `, ${failed} failed.` : '.') +
      (requests ? ` ${requests} network request(s).` : ' No network requests needed.'),
  )
  if (failed) {
    console.log('Tip: check spelling, or add the coordinates by hand from Google Maps.')
    process.exitCode = 1
  }
}

main().catch((err) => {
  console.error(`✗ ${err.stack || err.message}`)
  process.exit(1)
})
