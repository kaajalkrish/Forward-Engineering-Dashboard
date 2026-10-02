import { ShieldAlert, UserCheck } from "lucide-react";
import type { DashboardData } from "../../types";
import { formatShort } from "../../lib/format";
import { gateDisplayStatus } from "../../lib/metrics";
import { Badge, StatusPill } from "../../components/ui";

export function GatesTab({ data }: { data: DashboardData }) {
  const tz = data.meta.timezone;
  const stagesByKey = new Map(data.stages.map((s) => [s.key, s]));
  const gates = [...data.gates].sort(
    (a, b) => (stagesByKey.get(a.stageKey)?.ordinal ?? 0) - (stagesByKey.get(b.stageKey)?.ordinal ?? 0),
  );

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        A stage cannot hand over to the next until its gate passes. Approvals are recorded with the approver's role,
        whether risk was accepted, and the rationale.
      </p>
      <ol className="relative space-y-3 border-l-2 border-slate-200 pl-5">
        {gates.map((g) => {
          const stage = stagesByKey.get(g.stageKey);
          const status = gateDisplayStatus(g.status, stage?.status === "running");
          return (
            <li key={g.key} className="relative">
              <span
                className={`absolute -left-[27px] top-3 h-3 w-3 rounded-full ring-4 ring-white ${
                  g.status === "passed" ? "bg-emerald-500" : g.status === "failed" ? "bg-rose-500" : status === "in_progress" ? "bg-blue-500" : "bg-slate-300"
                }`}
              />
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">{g.label}</span>
                  <span className="font-mono text-[11px] text-slate-500">{g.key}</span>
                  <Badge>stage · {stage?.label ?? g.stageKey}</Badge>
                  <span className="ml-auto"><StatusPill status={status} label={g.status} /></span>
                </div>
                <dl className="mt-2 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-[90px_1fr]">
                  <dt className="text-slate-400">Threshold</dt>
                  <dd className="text-slate-700">{g.threshold}</dd>
                  <dt className="text-slate-400">Result</dt>
                  <dd className="font-medium text-slate-800">{g.result}</dd>
                  {g.updatedAt && (
                    <>
                      <dt className="text-slate-400">Updated</dt>
                      <dd className="text-slate-600">{formatShort(g.updatedAt, tz)}</dd>
                    </>
                  )}
                </dl>
                {g.approval ? (
                  <div className={`mt-3 rounded-lg px-3 py-2 text-xs ${g.approval.decision === "approved" ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900"}`}>
                    <div className="flex flex-wrap items-center gap-2 font-semibold">
                      <UserCheck className="h-3.5 w-3.5" />
                      {g.approval.decision === "approved" ? "Approved" : "Rejected"} by {g.approval.approverRole}
                      <span className="font-normal opacity-70">{g.approval.approverEmail}</span>
                      <span className="font-normal opacity-70">· {formatShort(g.approval.decidedAt, tz)}</span>
                      {g.approval.riskAccepted && (
                        <Badge tone="amber"><ShieldAlert className="mr-1 h-3 w-3" />risk accepted</Badge>
                      )}
                    </div>
                    <div className="mt-0.5">{g.approval.rationale}</div>
                  </div>
                ) : (
                  <div className="mt-3 text-xs italic text-slate-400">
                    {g.status === "passed" ? "Passed automatically: no human approval recorded." : "Awaiting result and approval."}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
