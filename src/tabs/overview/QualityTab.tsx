import { Check, Minus, X } from "lucide-react";
import type { DashboardData } from "../../types";
import { acCoverage, testTotals } from "../../lib/metrics";
import { NoData } from "../../components/DataSourceBanner";
import { Badge, ProgressBar, SectionTitle, StatusPill, SubCard } from "../../components/ui";

// Check keys from codegen/story_quality.py, with readable labels.
const STORY_CHECKS: { key: string; label: string }[] = [
  { key: "acceptance_criteria_covered", label: "ACs covered" },
  { key: "lineage_cited", label: "Lineage cited" },
  { key: "test_result_acceptable", label: "Tests OK" },
  { key: "production_files_generated", label: "Code generated" },
  { key: "package_scope_respected", label: "Package scope" },
  { key: "expected_package_touched", label: "Expected package" },
  { key: "behavior_signals_represented", label: "COBOL behaviour" },
];

const pct = (n: number, d: number) => (d === 0 ? 0 : Math.round((n / d) * 100));

export function QualityTab({ data }: { data: DashboardData }) {
  const { brdJudge, build, equivalence } = data.quality;
  const ac = acCoverage(data);
  const tests = testTotals(data);
  const gated = [...data.stories].filter((s) => s.codegen.qualityGate).sort((a, b) => a.planOrder - b.planOrder);
  // brd_judge.py: high = weighted >= 4.2 and every dimension >= 3.
  const judgeOk = !!brdJudge && brdJudge.weighted >= brdJudge.minWeighted && brdJudge.dimensions.every((d) => d.score >= brdJudge.dimensionFloor);

  return (
    <div className="space-y-4">
      {/* Headline numbers */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {brdJudge ? (
          <Metric
            label="BRD judge"
            value={`${brdJudge.weighted.toFixed(1)} / 5`}
            sub={`rated ${brdJudge.rating} · bar ${brdJudge.minWeighted} · ${brdJudge.ungroundedRefs} ungrounded refs · v${brdJudge.version}`}
            good={judgeOk}
            bar={(brdJudge.weighted / 5) * 100}
          />
        ) : (
          <Metric label="BRD judge" value="—" sub="no BRD in the provided output" good={false} bar={0} />
        )}
        <Metric label="Acceptance criteria covered" value={`${ac.covered} / ${ac.total}`} sub="cited by a generated test" good={ac.total > 0 && ac.covered === ac.total} bar={pct(ac.covered, ac.total)} />
        <Metric
          label="Story tests passing"
          value={tests.ran ? `${tests.passed} / ${tests.ran}` : "not run"}
          sub={`${tests.failed} failing · ${tests.notRun} not run (no toolchain or compile errors)`}
          good={tests.ran > 0 && tests.failed === 0}
          bar={pct(tests.passed, tests.ran)}
        />
        <Metric label="Equivalence" value={equivalence.verdict} sub={equivalence.recordsCompared ? `${equivalence.recordsCompared} records · ${equivalence.mismatches} mismatches` : "runs in Verify"} good={equivalence.verdict === "pass"} bar={equivalence.verdict === "pass" ? 100 : 0} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {/* BRD judge */}
        <SubCard>
          <SectionTitle right={brdJudge ? <Badge tone={judgeOk ? "green" : "amber"}>{brdJudge.weighted.toFixed(1)} / 5 · {brdJudge.rating}</Badge> : undefined}>
            BRD judge — five dimensions
          </SectionTitle>
          {brdJudge ? (
            <div className="space-y-2.5">
              {brdJudge.dimensions.map((d) => (
                <div key={d.dimension}>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-semibold capitalize text-slate-700">{d.dimension}</span>
                    <span className="text-slate-500">
                      <b className="text-slate-800">{d.score}</b>/5 · weight {Math.round(d.weight * 100)}%
                    </span>
                  </div>
                  <ProgressBar value={(d.score / 5) * 100} color={d.score >= brdJudge.dimensionFloor ? "bg-emerald-500" : "bg-rose-500"} className="mt-1 h-1.5" />
                  <div className="mt-0.5 text-[11px] text-slate-500">{d.rationale}</div>
                </div>
              ))}
              <p className="text-[11px] text-slate-500">
                Rated high when the weighted score is ≥ {brdJudge.minWeighted} and every dimension ≥ {brdJudge.dimensionFloor} (agent/brd_judge.py).
              </p>
            </div>
          ) : (
            <NoData what="The BRD judge report" needs="brd_output/brd/<slug>/v<N>.html or the :BRD node in Neo4j" />
          )}
        </SubCard>

        {/* Build gates */}
        <SubCard>
          <SectionTitle>Build gates — mvn verify, in gate order</SectionTitle>
          <ol className="space-y-2">
            {build.gates.map((g, i) => (
              <li key={g.key} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2 text-xs">
                <span className="w-4 text-slate-400">{i + 1}</span>
                <span className="w-28 font-semibold text-slate-800">{g.label}</span>
                <span className="flex-1 text-slate-500">{g.detail}</span>
                <StatusPill status={g.status === "passed" ? "completed" : g.status === "failed" ? "blocked" : "pending"} label={g.status} />
              </li>
            ))}
          </ol>
          <p className="mt-3 text-[11px] text-slate-500">
            Equivalence tolerances: {equivalence.tolerances.join(" · ")}.
          </p>
        </SubCard>
      </div>

      {/* Story quality gate matrix */}
      <SubCard>
        <SectionTitle right={<span className="text-[11px] text-slate-400">codegen/story_quality.py</span>}>
          Story quality gate — per story
        </SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-xs">
            <thead className="text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-2 pr-3">Story</th>
                {STORY_CHECKS.map((c) => (
                  <th key={c.key} className="px-2 py-2 text-center">{c.label}</th>
                ))}
                <th className="px-2 py-2 text-right">Score</th>
                <th className="px-2 py-2 text-right">Gate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {gated.map((s) => {
                const g = s.codegen.qualityGate!;
                return (
                  <tr key={s.id}>
                    <td className="py-2 pr-3">
                      <span className="font-mono font-semibold text-slate-800">{s.id}</span>
                      <span className="ml-1.5 text-slate-500">{s.title}</span>
                    </td>
                    {STORY_CHECKS.map((c) => (
                      <td key={c.key} className="px-2 py-2 text-center">
                        <CheckMark value={g.checks[c.key]} />
                      </td>
                    ))}
                    <td className="px-2 py-2 text-right font-semibold tabular-nums">{g.passed === null ? "—" : `${Math.round(g.score * 100)}%`}</td>
                    <td className="px-2 py-2 text-right">
                      {g.passed === null ? (
                        <StatusPill status="unknown" />
                      ) : (
                        <StatusPill status={g.passed ? "completed" : "blocked"} label={g.passed ? "passed" : "failed"} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {gated.some((s) => s.codegen.qualityGate!.failures.length || s.codegen.qualityGate!.warnings.length) && (
          <ul className="mt-3 space-y-1 text-[11px]">
            {gated.flatMap((s) => [
              ...s.codegen.qualityGate!.failures.map((f) => (
                <li key={`${s.id}-f-${f}`} className="text-rose-700"><b className="font-mono">{s.id}</b> failure: {f}</li>
              )),
              ...s.codegen.qualityGate!.warnings.map((w) => (
                <li key={`${s.id}-w-${w}`} className="text-amber-700"><b className="font-mono">{s.id}</b> warning: {w}</li>
              )),
            ])}
          </ul>
        )}
      </SubCard>
    </div>
  );
}

function Metric({ label, value, sub, good, bar }: { label: string; value: string; sub: string; good: boolean; bar: number }) {
  return (
    <SubCard>
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold capitalize tabular-nums ${good ? "text-emerald-600" : "text-slate-900"}`}>{value}</div>
      <ProgressBar value={bar} color={good ? "bg-emerald-500" : "bg-amber-500"} className="mt-2 h-1.5" />
      <div className="mt-1 text-[11px] text-slate-500">{sub}</div>
    </SubCard>
  );
}

function CheckMark({ value }: { value: boolean | undefined }) {
  if (value === undefined) return <Minus className="mx-auto h-3.5 w-3.5 text-slate-300" />;
  return value ? (
    <Check className="mx-auto h-4 w-4 text-emerald-600" strokeWidth={3} />
  ) : (
    <X className="mx-auto h-4 w-4 text-rose-600" strokeWidth={3} />
  );
}
