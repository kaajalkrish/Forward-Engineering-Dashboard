import { CircleCheck, OctagonAlert } from "lucide-react";
import type { DashboardData, Failure } from "../../types";
import { formatShort } from "../../lib/format";
import { Badge } from "../../components/ui";

const SOURCE_LABEL: Record<Failure["source"], string> = {
  defect_ticket: "defect ticket",
  story: "story",
  work_unit: "work unit",
  stage: "stage gate",
  code_check: "found in the code",
};
const SEVERITY_TONE = { high: "red", medium: "amber", low: "slate" } as const;

export function FailuresTab({ data, openStory }: { data: DashboardData; openStory: (id: string) => void }) {
  const stageLabel = (k: string) => data.stages.find((s) => s.key === k)?.label ?? k;
  const sevRank = { high: 0, medium: 1, low: 2 };
  const sorted = [...data.failures].sort(
    (a, b) => (a.status === b.status ? sevRank[a.severity] - sevRank[b.severity] || b.at.localeCompare(a.at) : a.status === "open" ? -1 : 1),
  );
  const open = sorted.filter((f) => f.status === "open").length;
  const isStory = (ref: string) => data.stories.some((s) => s.id === ref);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge tone={open ? "red" : "green"}>{open} open</Badge>
        <Badge tone="green">{sorted.length - open} resolved</Badge>
        {(["defect_ticket", "story", "work_unit", "stage", "code_check"] as const).map((s) => {
          const n = sorted.filter((f) => f.source === s).length;
          return n ? <Badge key={s}>{n} {SOURCE_LABEL[s]}</Badge> : null;
        })}
        <span className="ml-auto text-slate-400">Open first, then by severity.</span>
      </div>

      <ul className="space-y-2">
        {sorted.map((f) => (
          <li key={f.id} className={`rounded-xl border bg-white p-3.5 ${f.status === "open" ? "border-rose-200" : "border-slate-200"}`}>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {f.status === "open" ? <OctagonAlert className="h-4 w-4 text-rose-600" /> : <CircleCheck className="h-4 w-4 text-emerald-600" />}
              <span className="font-mono font-semibold text-slate-500">{f.id}</span>
              <Badge>{SOURCE_LABEL[f.source]}</Badge>
              <span className="text-slate-600">{stageLabel(f.stage)}</span>
              {isStory(f.ref) ? (
                <button onClick={() => openStory(f.ref)} className="rounded bg-blue-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-blue-700 hover:bg-blue-100">{f.ref}</button>
              ) : (
                <span className="font-mono text-[11px] text-slate-600">{f.ref}</span>
              )}
              <Badge tone={SEVERITY_TONE[f.severity]}>{f.severity}</Badge>
              <span className="ml-auto text-slate-400">{formatShort(f.at, data.meta.timezone)}</span>
            </div>
            <p className="mt-1.5 text-sm text-slate-900">{f.reason}</p>
            {f.resolution ? (
              <p className="mt-1 text-xs text-emerald-800"><span className="font-semibold">Resolved:</span> {f.resolution}</p>
            ) : (
              <p className="mt-1 text-xs font-semibold text-rose-700">Open: no resolution yet</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
