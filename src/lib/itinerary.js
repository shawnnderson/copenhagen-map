export const POOL = 'pool'

export function makeInitial(placeIds) {
  const days = [{ id: 'day-1' }, { id: 'day-2' }, { id: 'day-3' }]
  const lists = { [POOL]: [...placeIds] }
  for (const d of days) lists[d.id] = []
  return { days, lists }
}

/**
 * Makes any stored itinerary safe to render: drops ids for places that no
 * longer exist in places.json, de-duplicates, and drops newly added places
 * into the pool. Pure and idempotent, so it can run on every render.
 */
export function reconcile(state, placeIds) {
  const valid = new Set(placeIds)
  const days =
    Array.isArray(state?.days) && state.days.length
      ? state.days.filter((d) => d && typeof d.id === 'string')
      : makeInitial([]).days

  const containers = [...days.map((d) => d.id), POOL]
  const lists = {}
  const seen = new Set()

  for (const c of containers) {
    const source = Array.isArray(state?.lists?.[c]) ? state.lists[c] : []
    lists[c] = source.filter((id) => valid.has(id) && !seen.has(id) && seen.add(id))
  }

  // Anything new in places.json lands in the pool.
  for (const id of placeIds) if (!seen.has(id)) lists[POOL].push(id)

  return { days, lists }
}

export function findContainer(lists, id) {
  if (id in lists) return id
  return Object.keys(lists).find((c) => lists[c].includes(id))
}

export function dayIndexOf(itinerary, placeId) {
  return itinerary.days.findIndex((d) => itinerary.lists[d.id]?.includes(placeId))
}

/** Moves a place into a day (or back to the pool when dayId is null). */
export function assign(itinerary, placeId, dayId) {
  const lists = {}
  for (const [c, ids] of Object.entries(itinerary.lists)) lists[c] = ids.filter((id) => id !== placeId)
  const target = dayId ?? POOL
  lists[target] = [...(lists[target] ?? []), placeId]
  return { ...itinerary, lists }
}

export function addDay(itinerary) {
  const nextId = `day-${Date.now().toString(36)}`
  return {
    days: [...itinerary.days, { id: nextId }],
    lists: { ...itinerary.lists, [nextId]: [] },
  }
}

/** Removes the last day, returning its places to the pool. */
export function removeLastDay(itinerary) {
  if (itinerary.days.length <= 1) return itinerary
  const last = itinerary.days[itinerary.days.length - 1]
  const { [last.id]: orphans = [], ...rest } = itinerary.lists
  return {
    days: itinerary.days.slice(0, -1),
    lists: { ...rest, [POOL]: [...rest[POOL], ...orphans] },
  }
}
