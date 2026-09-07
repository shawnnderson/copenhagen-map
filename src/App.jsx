import { useCallback, useMemo, useState } from 'react'
import MapView from './components/MapView.jsx'
import ListView from './components/ListView.jsx'
import ItineraryView from './components/ItineraryView.jsx'
import PlaceSheet from './components/PlaceSheet.jsx'
import FilterBar from './components/FilterBar.jsx'
import Legend from './components/Legend.jsx'
import TabBar from './components/TabBar.jsx'
import { CATEGORY_KEYS } from './lib/categories.js'
import { MAPPABLE, PLACES, PLACES_BY_ID } from './lib/places.js'
import { distanceKm } from './lib/geo.js'
import { usePersistentState, useBookmarks } from './lib/storage.js'
import { assign, dayIndexOf, makeInitial, reconcile, POOL } from './lib/itinerary.js'

const ALL_IDS = PLACES.map((p) => p.id)
const SHEET_OFFSET = 260 // px of sheet to keep clear when flying to a pin

export default function App() {
  const [view, setView] = useState('map')
  const [activeCats, setActiveCats] = useState(CATEGORY_KEYS)
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [focus, setFocus] = useState(null)
  const [nudge, setNudge] = useState(null)
  const [position, setPosition] = useState(null)
  const [geoStatus, setGeoStatus] = useState('idle')
  const [sortByDistance, setSortByDistance] = useState(false)

  const { bookmarks, toggleBookmark, isBookmarked } = useBookmarks()

  // Stored itinerary is normalised on read, so edits to places.json can't corrupt it.
  const [storedItinerary, setStoredItinerary] = usePersistentState(
    'cph.itinerary',
    makeInitial(ALL_IDS),
  )
  const itinerary = useMemo(() => reconcile(storedItinerary, ALL_IDS), [storedItinerary])

  const setItinerary = useCallback(
    (updater) =>
      setStoredItinerary((prev) =>
        typeof updater === 'function' ? updater(reconcile(prev, ALL_IDS)) : updater,
      ),
    [setStoredItinerary],
  )

  const toggleCat = useCallback(
    (key) =>
      setActiveCats((prev) =>
        prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
      ),
    [],
  )

  const withDistance = useCallback(
    (list) =>
      position
        ? list.map((p) => ({ ...p, distanceKm: distanceKm(position, p) }))
        : list.map((p) => ({ ...p, distanceKm: null })),
    [position],
  )

  const matches = useCallback(
    (p) => activeCats.includes(p.category) && (!bookmarkedOnly || isBookmarked(p.id)),
    [activeCats, bookmarkedOnly, isBookmarked],
  )

  const mapPlaces = useMemo(() => MAPPABLE.filter(matches), [matches])

  const listPlaces = useMemo(() => {
    const filtered = withDistance(PLACES.filter(matches))
    if (sortByDistance && position) {
      return [...filtered].sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
    }
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name))
  }, [matches, withDistance, sortByDistance, position])

  const counts = useMemo(() => {
    const acc = {}
    for (const p of PLACES) acc[p.category] = (acc[p.category] ?? 0) + 1
    return acc
  }, [])

  const [legendOpen, setLegendOpen] = useState(false)

  const selected = selectedId ? PLACES_BY_ID.get(selectedId) : null

  const openPlace = useCallback((id) => {
    const place = PLACES_BY_ID.get(id)
    setSelectedId(id)
    if (place?.hasCoords) {
      setView('map')
      setFocus({ lat: place.lat, lng: place.lng, at: Date.now() })
    }
  }, [])

  // Pin taps don't re-centre the map; they only nudge it if the sheet would hide the pin.
  const selectOnMap = useCallback((id) => {
    const place = PLACES_BY_ID.get(id)
    setSelectedId(id)
    if (place?.hasCoords) setNudge({ lat: place.lat, lng: place.lng, at: Date.now() })
  }, [])

  const locate = useCallback(() => {
    if (!navigator.geolocation) return setGeoStatus('error')
    setGeoStatus('locating')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPosition({ lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy })
        setSortByDistance(true)
        setGeoStatus('ready')
      },
      (err) => setGeoStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'error'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }, [])

  const nearMeFromMap = useCallback(() => {
    setView('list')
    locate()
  }, [locate])

  const assignDay = useCallback(
    (placeId, dayId) => setItinerary((prev) => assign(prev, placeId, dayId)),
    [setItinerary],
  )

  const dayOf = useCallback(
    (placeId) => {
      const i = dayIndexOf(itinerary, placeId)
      return i === -1 ? null : itinerary.days[i].id
    },
    [itinerary],
  )

  const scheduledCount = useMemo(
    () => ALL_IDS.length - (itinerary.lists[POOL]?.length ?? 0),
    [itinerary],
  )

  return (
    <div className="flex h-full flex-col overflow-hidden bg-paper">
      {/* Persistent masthead — wordmark left, city right, as a fixed anchor. */}
      <header
        className="flex shrink-0 items-center justify-between border-b border-hairline bg-paper px-4 pb-2.5"
        style={{ paddingTop: 'calc(var(--sat) + 0.65rem)' }}
      >
        <span className="wordmark text-[17px] text-ink">Trip</span>
        <span className="wordmark rounded-full bg-ink px-3 py-1.5 text-[11px] text-white">
          København
        </span>
      </header>

      {view === 'map' && (
        <div className="shrink-0 border-b border-hairline bg-paper">
          <FilterBar
            activeCats={activeCats}
            onToggleCat={toggleCat}
            onReset={() => {
              setActiveCats(CATEGORY_KEYS)
              setBookmarkedOnly(false)
            }}
            bookmarkedOnly={bookmarkedOnly}
            onToggleBookmarked={() => setBookmarkedOnly((v) => !v)}
            bookmarkCount={bookmarks.length}
            counts={counts}
            total={PLACES.length}
          />
        </div>
      )}

      <main className="relative min-h-0 flex-1">
        {/* The map stays mounted so pan/zoom survive tab switches. */}
        <div
          className={`absolute inset-0 ${view === 'map' ? '' : 'invisible'}`}
          aria-hidden={view !== 'map'}
        >
          <MapView
            active={view === 'map'}
            places={mapPlaces}
            totalCount={MAPPABLE.length}
            selectedId={selectedId}
            onSelect={selectOnMap}
            position={position}
            focus={focus}
            nudge={nudge}
            sheetOffset={SHEET_OFFSET}
            onLocate={nearMeFromMap}
            locating={geoStatus === 'locating'}
            legendOpen={legendOpen}
            onToggleLegend={() => setLegendOpen((v) => !v)}
            legend={<Legend counts={counts} />}
          />
        </div>

        {view === 'list' && (
          <div className="absolute inset-0">
            <ListView
              places={listPlaces}
              onSelect={openPlace}
              isBookmarked={isBookmarked}
              onToggleBookmark={toggleBookmark}
              geoStatus={geoStatus}
              onLocate={locate}
              sortedByDistance={sortByDistance && !!position}
            />
          </div>
        )}

        {view === 'itinerary' && (
          <div className="absolute inset-0">
            <ItineraryView itinerary={itinerary} setItinerary={setItinerary} onOpen={openPlace} />
          </div>
        )}
      </main>

      <TabBar view={view} onChange={setView} itineraryCount={scheduledCount} />

      <PlaceSheet
        place={selected}
        onClose={() => setSelectedId(null)}
        isBookmarked={selected ? isBookmarked(selected.id) : false}
        onToggleBookmark={toggleBookmark}
        days={itinerary.days}
        dayOf={dayOf}
        onAssignDay={assignDay}
        distanceKm={selected && position ? distanceKm(position, selected) : null}
      />
    </div>
  )
}
