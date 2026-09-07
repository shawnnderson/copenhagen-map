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
import CategoryIcon from './CategoryIcon.jsx'
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
      className={`flex items-center gap-1 rounded-2xl border border-hairline bg-surface px-1.5 py-2.5 ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      {/* Listeners live on the handle only, so the page still scrolls on touch. */}
      <button
        type="button"
        className="drag-handle px-2 py-2 text-ink-faint"
        aria-label={`Reorder ${place.name}`}
        {...attributes}
        {...listeners}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="9" cy="6" r="1.6" />
          <circle cx="15" cy="6" r="1.6" />
          <circle cx="9" cy="12" r="1.6" />
          <circle cx="15" cy="12" r="1.6" />
          <circle cx="9" cy="18" r="1.6" />
          <circle cx="15" cy="18" r="1.6" />
        </svg>
      </button>

      <button type="button" onClick={() => onOpen(place.id)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
        <span
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-white"
          style={{ background: cat.color }}
        >
          <CategoryIcon category={place.category} size={14} strokeWidth={2.2} />
        </span>
        <span className="min-w-0">
          <span className="display block truncate text-[15px] text-ink">{place.name}</span>
          <span className="block truncate text-[12px] text-ink-soft">{place.neighborhood}</span>
        </span>
      </button>

      {!inPool && (
        <button
          type="button"
          onClick={() => onRemove(place.id)}
          aria-label={`Remove ${place.name} from this day`}
          className="px-2.5 py-2 text-ink-faint"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
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
      <div className="mb-2 flex items-baseline justify-between border-b border-hairline px-1 pb-1.5">
        <h2 className="eyebrow text-ink">{title}</h2>
        <span className="text-[12px] text-ink-faint tabular-nums">{subtitle}</span>
      </div>
      <SortableContext items={placeIds} strategy={verticalListSortingStrategy}>
        <ul ref={setNodeRef} className="min-h-[60px] space-y-1.5 rounded-2xl p-1">
          {placeIds.map((pid) => {
            const place = PLACES_BY_ID.get(pid)
            return place ? (
              <Row key={pid} place={place} onOpen={onOpen} onRemove={onRemove} inPool={inPool} />
            ) : null
          })}
          {placeIds.length === 0 && (
            <li className="grid h-14 place-items-center rounded-xl border border-dashed border-hairline text-[12px] text-ink-faint">
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
    <div className="h-full overflow-y-auto bg-paper">
      <header className="flex items-center justify-between px-4 py-3">
        <p className="text-[13px] text-ink-soft">Hold a handle to drag between days</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setItinerary(removeLastDay)}
            disabled={itinerary.days.length <= 1}
            aria-label="Remove last day"
            className="grid h-9 w-9 place-items-center rounded-full border border-hairline bg-surface text-ink disabled:opacity-40"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12h14" /></svg>
          </button>
          <button
            type="button"
            onClick={() => setItinerary(addDay)}
            aria-label="Add a day"
            className="grid h-9 w-9 place-items-center rounded-full bg-ink text-white"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
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
              <div className="flex items-center gap-2.5 rounded-2xl bg-surface px-4 py-3 shadow-[0_10px_30px_rgba(22,23,26,0.25)]">
                <span
                  className="grid h-7 w-7 place-items-center rounded-full text-white"
                  style={{ background: categoryOf(activePlace.category).color }}
                >
                  <CategoryIcon category={activePlace.category} size={14} strokeWidth={2.2} />
                </span>
                <span className="display text-[15px] text-ink">{activePlace.name}</span>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
      <div style={{ height: 'calc(var(--sab) + 5rem)' }} />
    </div>
  )
}
