import { useState } from "react";
import type { DashboardData, TimelineEvent } from "../../types";
import { formatShort } from "../../lib/format";

const LEVEL_TAG: Record<TimelineEvent["level"], string> = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  info: "bg-blue-50 text-blue-700 ring-blue-200",
  warning: "bg-amber-50 text-amber-800 ring-amber-200",
  error: "bg-rose-50 text-rose-700 ring-rose-200",
};
const LEVEL_DOT: Record<TimelineEvent["level"], string> = {
  success: "bg-emerald-500", info: "bg-blue-500", warning: "bg-amber-500", error: "bg-rose-500",
};

export function TimelineTab({ data }: { data: DashboardData }) {
  const [stage, setStage] = useState("all");
  const [issuesOnly, setIssuesOnly] = useState(false);
  const tz = data.meta.timezone;
  const who = (role: string) =>
    role === "system" ? "Harness" : role === "user" ? "Reviewer" : data.agentRoles.find((r) => r.role === role)?.label ?? role;
  const stageLabel = (k: string) => data.stages.find((s) => s.key === k)?.label ?? k;
  const stagesWithEvents = data.stages.filter((s) => data.timeline.some((e) => e.stage === s.key));

  const events = [...data.timeline]
    .filter((e) => stage === "all" || e.stage === stage)
    .filter((e) => !issuesOnly || e.level === "warning" || e.level === "error")
    .sort((a, b) => b.ts.localeCompare(a.ts));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <select value={stage} onChange={(e) => setStage(e.target.value)} className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700">
          <option value="all">All stages</option>
          {stagesWithEvents.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <label className="inline-flex items-center gap-1.5 text-slate-600">
          <input type="checkbox" checked={issuesOnly} onChange={(e) => setIssuesOnly(e.target.checked)} /> Warnings &amp; errors only
        </label>
        <span className="ml-auto text-slate-400">{events.length} events · source: agent_run_event</span>
      </div>

      <ol className="relative space-y-3 border-l-2 border-slate-200 pl-5">
        {events.map((e) => (
          <li key={e.id} className="relative">
            <span className={`absolute -left-[27px] top-1.5 h-3 w-3 rounded-full ring-4 ring-white ${LEVEL_DOT[e.level]}`} />
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
              <span>{formatShort(e.ts, tz)}</span>
              <span>·</span>
              <span>{stageLabel(e.stage)}</span>
              <span className={`rounded-md px-1.5 py-0.5 font-mono text-[10.5px] font-semibold ring-1 ${LEVEL_TAG[e.level]}`}>
                {e.type === e.stage ? e.type : `${e.stage}_${e.type}`}
              </span>
            </div>
            <div className="mt-0.5 text-sm text-slate-800">
              <b className="text-slate-900">{who(e.role)}</b> — {e.summary}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
