import { Check, ChevronRight, Circle, CircleDashed, CircleHelp, Loader2, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import type { DashboardData, Story } from "../../types";
import { buildStepStates, byPlanOrder, CODEGEN_BADGE, type StepState } from "../../lib/stories";
import { Badge, SectionTitle, SubCard } from "../../components/ui";

const STEP_STYLE: Record<StepState, { icon: ReactNode; box: string }> = {
  done: { icon: <Check className="h-4 w-4 text-emerald-600" strokeWidth={3} />, box: "border-emerald-200 bg-emerald-50" },
  active: { icon: <Loader2 className="h-4 w-4 animate-spin text-blue-600" />, box: "border-blue-300 bg-blue-50 ring-2 ring-blue-100" },
  failed: { icon: <XCircle className="h-4 w-4 text-rose-600" />, box: "border-rose-200 bg-rose-50" },
  skipped: { icon: <CircleDashed className="h-4 w-4 text-slate-400" />, box: "border-dashed border-slate-300 bg-white" },
  todo: { icon: <Circle className="h-4 w-4 text-slate-300" />, box: "border-slate-200 bg-white" },
  unknown: { icon: <CircleHelp className="h-4 w-4 text-slate-300" />, box: "border-dashed border-slate-200 bg-white" },
};

const MODE_TONE = { deterministic: "slate", llm: "violet", toolchain: "amber" } as const;

export function BuildTab({ data, openStory }: { data: DashboardData; openStory: (id: string) => void }) {
  const current = data.stories.find((s) => s.id === data.state.currentStoryId);
  const stories = [...data.stories].sort(byPlanOrder);
  const counts = stories.reduce<Record<string, number>>((m, s) => ({ ...m, [s.codegen.status]: (m[s.codegen.status] ?? 0) + 1 }), {});
  const totalCost = stories.reduce((n, s) => n + s.codegen.costUsd, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {(["passed", "generated-unverified", "running", "failed", "pending", "skipped", "unknown"] as const).map((k) =>
          counts[k] ? <Badge key={k} tone={CODEGEN_BADGE[k].tone}>{counts[k]} {CODEGEN_BADGE[k].label}</Badge> : null,
        )}
        {stories.some((s) => s.codegen.statusSource === "demo") ? (
          <span className="text-slate-500">· demo run: results are simulated</span>
        ) : stories.some((s) => s.codegen.statusSource === "derived") ? (
          <span className="text-slate-500">· the harness's recorded statuses are not in this output; see each story for what the files show</span>
        ) : (
          <span className="text-slate-500">· build spend ${totalCost.toFixed(2)}</span>
        )}
        <span className="ml-auto font-mono text-[11px] text-slate-400">{data.meta.codePath}</span>
      </div>

      {current && <CurrentStory story={current} data={data} openStory={openStory} />}

      <SubCard>
        <SectionTitle right={<span className="text-[11px] text-slate-400">in story-plan order · click a row for details</span>}>All stories</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-xs">
            <thead className="text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-2 pr-2">#</th>
                <th className="py-2 pr-3">Story</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">RED → result</th>
                <th className="px-2 py-2 text-right">Attempts</th>
                <th className="px-2 py-2 text-right">Tests</th>
                <th className="px-2 py-2 text-right">Files</th>
                <th className="px-2 py-2 text-right">Gate</th>
                <th className="px-2 py-2 text-right">Cost</th>
                <th className="px-2 py-2 text-right">Time</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stories.map((s) => {
                const c = s.codegen;
                const b = CODEGEN_BADGE[c.status];
                return (
                  <tr key={s.id} onClick={() => openStory(s.id)} className={`cursor-pointer hover:bg-slate-50 ${s.id === current?.id ? "bg-blue-50/50" : ""}`}>
                    <td className="py-2 pr-2 text-slate-400">{s.planOrder}</td>
                    <td className="py-2 pr-3">
                      <span className="font-mono font-semibold text-slate-800">{s.id}</span>
                      <span className="ml-1.5 text-slate-500">{s.title}</span>
                    </td>
                    <td className="px-2 py-2"><Badge tone={b.tone}>{b.label}</Badge></td>
                    <td className="px-2 py-2 font-mono text-[11px] text-slate-600">
                      {c.redStatus ? `${c.redStatus} → ${c.testStatus ?? "…"}` : c.testStatus ?? "—"}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">{c.statusSource === "derived" ? "—" : c.attempts || "—"}</td>
                    <td className={`px-2 py-2 text-right tabular-nums ${c.tests.failed ? "font-semibold text-rose-600" : ""}`}>
                      {!c.tests.total ? "—" : c.testStatus === "toolchain-unavailable" ? <span className="text-amber-700">{c.tests.total} not run</span> : `${c.tests.passed}/${c.tests.total}`}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">{c.changedFiles.length || "—"}</td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {c.qualityGate && c.qualityGate.passed !== null ? <span className={c.qualityGate.passed ? "text-emerald-700" : "text-rose-600"}>{Math.round(c.qualityGate.score * 100)}%</span> : "—"}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">{c.costUsd ? `$${c.costUsd.toFixed(2)}` : "—"}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{c.wallTimeS ? `${Math.round(c.wallTimeS / 60)}m` : "—"}</td>
                    <td className="py-2 pl-2 text-slate-300"><ChevronRight className="h-4 w-4" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SubCard>
    </div>
  );
}

function CurrentStory({ story, data, openStory }: { story: Story; data: DashboardData; openStory: (id: string) => void }) {
  const steps = buildStepStates(story);
  const c = story.codegen;
  return (
    <SubCard className="border-blue-200">
      <SectionTitle
        right={
          <button onClick={() => openStory(story.id)} className="no-print rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            Open story
          </button>
        }
      >
        <span className="flex flex-wrap items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" /> Now building
          <span className="font-mono">{story.id}</span>
          <span className="font-normal text-slate-500">{story.title}</span>
          <Badge tone="blue">attempt {c.attempts}</Badge>
        </span>
      </SectionTitle>
      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
        {data.buildSteps.map((st, i) => {
          const state = steps[st.key] ?? "todo";
          const style = STEP_STYLE[state];
          return (
            <li key={st.key} className={`rounded-lg border p-2 ${style.box}`} title={`${st.module}\n${st.description}`}>
              <div className="flex items-center gap-1.5">
                {style.icon}
                <span className="text-[11px] text-slate-400">{i + 1}</span>
                <span className="text-xs font-semibold text-slate-800">{st.label}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1">
                <Badge tone={MODE_TONE[st.mode]}>{st.mode}</Badge>
                <span className="text-[10px] uppercase text-slate-500">{state}</span>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-4">
        <Fact label="RED baseline" value={c.redStatus ?? "—"} />
        <Fact label="Latest run" value={c.testStatus ?? "—"} />
        <Fact label="Tests" value={`${c.tests.passed}/${c.tests.total} passing`} />
        <Fact label="Spend so far" value={c.statusSource === "demo" ? "simulated" : `$${c.costUsd.toFixed(2)} · ${Math.round(c.wallTimeS / 60)} min`} />
      </div>
      {c.rationale && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">{c.rationale}</p>}
    </SubCard>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-slate-400">{label}</div>
      <div className="font-mono text-[12px] font-semibold text-slate-800">{value}</div>
    </div>
  );
}
