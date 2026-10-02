import { Loader2, OctagonX, ShieldCheck } from "lucide-react";
import type { DashboardData } from "../../types";
import { formatShort } from "../../lib/format";
import { stageDisplayStatus } from "../../lib/metrics";
import { Badge, Dot, SectionTitle, SubCard } from "../../components/ui";

const fmtTokens = (v: number) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(2)}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`);
const RUN_TONE = { running: "blue", succeeded: "green", failed: "red" } as const;

export function StateTab({ data, openStory }: { data: DashboardData; openStory: (id: string) => void }) {
  const { state } = data;
  const stage = data.stages.find((s) => s.key === state.currentStage);
  const story = data.stories.find((s) => s.id === state.currentStoryId);
  const { spentUsd, workspaceCapUsd, runCapUsd, killed } = state.budget;
  const usedPct = workspaceCapUsd && spentUsd !== null ? (spentUsd / workspaceCapUsd) * 100 : 0;
  const t = state.tokens;
  const promptTokens = t ? t.input + t.cacheRead + t.cacheCreation : 0;
  const cacheHit = t && promptTokens ? (t.cacheRead / promptTokens) * 100 : 0;
  const tz = data.meta.timezone;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-3">
        {/* Where the run is */}
        <SubCard>
          <SectionTitle>Now</SectionTitle>
          <div className="flex items-center gap-2 text-sm">
            {stage?.status === "running" ? <Loader2 className="h-4 w-4 animate-spin text-blue-600" /> : <Dot status={stage ? stageDisplayStatus(stage) : "pending"} />}
            <span className="font-bold text-slate-900">{stage?.label ?? state.currentStage}</span>
            <span className="text-slate-400">stage {stage ? stage.ordinal + 1 : "?"}/{data.stages.length}</span>
          </div>
          {story && (
            <button onClick={() => openStory(story.id)} className="mt-2 block w-full rounded-lg bg-blue-50 px-3 py-2 text-left text-xs hover:bg-blue-100">
              <span className="font-mono font-bold text-blue-700">{story.id}</span>{" "}
              <span className="text-slate-700">{story.title}</span>
              <div className="mt-0.5 text-slate-500">{story.codegen.status} · attempt {story.codegen.attempts} · {story.codegen.tests.passed}/{story.codegen.tests.total} tests</div>
            </button>
          )}
          <div className="mt-3 flex flex-wrap gap-1">
            {data.stages.map((s) => (
              <span key={s.key} title={`${s.label}: ${s.status}`} className="inline-flex items-center gap-1 rounded bg-slate-50 px-1.5 py-0.5 text-[10.5px] text-slate-600">
                <Dot status={stageDisplayStatus(s)} /> {s.label}
              </span>
            ))}
          </div>
        </SubCard>

        {/* Budget */}
        <SubCard>
          <SectionTitle right={spentUsd === null ? undefined : killed ? <Badge tone="red"><OctagonX className="mr-1 h-3 w-3" />kill-switch on</Badge> : <Badge tone="green"><ShieldCheck className="mr-1 h-3 w-3" />within caps</Badge>}>
            Budget
          </SectionTitle>
          {spentUsd === null ? (
            <p className="text-sm italic text-slate-500">
              Spend not in the provided output (Postgres budget table). Default caps: ${workspaceCapUsd.toFixed(2)} per workspace, ${runCapUsd.toFixed(2)} per run.
            </p>
          ) : (
          <>
          <div className="text-2xl font-bold tabular-nums text-slate-900">
            ${spentUsd.toFixed(2)} <span className="text-sm font-normal text-slate-400">of ${workspaceCapUsd.toFixed(2)}</span>
          </div>
          <div className="relative mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${usedPct >= 90 ? "bg-rose-500" : usedPct >= 75 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, usedPct)}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-slate-500">
            <span>{usedPct.toFixed(0)}% of workspace cap used</span>
            <span>${(workspaceCapUsd - spentUsd).toFixed(2)} left</span>
          </div>
          <p className="mt-3 text-xs text-slate-600">
            Per-run cap <b>${runCapUsd.toFixed(2)}</b>. Caps fail closed: a call that would exceed them is refused, and the
            kill-switch stops all agent work.
          </p>
          </>
          )}
        </SubCard>

        {/* Tokens */}
        <SubCard>
          <SectionTitle right={t ? <Badge tone="violet">{cacheHit.toFixed(0)}% cache reads</Badge> : undefined}>Tokens</SectionTitle>
          {!t ? (
            <p className="text-sm italic text-slate-500">Token usage not in the provided output (Postgres agent_run).</p>
          ) : (
          <>
          <dl className="grid grid-cols-2 gap-2 text-xs">
            {([
              ["Input", t.input],
              ["Output", t.output],
              ["Cache read", t.cacheRead],
              ["Cache write", t.cacheCreation],
            ] as const).map(([label, v]) => (
              <div key={label} className="rounded-lg bg-slate-50 px-3 py-2">
                <dt className="text-[11px] text-slate-500">{label}</dt>
                <dd className="text-lg font-bold tabular-nums text-slate-900">{fmtTokens(v)}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-[11px] text-slate-500">Cache reads are prompt tokens served from the prompt cache at a fraction of the input price.</p>
          </>
          )}
        </SubCard>
      </div>

      {/* Agent runs */}
      <SubCard>
        <SectionTitle right={<span className="text-[11px] text-slate-400">agent_run</span>}>Agent runs</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-2 pr-3">Run</th>
                <th className="px-2 py-2">Stage</th>
                <th className="px-2 py-2">Role</th>
                <th className="px-2 py-2">Model</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Started</th>
                <th className="px-2 py-2">Finished</th>
                <th className="px-2 py-2 text-right">Tokens</th>
                <th className="px-2 py-2 text-right">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...state.agentRuns].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).map((r) => (
                <tr key={r.id}>
                  <td className="py-2 pr-3 font-mono text-[11px] text-slate-700">{r.id}</td>
                  <td className="px-2 py-2">{data.stages.find((s) => s.key === r.stage)?.label ?? r.stage}</td>
                  <td className="px-2 py-2">{data.agentRoles.find((a) => a.role === r.role)?.label ?? r.role}</td>
                  <td className="px-2 py-2 font-mono text-[11px] text-slate-500">{r.model}</td>
                  <td className="px-2 py-2"><Badge tone={RUN_TONE[r.status]}>{r.status}</Badge></td>
                  <td className="px-2 py-2 whitespace-nowrap text-slate-600">{formatShort(r.startedAt, tz)}</td>
                  <td className="px-2 py-2 whitespace-nowrap text-slate-600">{r.finishedAt ? formatShort(r.finishedAt, tz) : "—"}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{fmtTokens(r.tokens)}</td>
                  <td
                    className={`px-2 py-2 text-right tabular-nums ${r.costUsd > runCapUsd ? "font-bold text-rose-600" : ""}`}
                    title={r.costUsd > runCapUsd ? `Over the $${runCapUsd.toFixed(2)} per-run cap` : undefined}
                  >
                    ${r.costUsd.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SubCard>
    </div>
  );
}
