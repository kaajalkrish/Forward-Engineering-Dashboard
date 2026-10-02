import type { Kpis } from "../lib/metrics";
import type { DashboardData, Phase } from "../types";

function Tile({ label, value, hint, tone = "default" }: { label: string; value: string | number; hint?: string; tone?: "default" | "good" | "bad" }) {
  const color = tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-rose-600" : "text-slate-900";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm" title={hint}>
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

export function KpiTiles({ kpis }: { kpis: Kpis }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
      <Tile label="Overall" value={`${kpis.overall}%`} />
      <Tile label="Stages" value={`${kpis.stagesPassed} / ${kpis.stagesTotal}`} hint="Journey stages passed" />
      <Tile label="Gates" value={`${kpis.gatesPassed} / ${kpis.gatesTotal}`} hint="Hard gates passed" />
      <Tile label="Stories verified" value={`${kpis.storiesVerified} / ${kpis.storiesTotal}`} hint={`Verified = tests ran green. ${kpis.storiesAccepted} accepted by the harness (passed / generated-unverified / skipped).`} />
      <Tile label="Artifacts" value={kpis.artifacts} />
      <Tile label="Approvals" value={kpis.approvals} hint="Attributed gate approvals" />
      <Tile label="Lineage" value={`${kpis.lineageLinked}/${kpis.lineageTotal}`} hint="Requirement threads linked to COBOL evidence and stories" />
      <Tile label="Broken links" value={kpis.brokenLinks} tone={kpis.brokenLinks === 0 ? "good" : "bad"} />
    </div>
  );
}

export function StatusCard({ data, phase, phaseIndex }: { data: DashboardData; phase: Phase | undefined; phaseIndex: number }) {
  const stage = data.stages.find((s) => s.key === data.state.currentStage);
  const story = data.stories.find((s) => s.id === data.state.currentStoryId);
  return (
    <div className="inline-block rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
      <div className="text-xs text-slate-500">Status</div>
      <div className="mt-0.5 text-2xl font-bold text-slate-900">
        {phase ? `Phase ${phaseIndex} — ${phase.label}` : "—"}
      </div>
      {stage && (
        <div className="mt-0.5 text-xs text-slate-500">
          Stage {stage.ordinal + 1}/{data.stages.length} · <span className="font-semibold text-slate-700">{stage.label}</span>
          {story && (
            <>
              {" "}· {story.id} {story.title} ({story.codegen.status}, attempt {story.codegen.attempts})
            </>
          )}
        </div>
      )}
    </div>
  );
}
