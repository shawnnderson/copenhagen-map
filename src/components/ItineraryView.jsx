import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { POOL, addDay, findContainer, removeLastDay } from '../lib/itinerary.js'
import { categoryOf } from '../lib/categories.js'
import { PLACES_BY_ID } from '../lib/places.js'

function Row({ place, onOpen, onRemove, inPool }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: place.id,
  })
  const cat = categoryOf(place.category)

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-xl bg-white px-2 py-2.5 shadow-sm ring-1 ring-black/5 ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      {/* Listeners live on the handle only, so the page still scrolls on touch. */}
      <button
        type="button"
        className="drag-handle px-2 py-2 text-lg leading-none text-slate-400"
        aria-label={`Reorder ${place.name}`}
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>

      <button type="button" onClick={() => onOpen(place.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: cat.color }} aria-hidden />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-ink">{place.name}</span>
          <span className="block truncate text-xs text-ink-soft">{place.neighborhood}</span>
        </span>
      </button>

      {!inPool && (
        <button
          type="button"
          onClick={() => onRemove(place.id)}
          aria-label={`Remove ${place.name} from this day`}
          className="px-3 py-2 text-sm text-slate-400"
        >
          ✕
        </button>
      )}
    </li>
  )
}

function Container({ id, title, subtitle, placeIds, onOpen, onRemove, inPool }) {
  // Droppable (not sortable) — the day itself is a target, never a dragged item.
  const { setNodeRef } = useDroppable({ id })

  return (
    <section className="mb-4">
      <div className="mb-2 flex items-baseline justify-between px-1">
        <h2 className="text-sm font-bold tracking-wide text-ink uppercase">{title}</h2>
        <span className="text-xs text-ink-soft">{subtitle}</span>
      </div>
      <SortableContext items={placeIds} strategy={verticalListSortingStrategy}>
        <ul ref={setNodeRef} className="min-h-[64px] space-y-2 rounded-2xl bg-slate-200/60 p-2">
          {placeIds.map((pid) => {
            const place = PLACES_BY_ID.get(pid)
            return place ? (
              <Row key={pid} place={place} onOpen={onOpen} onRemove={onRemove} inPool={inPool} />
            ) : null
          })}
          {placeIds.length === 0 && (
            <li className="grid h-14 place-items-center text-xs text-ink-soft">
              Drag a place here
            </li>
          )}
        </ul>
      </SortableContext>
    </section>
  )
}

export default function ItineraryView({ itinerary, setItinerary, onOpen }) {
  const [activeId, setActiveId] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // Moving between containers happens during the drag so the placeholder is live.
  const handleDragOver = ({ active, over }) => {
    if (!over) return
    setItinerary((prev) => {
      const from = findContainer(prev.lists, active.id)
      const to = findContainer(prev.lists, over.id)
      if (!from || !to || from === to) return prev

      const fromIds = prev.lists[from].filter((id) => id !== active.id)
      const toIds = [...prev.lists[to]]
      const overIndex = toIds.indexOf(over.id)
      toIds.splice(overIndex === -1 ? toIds.length : overIndex, 0, active.id)

      return { ...prev, lists: { ...prev.lists, [from]: fromIds, [to]: toIds } }
    })
  }

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null)
    if (!over || active.id === over.id) return
    setItinerary((prev) => {
      const from = findContainer(prev.lists, active.id)
      const to = findContainer(prev.lists, over.id)
      if (!from || from !== to) return prev
      const ids = prev.lists[from]
      return {
        ...prev,
        lists: { ...prev.lists, [from]: arrayMove(ids, ids.indexOf(active.id), ids.indexOf(over.id)) },
      }
    })
  }

  const removeFromDay = (placeId) =>
    setItinerary((prev) => {
      const from = findContainer(prev.lists, placeId)
      if (!from || from === POOL) return prev
      return {
        ...prev,
        lists: {
          ...prev.lists,
          [from]: prev.lists[from].filter((id) => id !== placeId),
          [POOL]: [...prev.lists[POOL], placeId],
        },
      }
    })

  const activePlace = activeId ? PLACES_BY_ID.get(activeId) : null

  return (
    <div className="h-full overflow-y-auto bg-slate-100" style={{ paddingTop: 'calc(var(--sat) + 0.5rem)' }}>
      <header className="flex items-center justify-between px-4 py-3">
        <div>
          <h1 className="text-lg font-bold text-ink">Itinerary</h1>
          <p className="text-xs text-ink-soft">Hold a handle to drag between days</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setItinerary(removeLastDay)}
            disabled={itinerary.days.length <= 1}
            aria-label="Remove last day"
            className="h-10 w-10 rounded-full bg-white text-lg font-bold text-ink-soft shadow-sm disabled:opacity-40"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => setItinerary(addDay)}
            aria-label="Add a day"
            className="h-10 w-10 rounded-full bg-ink text-lg font-bold text-white shadow-sm"
          >
            +
          </button>
        </div>
      </header>

      <div className="px-3">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          modifiers={[restrictToVerticalAxis]}
          onDragStart={({ active }) => setActiveId(active.id)}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          {itinerary.days.map((day, i) => (
            <Container
              key={day.id}
              id={day.id}
              title={`Day ${i + 1}`}
              subtitle={`${itinerary.lists[day.id]?.length ?? 0} stop${
                itinerary.lists[day.id]?.length === 1 ? '' : 's'
              }`}
              placeIds={itinerary.lists[day.id] ?? []}
              onOpen={onOpen}
              onRemove={removeFromDay}
            />
          ))}

          <Container
            id={POOL}
            title="Unscheduled"
            subtitle={`${itinerary.lists[POOL]?.length ?? 0}`}
            placeIds={itinerary.lists[POOL] ?? []}
            onOpen={onOpen}
            onRemove={removeFromDay}
            inPool
          />

          <DragOverlay>
            {activePlace && (
              <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 shadow-2xl ring-2 ring-ink/10">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: categoryOf(activePlace.category).color }}
                />
                <span className="text-sm font-semibold text-ink">{activePlace.name}</span>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
      <div style={{ height: 'calc(var(--sab) + 5rem)' }} />
    </div>
  )
}
