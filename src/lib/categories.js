// Single source of truth for category colors — used by pins, chips, and the legend.
export const CATEGORIES = {
  restaurant: { label: 'Eat', plural: 'Restaurants', color: '#ef4444', emoji: '🍽️' },
  coffee: { label: 'Coffee', plural: 'Coffee', color: '#b45309', emoji: '☕' },
  bar: { label: 'Drinks', plural: 'Bars', color: '#8b5cf6', emoji: '🍸' },
  activity: { label: 'Do', plural: 'Activities', color: '#0ea5e9', emoji: '🎟️' },
  shop: { label: 'Shop', plural: 'Shops', color: '#10b981', emoji: '🛍️' },
}

export const CATEGORY_KEYS = Object.keys(CATEGORIES)

export const FALLBACK_CATEGORY = { label: 'Other', plural: 'Other', color: '#64748b', emoji: '📍' }

export function categoryOf(key) {
  return CATEGORIES[key] ?? FALLBACK_CATEGORY
}
