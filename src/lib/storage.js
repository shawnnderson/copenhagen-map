import { useCallback, useEffect, useMemo, useState } from 'react'

// localStorage can throw in private mode / when full — never let that break the app.
function read(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key)
    return raw == null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function usePersistentState(key, initial) {
  const [value, setValue] = useState(() => read(key, initial))

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* quota or blocked storage — keep running in memory */
    }
  }, [key, value])

  return [value, setValue]
}

export function useBookmarks() {
  const [ids, setIds] = usePersistentState('cph.bookmarks', [])

  const toggle = useCallback(
    (id) => setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
    [setIds],
  )

  // Stable identity so downstream useMemo/useCallback don't invalidate every render
  // (which would rebuild every Leaflet marker).
  const set = useMemo(() => new Set(ids), [ids])
  const isBookmarked = useCallback((id) => set.has(id), [set])

  return { bookmarks: ids, toggleBookmark: toggle, isBookmarked }
}
