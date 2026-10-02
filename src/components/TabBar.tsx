import { TAB_GROUPS, TABS } from "../tabs/registry";

export function TabBar({ active, onSelect }: { active: string; onSelect: (key: string) => void }) {
  const activeGroup = TABS.find((t) => t.key === active)?.group;
  return (
    <nav className="no-print flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      {TAB_GROUPS.map((g) => (
        <div key={g.key} className="flex flex-wrap items-center gap-1">
          <span
            className={`mr-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              g.key === activeGroup
                ? "bg-blue-50 text-blue-600 ring-1 ring-blue-200"
                : "bg-slate-50 text-slate-500 ring-1 ring-slate-200"
            }`}
          >
            {g.label}
          </span>
          {TABS.filter((t) => t.group === g.key).map((t) => (
            <button
              key={t.key}
              onClick={() => onSelect(t.key)}
              aria-current={t.key === active ? "page" : undefined}
              className={`rounded-full px-2.5 py-1 text-[13px] transition-colors ${
                t.key === active
                  ? "bg-blue-50 font-semibold text-blue-700 ring-1 ring-blue-300"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      ))}
    </nav>
  );
}
