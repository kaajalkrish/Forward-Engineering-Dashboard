import { ArrowRight, CheckCircle2, GitBranch } from "lucide-react";
import type { DashboardData, Stage } from "../../types";
import { formatShort } from "../../lib/format";
import {
  computeKpis, gateDisplayStatus, phaseDisplayStatus, phaseLabel, phaseStages, stageDisplayStatus,
  stageProgress, storyDisplayStatus, storyProgress, threadState,
} from "../../lib/metrics";
import { Badge, Dot, ProgressBar, StatusPill, SubCard } from "../../components/ui";

export function PipelineTab({ data, navigate }: { data: DashboardData; navigate: (tab: string) => void }) {
  const k = computeKpis(data);
  const { stageWeight, storyWeight } = data.weights;
  const threads = data.traceability.map((t) => threadState(t, data));
  const complete = threads.filter((s) => s === "complete").length;
  const inProgress = threads.filter((s) => s === "in_progress").length;
  const noEvidence = threads.filter((s) => s === "no_evidence").length;

  return (
    <div className="space-y-4">
      {/* Overall progress */}
      <div>
        <div className="mb-1 flex justify-between text-xs text-slate-500">
          <span>Overall</span>
          <span className="font-semibold text-slate-700">{k.overall}%</span>
        </div>
        <ProgressBar value={k.overall} />
        <div className="mt-2 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
          <div>
            Stages <b>{k.stagesPassed}/{k.stagesTotal}</b> passed × {Math.round(stageWeight * 100)}% ={" "}
            <b>{Math.round(stageProgress(data) * stageWeight * 100)}</b> pts
          </div>
          <div>
            Stories <b>{k.storiesVerified}/{k.storiesTotal}</b> verified by tests × {Math.round(storyWeight * 100)}% ={" "}
            <b>{Math.round(storyProgress(data) * storyWeight * 100)}</b> pts
          </div>
        </div>
      </div>

      {/* End-to-end traceability summary */}
      <SubCard className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <GitBranch className="h-4 w-4 text-emerald-600" /> End-to-end traceability
            {k.brokenLinks > 0 ? (
              <StatusPill status="blocked" label={`${k.brokenLinks} broken`} />
            ) : noEvidence > 0 ? (
              <StatusPill status="unknown" label={`${noEvidence} without COBOL evidence`} />
            ) : (
              <StatusPill status="completed" label="all traced" />
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {k.lineageLinked}/{k.lineageTotal} requirement &amp; rule threads traced COBOL → BRD → story · {complete} built and accepted ·{" "}
            {inProgress} awaiting accepted build results
            {noEvidence > 0 && <> · {noEvidence} cite no COBOL source</>} · {k.brokenLinks === 0 ? "no broken links" : `${k.brokenLinks} broken links`}.
          </p>
        </div>
        <button
          onClick={() => navigate("traceability")}
          className="no-print rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Open Traceability
        </button>
      </SubCard>

      {/* Phase cards */}
      {data.phases.map((phase, i) => {
        const stages = phaseStages(data, phase);
        return (
          <SubCard key={phase.key}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Phase {i + 1} · {phase.label}
              </h3>
              <StatusPill status={phaseDisplayStatus(data, phase)} label={phaseLabel(phaseDisplayStatus(data, phase), phase)} />
            </div>
            <p className="mt-1 text-xs text-slate-500">{phase.summary}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {stages.map((s) => (
                <span key={s.key} className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                  <Dot status={stageDisplayStatus(s)} /> {s.label}
                </span>
              ))}
            </div>
            {phase.showsStories ? (
              <div className="mt-3">
                <div className="flex flex-wrap gap-1.5">
                  {[...data.stories].sort((a, b) => a.planOrder - b.planOrder).map((st) => (
                    <span key={st.id} title={`${st.title} · ${st.codegen.status}`} className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700">
                      <Dot status={storyDisplayStatus(st)} /> {st.id}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => navigate("backlog")}
                  className="no-print mt-3 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  Open Backlog
                </button>
              </div>
            ) : (
              <div className="mt-3 divide-y divide-slate-100">
                {stages.map((s) => (
                  <StageRow key={s.key} stage={s} data={data} />
                ))}
              </div>
            )}
          </SubCard>
        );
      })}
    </div>
  );
}

function StageRow({ stage, data }: { stage: Stage; data: DashboardData }) {
  const gate = data.gates.find((g) => g.key === stage.gateKey);
  const roles = stage.roles.map((r) => data.agentRoles.find((a) => a.role === r)?.label ?? r);
  const tz = data.meta.timezone;

  return (
    <div className="grid gap-2 py-2.5 text-xs xl:grid-cols-[170px_1fr_290px] xl:items-start">
      <div className="flex items-center gap-2">
        <Dot status={stageDisplayStatus(stage)} />
        <span className="font-semibold text-slate-800">{stage.label}</span>
        <Badge tone={stage.mode === "llm" ? "violet" : "slate"}>{stage.mode === "llm" ? "LLM" : "deterministic"}</Badge>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 text-slate-600">
          <span className="text-slate-400">in</span> {stage.input}
          <ArrowRight className="h-3 w-3 text-slate-400" />
          <span className="text-slate-400">work</span> {stage.work}
          <ArrowRight className="h-3 w-3 text-slate-400" />
          <span className="text-slate-400">out</span> <span className="font-medium text-slate-800">{stage.output}</span>
        </div>
        {roles.length > 0 && <div className="mt-0.5 text-slate-400">Roles — {roles.join(" · ")}</div>}
        {stage.note && <div className="mt-0.5 italic text-amber-700">Status {stage.note}</div>}
      </div>

      <div className="xl:text-right">
        {gate ? (
          <div>
            <div className="flex items-center gap-1.5 xl:justify-end">
              <span className="text-slate-400">Gate</span>
              <span className="font-mono text-[11px] text-slate-700">{gate.key}</span>
              <StatusPill status={gateDisplayStatus(gate.status, stage.status === "running")} label={gate.status} />
            </div>
            {gate.approval ? (
              <div className="mt-0.5 flex items-center gap-1 text-emerald-700 xl:justify-end">
                <CheckCircle2 className="h-3 w-3" />
                Approved — {gate.approval.approverRole} ({formatShort(gate.approval.decidedAt, tz)})
              </div>
            ) : (
              <div className="mt-0.5 text-slate-400">{gate.result}</div>
            )}
          </div>
        ) : (
          <span className="text-slate-400">No hard gate</span>
        )}
      </div>
    </div>
  );
}
