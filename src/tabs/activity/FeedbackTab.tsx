import { Check } from "lucide-react";
import type { DashboardData, FeedbackItem, FeedbackStep } from "../../types";
import { formatShort } from "../../lib/format";
import { Badge } from "../../components/ui";

const STEPS: { key: FeedbackStep; label: string }[] = [
  { key: "analyzed", label: "Analyzed" },
  { key: "actioned", label: "Actioned" },
  { key: "re_reviewed", label: "Re-reviewed" },
  { key: "logged", label: "Logged" },
];
const DECISION_TONE = { applied: "green", dropped: "slate", open: "blue" } as const;
const SEVERITY_TONE = { high: "red", medium: "amber", low: "slate" } as const;

/** The loop's two promises; any item breaking one is flagged. */
function violations(f: FeedbackItem): string[] {
  const v: string[] = [];
  if (f.decision === "applied" && !f.analysis) v.push("applied without analysis");
  if (f.decision === "dropped" && !f.reason) v.push("dropped without a recorded reason");
  return v;
}

export function FeedbackTab({ data }: { data: DashboardData }) {
  const items = [...data.feedback].sort((a, b) => b.at.localeCompare(a.at));
  const reached = (s: FeedbackStep) => items.filter((f) => STEPS.findIndex((x) => x.key === f.step) >= STEPS.findIndex((x) => x.key === s)).length;
  const broken = items.filter((f) => violations(f).length);

  return (
    <div className="space-y-4">
      {/* Loop funnel */}
      <div className="grid gap-2 sm:grid-cols-4">
        {STEPS.map((s, i) => (
          <div key={s.key} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <div className="text-[11px] text-slate-500">{i + 1}. {s.label}</div>
            <div className="text-xl font-bold tabular-nums text-slate-900">{reached(s.key)}<span className="text-sm font-normal text-slate-400">/{items.length}</span></div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {(["applied", "dropped", "open"] as const).map((d) => (
          <Badge key={d} tone={DECISION_TONE[d]}>{items.filter((f) => f.decision === d).length} {d}</Badge>
        ))}
        {broken.length === 0 ? (
          <span className="font-semibold text-emerald-700">✓ every applied item was analysed, every dropped item has a reason</span>
        ) : (
          <span className="font-semibold text-rose-700">{broken.length} item(s) break the loop rules</span>
        )}
      </div>

      <ul className="space-y-3">
        {items.map((f) => {
          const at = STEPS.findIndex((s) => s.key === f.step);
          const v = violations(f);
          return (
            <li key={f.id} className={`rounded-xl border bg-white p-4 ${v.length ? "border-rose-300" : "border-slate-200"}`}>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-mono font-semibold text-slate-500">{f.id}</span>
                <span className="font-semibold text-slate-800">{f.source}</span>
                <span className="text-slate-400">→</span>
                <span className="text-slate-700">{f.target}</span>
                {f.dimension && <Badge tone="violet">{f.dimension}</Badge>}
                <Badge tone={SEVERITY_TONE[f.severity]}>{f.severity}</Badge>
                <span className="ml-auto flex items-center gap-2">
                  <Badge tone={DECISION_TONE[f.decision]}>{f.decision}</Badge>
                  <span className="text-slate-400">{formatShort(f.at, data.meta.timezone)}</span>
                </span>
              </div>
              <p className="mt-1.5 text-sm font-medium text-slate-900">{f.suggestion}</p>
              <p className="mt-0.5 text-xs text-slate-600"><span className="text-slate-400">Analysis:</span> {f.analysis}</p>
              {f.reason && <p className="mt-0.5 text-xs text-slate-600"><span className="text-slate-400">Dropped because:</span> {f.reason}</p>}
              {v.length > 0 && <p className="mt-1 text-xs font-semibold text-rose-700">{v.join(" · ")}</p>}

              <ol className="mt-3 flex items-center">
                {STEPS.map((s, i) => (
                  <li key={s.key} className="flex flex-1 items-center last:flex-none">
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        i <= at ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400 ring-1 ring-slate-200"
                      }`}
                      title={s.label}
                    >
                      {i <= at ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
                    </span>
                    <span className={`ml-1.5 mr-2 whitespace-nowrap text-[11px] ${i <= at ? "font-semibold text-slate-700" : "text-slate-400"}`}>{s.label}</span>
                    {i < STEPS.length - 1 && <span className={`h-0.5 flex-1 rounded ${i < at ? "bg-emerald-400" : "bg-slate-200"}`} />}
                  </li>
                ))}
              </ol>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
