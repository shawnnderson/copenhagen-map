const ICONS = {
  map: (
    <>
      <path d="M9 4 3 6.5v14L9 18l6 2.5 6-2.5v-14L15 6.5 9 4Z" />
      <path d="M9 4v14M15 6.5v14" />
    </>
  ),
  list: <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />,
  itinerary: (
    <>
      <path d="M4 6.5h16v14H4v-14Z" />
      <path d="M4 10.5h16M8.5 3.5v5M15.5 3.5v5" />
    </>
  ),
}

const TABS = [
  { id: 'map', label: 'Map' },
  { id: 'list', label: 'List' },
  { id: 'itinerary', label: 'Trip' },
]

/** Bottom navigation: line icons, count badge, and a rule under the active tab. */
export default function TabBar({ view, onChange, itineraryCount }) {
  return (
    <nav
      className="border-t border-hairline bg-surface"
      style={{ paddingBottom: 'var(--sab)' }}
    >
      <ul className="flex">
        {TABS.map((tab) => {
          const active = view === tab.id
          const badge = tab.id === 'itinerary' ? itineraryCount : 0
          return (
            <li key={tab.id} className="relative flex-1">
              <button
                type="button"
                onClick={() => onChange(tab.id)}
                aria-current={active ? 'page' : undefined}
                className={`flex w-full flex-col items-center gap-1 pt-2.5 pb-2 text-[11px] font-semibold transition ${
                  active ? 'text-ink' : 'text-ink-faint'
                }`}
              >
                <span className="relative">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={active ? 1.9 : 1.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    {ICONS[tab.id]}
                  </svg>
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 grid h-4 min-w-4 place-items-center rounded-full bg-ink px-1 text-[10px] font-bold text-white tabular-nums">
                      {badge}
                    </span>
                  )}
                </span>
                {tab.label}
              </button>
              {active && <span className="absolute inset-x-6 bottom-0 h-0.5 rounded-full bg-ink" />}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
