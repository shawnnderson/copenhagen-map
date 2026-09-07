/**
 * Single source of truth for category identity: colour, label, and the icon
 * path data. Paths are authored on a 24x24 grid and stroked, so the same
 * geometry works in React components and in Leaflet's raw-HTML div icons.
 *
 * Colours are deliberately deep and desaturated — they have to sit on a
 * near-greyscale basemap without shouting.
 */
export const CATEGORIES = {
  restaurant: {
    label: 'Restaurants',
    short: 'Eat',
    color: '#8f1d2b',
    paths: ['M5 4v3.5a2.5 2.5 0 0 0 5 0V4', 'M7.5 8v12', 'M18.5 4c-1.7 1.5-2.6 3.5-2.6 5.6V12h2.6', 'M18.5 4v16'],
  },
  coffee: {
    label: 'Coffee',
    short: 'Coffee',
    color: '#17512c',
    paths: ['M4 8h11v5a5.5 5.5 0 0 1-5.5 5.5A5.5 5.5 0 0 1 4 13V8Z', 'M15 9.5h1.8a2.6 2.6 0 0 1 0 5.2H15', 'M4 21h12'],
  },
  bar: {
    label: 'Bars',
    short: 'Drinks',
    color: '#5b2270',
    paths: ['M4.5 5h15l-7.5 7.5L4.5 5Z', 'M12 12.5V19', 'M8 19.5h8'],
  },
  activity: {
    label: 'Activities',
    short: 'Do',
    color: '#14539e',
    paths: ['M3.5 8.5h17v2.6a2.4 2.4 0 0 0 0 4.8v2.6h-17v-2.6a2.4 2.4 0 0 0 0-4.8V8.5Z', 'M13.5 9v1.8M13.5 13.2V15M13.5 17.2V19'],
  },
  shop: {
    label: 'Shops',
    short: 'Shop',
    color: '#3a4550',
    paths: ['M5.5 7.5h13L17.3 20H6.7L5.5 7.5Z', 'M9.3 7.5V6a2.7 2.7 0 0 1 5.4 0v1.5'],
  },
}

export const CATEGORY_KEYS = Object.keys(CATEGORIES)

export const FALLBACK_CATEGORY = {
  label: 'Other',
  short: 'Other',
  color: '#6b6b66',
  paths: ['M12 21s7-6.4 7-11a7 7 0 1 0-14 0c0 4.6 7 11 7 11Z', 'M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z'],
}

export function categoryOf(key) {
  return CATEGORIES[key] ?? FALLBACK_CATEGORY
}

/** Icon markup as a string, for Leaflet div icons (which take raw HTML). */
export function iconSvgMarkup(categoryKey, { size = 24, color = 'currentColor', width = 1.9 } = {}) {
  const { paths } = categoryOf(categoryKey)
  const d = paths
    .map((p) => `<path d="${p}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`)
    .join('')
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">${d}</svg>`
}
