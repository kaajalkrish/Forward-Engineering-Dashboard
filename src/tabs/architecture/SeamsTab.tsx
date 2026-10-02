import type { DashboardData, Seam } from "../../types";
import { SEAM_WEIGHTS, seamScore } from "../../lib/metrics";
import { Badge, Code } from "../../components/ui";

const KIND_TONE = { reader: "green", writer: "red", batch: "amber" } as const;
const FACTORS: { key: keyof Seam["factors"]; label: string }[] = [
  { key: "business", label: "Business" },
  { key: "isolation", label: "Isolation" },
  { key: "testability", label: "Testability" },
  { key: "dataOwnership", label: "Data own." },
  { key: "risk", label: "Risk" },
];

export function SeamsTab({ data }: { data: DashboardData }) {
  const seams = [...data.seams].sort((a, b) => seamScore(b.factors) - seamScore(a.factors));
  const inBacklog = new Set(data.stories.flatMap((s) => s.seamRefs));
  const top = seamScore(seams[0]?.factors ?? { business: 0, isolation: 0, testability: 0, dataOwnership: 0, risk: 0 }) || 1;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
        <Badge tone="green">reader: safe to divert, dual-run</Badge>
        <Badge tone="amber">batch: replace behind the file contract</Badge>
        <Badge tone="red">writer: needs Legacy Mimic write-back</Badge>
        <span className="ml-auto text-slate-400">Scoring is deterministic Cypher over the code graph; the LLM only narrates.</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[1000px] text-left text-xs">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Program</th>
              <th className="px-3 py-2">Score</th>
              {FACTORS.map((f) => (
                <th key={f.key} className="px-2 py-2 text-center">
                  {f.label}
                  <div className="font-normal normal-case text-slate-400">{SEAM_WEIGHTS[f.key] > 0 ? "×" : "−"}{Math.abs(SEAM_WEIGHTS[f.key]).toFixed(2)}</div>
                </th>
              ))}
              <th className="px-3 py-2">Reads → writes</th>
              <th className="px-3 py-2">Why</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {seams.map((s, i) => {
              const score = seamScore(s.factors);
              return (
                <tr key={s.program} className="align-top">
                  <td className="px-3 py-2.5 text-slate-400">{i + 1}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-slate-800">{s.program}</span>
                      <Badge tone={KIND_TONE[s.kind]}>{s.kind}</Badge>
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-400">fan-in {s.fanIn} · fan-out {s.fanOut}</div>
                    {inBacklog.has(s.program) && <div className="mt-0.5 text-[11px] font-semibold text-blue-600">in backlog</div>}
                  </td>
                  <td className="w-32 px-3 py-2.5">
                    <div className="font-bold tabular-nums text-slate-900">{score.toFixed(2)}</div>
                    <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-blue-500" style={{ width: `${(score / top) * 100}%` }} />
                    </div>
                  </td>
                  {FACTORS.map((f) => (
                    <td key={f.key} className="px-2 py-2.5 text-center">
                      <FactorCell value={s.factors[f.key]} negative={f.key === "risk"} />
                    </td>
                  ))}
                  <td className="px-3 py-2.5">
                    <div className="flex max-w-[220px] flex-wrap gap-1">
                      {s.reads.map((r) => <Code key={`r-${r}`}>{r}</Code>)}
                    </div>
                    {s.writes.length > 0 && (
                      <div className="mt-1 flex max-w-[220px] flex-wrap items-center gap-1">
                        <span className="text-[10px] font-bold uppercase text-rose-500">writes</span>
                        {s.writes.map((w) => <Code key={`w-${w}`}>{w}</Code>)}
                      </div>
                    )}
                  </td>
                  <td className="max-w-[260px] px-3 py-2.5 text-slate-600">{s.rationale}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FactorCell({ value, negative }: { value: number; negative: boolean }) {
  // Higher is better for every factor except risk.
  const good = negative ? value <= 0.3 : value >= 0.7;
  const bad = negative ? value >= 0.6 : value <= 0.5;
  const color = good ? "bg-emerald-500" : bad ? "bg-rose-400" : "bg-amber-400";
  return (
    <div className="mx-auto w-12">
      <div className="text-[11px] tabular-nums text-slate-700">{value.toFixed(1)}</div>
      <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full ${color}`} style={{ width: `${value * 100}%` }} />
      </div>
    </div>
  );
}
