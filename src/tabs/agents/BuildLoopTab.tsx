import type { ReactNode } from "react";
import { Check, Circle, CircleDashed, CircleHelp, Loader2, XCircle } from "lucide-react";
import type { DashboardData } from "../../types";
import { buildStepStates, byPlanOrder, type StepState } from "../../lib/stories";
import { Badge, Code, SectionTitle, SubCard } from "../../components/ui";

const MODE_TONE = { deterministic: "slate", llm: "violet", toolchain: "amber" } as const;

const ICON: Record<StepState, ReactNode> = {
  done: <Check className="mx-auto h-4 w-4 text-emerald-600" strokeWidth={3} />,
  active: <Loader2 className="mx-auto h-4 w-4 animate-spin text-blue-600" />,
  failed: <XCircle className="mx-auto h-4 w-4 text-rose-600" />,
  skipped: <CircleDashed className="mx-auto h-4 w-4 text-slate-300" />,
  todo: <Circle className="mx-auto h-3.5 w-3.5 text-slate-200" />,
  unknown: <CircleHelp className="mx-auto h-3.5 w-3.5 text-slate-300" />,
};

export function BuildLoopTab({ data, openStory }: { data: DashboardData; openStory: (id: string) => void }) {
  const cfg = data.inputs.config;
  const stories = [...data.stories].sort(byPlanOrder);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]">
        <SubCard>
          <SectionTitle right={<span className="text-[11px] text-slate-400">codegen/story_runner.py</span>}>Per-story pipeline</SectionTitle>
          <ol className="relative space-y-2 border-l-2 border-slate-200 pl-5">
            {data.buildSteps.map((st, i) => (
              <li key={st.key} className="relative">
                <span className="absolute -left-[29px] top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-slate-500 ring-2 ring-slate-200">
                  {i + 1}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800">{st.label}</span>
                  <Badge tone={MODE_TONE[st.mode]}>{st.mode}</Badge>
                  {st.toggle && <Badge tone="violet">LLM if {st.toggle}=1</Badge>}
                </div>
                <div className="text-xs text-slate-600">{st.description}</div>
                <div className="mt-0.5 font-mono text-[10px] text-slate-400">{st.module}</div>
              </li>
            ))}
          </ol>
        </SubCard>

        <SubCard>
          <SectionTitle>Decision rules</SectionTitle>
          <ul className="space-y-2 text-xs text-slate-700">
            <li><Badge tone="green">passed</Badge> every AC cited in a test, tests green, files carry story id + COBOL lineage.</li>
            <li><Badge tone="amber">generated-unverified</Badge> AC citation and lineage hold, but Maven/JDK was unavailable. Accepted; the build moves on.</li>
            <li><Badge tone="red">failed</Badge> still red after the repair budget, or AC coverage / lineage missing.</li>
            <li className="text-slate-500">A 0-test run is never treated as green: it goes back to repair.</li>
          </ul>
          <div className="mt-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Current toggles</div>
          <ul className="mt-1 space-y-1 text-xs">
            {["STORY_LLM_TESTS", "STORY_LLM_IMPL", "ADVISOR_MAX_USES"].map((k) => (
              <li key={k} className="flex items-center gap-2">
                <Code>{k}</Code> <span className="text-slate-600">{cfg[k] ?? "—"}</span>
              </li>
            ))}
          </ul>
        </SubCard>
      </div>

      <SubCard>
        <SectionTitle right={<span className="text-[11px] text-slate-400">✓ done · spinner active · ✗ failed · dashed skipped · ? not recorded</span>}>
          Where each story is in the loop
        </SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead className="text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-2 pr-3">Story</th>
                {data.buildSteps.map((st) => <th key={st.key} className="px-1 py-2 text-center">{st.label}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stories.map((s) => {
                const states = buildStepStates(s);
                return (
                  <tr key={s.id} onClick={() => openStory(s.id)} className="cursor-pointer hover:bg-slate-50">
                    <td className="py-2 pr-3">
                      <span className="font-mono font-semibold text-slate-800">{s.id}</span>
                      <span className="ml-1.5 text-slate-500">{s.title}</span>
                    </td>
                    {data.buildSteps.map((st) => (
                      <td key={st.key} className="px-1 py-2 text-center" title={states[st.key]}>{ICON[states[st.key] ?? "todo"]}</td>
                    ))}
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
