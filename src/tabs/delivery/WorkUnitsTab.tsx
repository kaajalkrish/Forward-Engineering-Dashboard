import type { DashboardData, WorkUnit } from "../../types";
import { formatShort } from "../../lib/format";
import { Badge, SubCard } from "../../components/ui";

type Tone = "slate" | "blue" | "green" | "amber" | "red" | "violet";
const STATUS_TONE: Record<WorkUnit["status"], Tone> = {
  succeeded: "green",
  cached: "violet",
  running: "blue",
  pending: "slate",
  deferred: "amber",
  failed: "red",
};
const STATUSES: WorkUnit["status"][] = ["succeeded", "cached", "running", "pending", "deferred", "failed"];

function duration(u: WorkUnit): string {
  if (!u.startedAt || !u.finishedAt) return u.startedAt ? "running" : "—";
  const s = Math.round((new Date(u.finishedAt).getTime() - new Date(u.startedAt).getTime()) / 1000);
  return s < 60 ? `${s}s` : s < 3600 ? `${Math.round(s / 60)}m` : `${(s / 3600).toFixed(1)}h`;
}

const tier = (model?: string) => (model ? model.split("-")[1] : "—"); // claude-sonnet-4-6 → sonnet

export function WorkUnitsTab({ data }: { data: DashboardData }) {
  const units = data.workUnits;
  const stages = data.stages.filter((s) => units.some((u) => u.stage === s.key));
  const total = units.reduce((n, u) => n + u.costUsd, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {STATUSES.map((st) => {
          const n = units.filter((u) => u.status === st).length;
          return n ? <Badge key={st} tone={STATUS_TONE[st]}>{n} {st}</Badge> : null;
        })}
        <span className="text-slate-500">· {units.length} units · ${total.toFixed(2)} total</span>
        <span className="ml-auto text-slate-400">Cache key = stage + unit type + unit key + input hash. Cached units cost $0.</span>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {stages.map((stage) => {
          const list = units.filter((u) => u.stage === stage.key);
          const done = list.filter((u) => u.status === "succeeded" || u.status === "cached").length;
          return (
            <SubCard key={stage.key}>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-bold text-slate-800">{stage.label}</span>
                <span className="text-xs text-slate-500">{done}/{list.length} done · ${list.reduce((n, u) => n + u.costUsd, 0).toFixed(2)}</span>
              </div>
              <div className="mb-2 flex h-1.5 overflow-hidden rounded-full bg-slate-100">
                {list.map((u) => (
                  <div key={u.id} className={`flex-1 border-r border-white ${u.status === "succeeded" ? "bg-emerald-500" : u.status === "cached" ? "bg-violet-400" : u.status === "running" ? "bg-blue-500" : u.status === "failed" ? "bg-rose-500" : u.status === "deferred" ? "bg-amber-400" : "bg-slate-200"}`} />
                ))}
              </div>
              <ul className="divide-y divide-slate-100 text-xs">
                {list.map((u) => (
                  <li key={u.id} className="py-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-slate-400">{u.unitType}</span>
                      <span className="font-mono font-semibold text-slate-800">{u.unitKey}</span>
                      <Badge tone={STATUS_TONE[u.status]}>{u.status}</Badge>
                      {u.attempt > 1 && <Badge tone="amber">attempt {u.attempt}</Badge>}
                      <span className="ml-auto flex gap-3 tabular-nums text-slate-500">
                        <span className="capitalize">{tier(u.model)}</span>
                        <span>{duration(u)}</span>
                        <span>${u.costUsd.toFixed(2)}</span>
                      </span>
                    </div>
                    {u.errorCause && <div className="mt-0.5 text-[11px] text-amber-700">{u.errorCause}</div>}
                    {u.finishedAt && <div className="text-[10px] text-slate-400">finished {formatShort(u.finishedAt, data.meta.timezone)}</div>}
                  </li>
                ))}
              </ul>
            </SubCard>
          );
        })}
      </div>
    </div>
  );
}
