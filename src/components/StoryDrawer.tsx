// Slide-over with everything about one story: backlog fields, lineage and its build record.
import { useEffect, type ReactNode } from "react";
import { Check, Circle, CircleDashed, CircleHelp, Loader2, X, XCircle } from "lucide-react";
import type { DashboardData } from "../types";
import { buildStepStates, CODEGEN_BADGE, type StepState } from "../lib/stories";
import { Badge, Code, SectionTitle } from "./ui";

const STEP_ICON: Record<StepState, ReactNode> = {
  done: <Check className="h-3.5 w-3.5 text-emerald-600" strokeWidth={3} />,
  active: <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />,
  failed: <XCircle className="h-3.5 w-3.5 text-rose-600" />,
  skipped: <CircleDashed className="h-3.5 w-3.5 text-slate-400" />,
  todo: <Circle className="h-3.5 w-3.5 text-slate-300" />,
  unknown: <CircleHelp className="h-3.5 w-3.5 text-slate-300" />,
};

export function StoryDrawer({ data, storyId, onClose, onOpenStory }: {
  data: DashboardData;
  storyId: string | null;
  onClose: () => void;
  onOpenStory: (id: string) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const story = data.stories.find((s) => s.id === storyId);
  if (!story) return null;

  const epic = data.epics.find((e) => e.id === story.epicId);
  const c = story.codegen;
  const badge = CODEGEN_BADGE[c.status];
  const steps = buildStepStates(story);
  const dependents = data.stories.filter((s) => s.dependsOn.includes(story.id));

  return (
    <div className="no-print fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <aside className="relative h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-bold text-slate-900">{story.id}</span>
              <Badge tone={badge.tone}>{badge.label}</Badge>
              {c.statusSource === "derived" && <Badge title="Worked out from the generated files; the harness's own record was not in the output">derived from files</Badge>}
              {c.statusSource === "demo" && <Badge tone="violet" title="Simulated by the implementation demo; not a harness result">demo</Badge>}
              <Badge>#{story.planOrder} in plan</Badge>
            </div>
            <h2 className="mt-1 text-lg font-bold text-slate-900">{story.title}</h2>
            <div className="text-xs text-slate-500">
              {epic ? `${epic.id} · ${epic.title}` : story.epicId} · {story.context} context · {story.service}
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-5 px-5 py-4 text-sm">
          <section>
            <p className="rounded-lg bg-slate-50 px-3 py-2 italic text-slate-700">{story.narrative}</p>
            <div className="mt-1 text-xs text-slate-500">Actor: {story.actor}</div>
          </section>

          <section>
            <SectionTitle>Acceptance criteria</SectionTitle>
            <ul className="space-y-1.5">
              {story.acceptanceCriteria.map((ac) => (
                <li key={ac.id} className="flex gap-2 text-xs">
                  {ac.covered ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" strokeWidth={3} /> : <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" />}
                  <span><b className="font-mono">{ac.id}</b> {ac.statement}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <SectionTitle>Lineage</SectionTitle>
            <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-2 text-xs">
              <dt className="text-slate-400">BRD</dt>
              <dd className="flex flex-wrap gap-1">{story.brdRequirementIds.map((r) => <Badge key={r} tone="blue">{r}</Badge>)}</dd>
              <dt className="text-slate-400">COBOL evidence</dt>
              <dd className="flex flex-col items-start gap-1">{story.evidenceRefs.map((r) => <Code key={r} wrap>{r}</Code>)}</dd>
              <dt className="text-slate-400">Seams</dt>
              <dd className="flex flex-wrap gap-1">{story.seamRefs.map((r) => <Code key={r}>{r}</Code>)}</dd>
              <dt className="text-slate-400">Depends on</dt>
              <dd className="flex flex-wrap gap-1">
                {story.dependsOn.length ? story.dependsOn.map((id) => <StoryLink key={id} id={id} onOpen={onOpenStory} />) : <span className="text-slate-400">none</span>}
              </dd>
              <dt className="text-slate-400">Unblocks</dt>
              <dd className="flex flex-wrap gap-1">
                {dependents.length ? dependents.map((s) => <StoryLink key={s.id} id={s.id} onOpen={onOpenStory} />) : <span className="text-slate-400">none</span>}
              </dd>
            </dl>
          </section>

          <section>
            <SectionTitle right={<span className="text-[11px] text-slate-400">{c.statusSource === "derived" ? "unknown steps were not recorded in the output" : `attempt ${c.attempts}`}</span>}>Build loop</SectionTitle>
            <ol className="grid gap-1 sm:grid-cols-2">
              {data.buildSteps.map((st) => (
                <li key={st.key} className="flex items-center gap-2 rounded-md border border-slate-100 px-2 py-1 text-xs">
                  {STEP_ICON[steps[st.key] ?? "todo"]}
                  <span className="font-medium text-slate-700">{st.label}</span>
                  <span className="ml-auto text-[10px] uppercase text-slate-400">{steps[st.key]}</span>
                </li>
              ))}
            </ol>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <Stat label="RED baseline" value={c.redStatus ?? "—"} />
              <Stat label="Tests" value={c.testStatus ?? "—"} />
              <Stat label="Passing" value={c.testStatus === "ok" || c.testStatus === "tests-failed" ? `${c.tests.passed}/${c.tests.total}` : `${c.tests.total} not run`} />
              <Stat label="Cost · time" value={c.statusSource === "derived" ? "not recorded" : c.statusSource === "demo" ? "simulated" : `$${c.costUsd.toFixed(2)} · ${Math.round(c.wallTimeS / 60)}m`} />
            </dl>
            {c.generationMode && (
              <p className="mt-2 text-xs text-slate-600">
                <span className="text-slate-400">Generation mode </span>
                <Code>{c.generationMode}</Code>
              </p>
            )}
            {c.rationale && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">{c.rationale}</p>}
          </section>

          {c.behaviorSignals && c.behaviorSignals.length > 0 && (
            <section>
              <SectionTitle>COBOL behaviour to reproduce</SectionTitle>
              <ul className="flex flex-col items-start gap-1">
                {c.behaviorSignals.map((b) => <Code key={b} wrap>{b}</Code>)}
              </ul>
            </section>
          )}

          <section>
            <SectionTitle>Generated files</SectionTitle>
            {c.changedFiles.length ? (
              <>
                <div className="mb-1 text-[11px] text-slate-400">
                  {c.changedFiles[0].startsWith("src/")
                    ? `${data.meta.codePath}/`
                    : `${data.meta.codePath}/src/main/java/${data.meta.basePackage.replace(/\./g, "/")}/`}
                </div>
                <ul className="flex flex-col items-start gap-1">{c.changedFiles.map((f) => <Code key={f} wrap>{f}</Code>)}</ul>
              </>
            ) : (
              <span className="text-xs italic text-slate-400">Not generated yet.</span>
            )}
          </section>

          {c.qualityGate && (
            <section>
              <SectionTitle
                right={
                  c.qualityGate.passed === null ? (
                    <Badge>not recorded · {Object.keys(c.qualityGate.checks).length} of 7 checks readable from files</Badge>
                  ) : (
                    <Badge tone={c.qualityGate.passed ? "green" : "red"}>{Math.round(c.qualityGate.score * 100)}% · {c.qualityGate.passed ? "passed" : "failed"}</Badge>
                  )
                }
              >
                Story quality gate
              </SectionTitle>
              <ul className="grid gap-1 sm:grid-cols-2">
                {Object.entries(c.qualityGate.checks).map(([k, v]) => (
                  <li key={k} className="flex items-center gap-2 text-xs">
                    {v ? <Check className="h-3.5 w-3.5 text-emerald-600" strokeWidth={3} /> : <XCircle className="h-3.5 w-3.5 text-rose-600" />}
                    <span className="font-mono text-[11px] text-slate-600">{k}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </aside>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-2 py-1.5">
      <dt className="text-[10px] uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="font-semibold text-slate-800">{value}</dd>
    </div>
  );
}

function StoryLink({ id, onOpen }: { id: string; onOpen: (id: string) => void }) {
  return (
    <button onClick={() => onOpen(id)} className="rounded bg-blue-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-blue-700 hover:bg-blue-100">
      {id}
    </button>
  );
}
