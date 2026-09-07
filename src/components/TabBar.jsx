const TABS = [
  { id: 'map', label: 'Map', icon: '🗺️' },
  { id: 'list', label: 'List', icon: '📋' },
  { id: 'itinerary', label: 'Days', icon: '🗓️' },
]

/** Bottom navigation — the only always-visible chrome, kept in thumb reach. */
export default function TabBar({ view, onChange, itineraryCount }) {
  return (
    <nav
      className="border-t border-slate-200 bg-white/95 backdrop-blur"
      style={{ paddingBottom: 'var(--sab)' }}
    >
      <ul className="flex">
        {TABS.map((tab) => {
          const active = view === tab.id
          return (
            <li key={tab.id} className="flex-1">
              <button
                type="button"
                onClick={() => onChange(tab.id)}
                aria-current={active ? 'page' : undefined}
                className={`flex w-full flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition ${
                  active ? 'text-brand' : 'text-ink-soft'
                }`}
              >
                <span className="relative text-xl leading-none" aria-hidden>
                  {tab.icon}
                  {tab.id === 'itinerary' && itineraryCount > 0 && (
                    <span className="absolute -top-1 -right-2 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] text-white tabular-nums">
                      {itineraryCount}
                    </span>
                  )}
                </span>
                {tab.label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
