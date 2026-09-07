# København — trip map

A single-page, offline-friendly map of saved places for a trip to Copenhagen.
No backend, no API keys.

## Run it

```bash
npm install
npm run dev
```

Then open the printed URL. To try it on your phone, run `npm run dev -- --host`
and open the network URL from the phone (same Wi-Fi).

## Adding places

Edit `src/data/places.json`:

```json
{
  "name": "Sanchez",
  "category": "restaurant",
  "neighborhood": "Vesterbro",
  "note": "Book ahead.",
  "recommendedBy": "Anna"
}
```

`category` is one of `restaurant`, `coffee`, `bar`, `activity`, `shop`.

You can leave out `lat`/`lng` — then run:

```bash
npm run geocode
```

That fills in the coordinates from Nominatim (OpenStreetMap), one request per
second with an identifying User-Agent, and caches results in
`scripts/.geocode-cache.json` so re-runs make zero network requests.
**The app never geocodes at runtime** — it only reads coordinates already
committed to `places.json`.

Other flags:

```bash
npm run geocode -- --dry-run          # show what would change
npm run geocode -- --force            # re-geocode everything
npm run geocode -- --city "Aarhus, Denmark"
```

If a lookup misses, copy the coordinates from Google Maps by hand.

## Installing to the iOS home screen

```bash
npm run build && npm run preview -- --host
```

Open the network URL in Safari on the phone → Share → **Add to Home Screen**.
It installs standalone with its own icon, no browser chrome.

The service worker precaches the app shell and caches map tiles
(cache-first, up to 3000 tiles for 30 days), so anywhere you have already
panned stays usable on spotty data or fully offline. Note the service worker
only runs on a built/previewed site, not in `npm run dev`.

## Notes

- Bookmarks and the itinerary live in `localStorage` (`cph.bookmarks`,
  `cph.itinerary`). Editing `places.json` won't corrupt them — the itinerary is
  reconciled on load, and new places land in "Unscheduled".
- Icons are generated, not checked in by hand: `npm run icons` regenerates them
  from `scripts/make-icons.mjs` (change `BRAND` there to recolor).
- The basemap is standard OpenStreetMap raster, desaturated to a Positron-like
  grey by a CSS filter on `.leaflet-tile-pane` (see `src/index.css`). That keeps
  the look without an API key — CARTO's hosted Positron now requires one. Tune
  the `grayscale/brightness/contrast` values there to taste.
- Category colours, labels and icon geometry all live in `src/lib/categories.js`.
  Adding a category means adding one entry there; pins, chips, legend, list tags
  and the sheet all pick it up.
- Tiles come from OpenStreetMap. Fine for personal use; if this ever grows
  beyond that, switch `TileLayer` in `src/components/MapView.jsx` to a
  provider with a suitable plan.
