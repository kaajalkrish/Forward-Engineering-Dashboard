import type { AgentRole, DashboardData, ModelTier } from "../../types";
import { Badge, Code, SectionTitle, SubCard } from "../../components/ui";
import { NoData } from "../../components/DataSourceBanner";

const TIERS: { tier: ModelTier; label: string; why: string; tone: string }[] = [
  { tier: "haiku", label: "Haiku", why: "High-volume breadth: summaries, Q&A, triage", tone: "border-t-sky-400" },
  { tier: "sonnet", label: "Sonnet", why: "Synthesis throughput: BRD, stories, code", tone: "border-t-indigo-400" },
  { tier: "opus", label: "Opus", why: "Hard calls: judging, design, repair, advice", tone: "border-t-violet-500" },
];

const fmtTokens = (n: number | null) => (n === null ? "—" : n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`);

export function RolesTab({ data }: { data: DashboardData }) {
  const stageLabel = (k: string) => data.stages.find((s) => s.key === k)?.label ?? k;
  const recorded = data.agentRoles.some((r) => r.costUsd !== null);
  const byCost = [...data.agentRoles].sort((a, b) => (b.costUsd ?? 0) - (a.costUsd ?? 0));
  const maxCost = byCost[0]?.costUsd || 1;
  const total = data.agentRoles.reduce((n, r) => n + (r.costUsd ?? 0), 0);

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        Model per role resolves as: per-role env var → <code className="font-mono">COBOL_MOD_LLM_MODEL</code> → tier default
        (<span className="font-mono">cost/tiering.py</span>). Every call is capped by the workspace and per-run budgets.
      </p>

      <div className="grid gap-3 lg:grid-cols-3">
        {TIERS.map((t) => {
          const roles = data.agentRoles.filter((r) => r.tier === t.tier);
          return (
            <SubCard key={t.tier} className={`border-t-4 ${t.tone}`}>
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-bold text-slate-900">{t.label}</span>
                <span className="text-[11px] text-slate-400">{roles.length} roles</span>
              </div>
              <div className="text-[11px] text-slate-500">{t.why}</div>
              <ul className="mt-3 space-y-3">
                {roles.map((r) => <RoleItem key={r.role} r={r} stageLabel={stageLabel} />)}
              </ul>
            </SubCard>
          );
        })}
      </div>

      <SubCard>
        <SectionTitle right={recorded ? <span className="text-xs text-slate-500">total ${total.toFixed(2)}</span> : undefined}>Spend by role</SectionTitle>
        {!recorded ? (
          <NoData what="Spend per role" needs="the Postgres agent_run table (cost per run and role)" />
        ) : (
        <ul className="space-y-1.5">
          {byCost.map((r) => (
            <li key={r.role} className="grid grid-cols-[130px_1fr_70px] items-center gap-3 text-xs">
              <span className="truncate font-medium text-slate-700">{r.label}</span>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${r.tier === "opus" ? "bg-violet-500" : r.tier === "sonnet" ? "bg-indigo-400" : "bg-sky-400"}`}
                  style={{ width: `${((r.costUsd ?? 0) / maxCost) * 100}%` }}
                />
              </div>
              <span className="text-right tabular-nums text-slate-600">{r.costUsd === null ? "—" : `$${r.costUsd.toFixed(2)}`}</span>
            </li>
          ))}
        </ul>
        )}
      </SubCard>
    </div>
  );
}

function RoleItem({ r, stageLabel }: { r: AgentRole; stageLabel: (k: string) => string }) {
  return (
    <li className="rounded-lg border border-slate-100 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-800">{r.label}</span>
        <span className="font-mono text-[10px] text-slate-400">{r.role}</span>
      </div>
      <p className="mt-0.5 text-[11px] text-slate-600">{r.description}</p>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {r.stages.map((s) => <Badge key={s}>{stageLabel(s)}</Badge>)}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
        <Code>{r.envVar}</Code>
        {r.runs === null ? (
          <span className="italic text-slate-400">runs not recorded</span>
        ) : (
          <>
            <span>{r.runs} runs</span>
            <span>{fmtTokens(r.tokens)} tokens</span>
            <span className="font-semibold text-slate-700">${(r.costUsd ?? 0).toFixed(2)}</span>
          </>
        )}
      </div>
    </li>
  );
}
