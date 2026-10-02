import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { DashboardData, TraceThread } from "../../types";
import { storyDisplayStatus, threadState, type ThreadState } from "../../lib/metrics";
import { Badge, Code, Dot, Empty, StatusPill } from "../../components/ui";

const FILTERS: { key: "all" | ThreadState; label: string }[] = [
  { key: "all", label: "All" },
  { key: "complete", label: "Complete" },
  { key: "in_progress", label: "In build" },
  { key: "no_evidence", label: "No COBOL evidence" },
  { key: "broken", label: "Broken" },
];

const STATE_PILL: Record<ThreadState, { status: "completed" | "in_progress" | "blocked" | "unknown"; label: string }> = {
  complete: { status: "completed", label: "complete" },
  in_progress: { status: "in_progress", label: "in build" },
  no_evidence: { status: "unknown", label: "no COBOL evidence" },
  broken: { status: "blocked", label: "broken" },
};

export function TraceabilityTab({ data, openStory }: { data: DashboardData; openStory: (id: string) => void }) {
  const [filter, setFilter] = useState<"all" | ThreadState>("all");
  const rows = data.traceability.map((t) => ({ t, state: threadState(t, data) }));
  const counts = (key: "all" | ThreadState) => (key === "all" ? rows.length : rows.filter((r) => r.state === key).length);
  const visible = rows.filter((r) => filter === "all" || r.state === filter);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3 py-1 font-semibold ring-1 ${
              filter === f.key ? "bg-blue-50 text-blue-700 ring-blue-300" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {f.label} <span className="ml-1 text-slate-400">{counts(f.key)}</span>
          </button>
        ))}
        <span className="ml-auto flex items-center gap-1 text-slate-400">
          COBOL <ChevronRight className="h-3 w-3" /> Requirement <ChevronRight className="h-3 w-3" /> Epic
          <ChevronRight className="h-3 w-3" /> Story <ChevronRight className="h-3 w-3" /> Java <ChevronRight className="h-3 w-3" /> Test
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[900px] text-left text-xs">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-3 py-2">Requirement / rule</th>
              <th className="px-3 py-2">COBOL evidence</th>
              <th className="px-3 py-2">Epic</th>
              <th className="px-3 py-2">Stories</th>
              <th className="px-3 py-2">Java</th>
              <th className="px-3 py-2">Tests</th>
              <th className="px-3 py-2">Thread</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map(({ t, state }) => (
              <Row key={t.id} t={t} state={state} data={data} openStory={openStory} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ t, state, data, openStory }: { t: TraceThread; state: ThreadState; data: DashboardData; openStory: (id: string) => void }) {
  const pill = STATE_PILL[state];
  return (
    <tr className="align-top">
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="whitespace-nowrap font-mono font-semibold text-slate-800">{t.id}</span>
          <Badge tone={t.kind === "rule" ? "amber" : "blue"}>{t.kind}</Badge>
        </div>
        <div className="mt-0.5 max-w-[220px] text-slate-600">{t.title}</div>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex max-w-[230px] flex-col items-start gap-1">
          {t.cobolRefs.length ? t.cobolRefs.map((r) => <Code key={r} wrap>{r}</Code>) : <Empty>no evidence</Empty>}
        </div>
      </td>
      <td className="px-3 py-2.5">
        {t.epicIds.map((id) => (
          <div key={id} className="min-w-[120px]">
            <span className="font-mono text-slate-700">{id}</span>{" "}
            <span className="text-slate-400">{data.epics.find((e) => e.id === id)?.title ?? "unknown epic"}</span>
          </div>
        ))}
      </td>
      <td className="px-3 py-2.5">
        <div className="flex flex-col gap-1">
          {t.storyIds.map((id) => {
            const s = data.stories.find((x) => x.id === id);
            return (
              <button
                key={id}
                disabled={!s}
                onClick={() => openStory(id)}
                className="flex items-center gap-1.5 whitespace-nowrap rounded px-1 text-left hover:bg-blue-50"
                title={s ? `${s.title} · ${s.codegen.status}` : "unknown story"}
              >
                {s ? <Dot status={storyDisplayStatus(s)} /> : <Dot status="blocked" />}
                <span className="font-mono text-blue-700">{id}</span>
              </button>
            );
          })}
        </div>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex max-w-[200px] flex-col items-start gap-1">
          {t.javaRefs.length ? t.javaRefs.slice(0, 3).map((r) => <Code key={r} wrap>{r}</Code>) : <Empty>not built yet</Empty>}
          {t.javaRefs.length > 3 && <span className="text-[11px] text-slate-400" title={t.javaRefs.slice(3).join(", ")}>+{t.javaRefs.length - 3} more</span>}
        </div>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex max-w-[230px] flex-col items-start gap-1">
          {t.testRefs.length ? t.testRefs.map((r) => <Code key={r} wrap>{r}</Code>) : <Empty>not built yet</Empty>}
        </div>
      </td>
      <td className="px-3 py-2.5">
        <StatusPill status={pill.status} label={pill.label} />
      </td>
    </tr>
  );
}
