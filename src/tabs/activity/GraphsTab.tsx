import type { DashboardData } from "../../types";
import { BarList, LineChart, SERIES_COLORS } from "../../components/charts";
import { SectionTitle, SubCard } from "../../components/ui";

export function GraphsTab({ data }: { data: DashboardData }) {
  const h = data.history;
  const dates = h.map((p) => p.date);
  const stagesTotal = data.stages.length;
  const storiesTotal = data.stories.length;
  const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
  const { workspaceCapUsd } = data.state.budget;

  // Spend per stage from work units (the durable per-unit cost record).
  const byStage = data.stages
    .map((s) => ({
      label: s.label,
      value: data.workUnits.filter((u) => u.stage === s.key).reduce((n, u) => n + u.costUsd, 0),
      hint: `${data.workUnits.filter((u) => u.stage === s.key).length} work units`,
    }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <SubCard>
        <SectionTitle right={<span className="text-[11px] text-slate-400">both as % of their total, one axis</span>}>
          Progress over time
        </SectionTitle>
        <LineChart
          dates={dates}
          yMax={100}
          yFormat={(v) => `${Math.round(v)}%`}
          series={[
            { name: `Stages passed (of ${stagesTotal})`, color: SERIES_COLORS[0], values: h.map((p) => pct(p.stagesPassed, stagesTotal)) },
            { name: `Stories accepted (of ${storiesTotal})`, color: SERIES_COLORS[1], values: h.map((p) => pct(p.storiesAccepted, storiesTotal)) },
          ]}
        />
      </SubCard>

      <SubCard>
        <SectionTitle right={<span className="text-[11px] text-slate-400">cumulative, against the workspace cap</span>}>
          Spend over time
        </SectionTitle>
        <LineChart
          dates={dates}
          yMax={workspaceCapUsd}
          yFormat={(v) => `$${v % 1 ? v.toFixed(2) : v}`}
          reference={{ value: workspaceCapUsd, label: `cap $${workspaceCapUsd}` }}
          series={[{ name: "Spend (USD)", color: SERIES_COLORS[0], values: h.map((p) => p.costUsd) }]}
        />
      </SubCard>

      <SubCard>
        <SectionTitle right={<span className="text-[11px] text-slate-400">from work units</span>}>Spend by stage</SectionTitle>
        <BarList rows={byStage} format={(v) => `$${v.toFixed(2)}`} />
      </SubCard>

      <SubCard>
        <SectionTitle right={<span className="text-[11px] text-slate-400">wall time per built story</span>}>Minutes per story</SectionTitle>
        <BarList
          rows={[...data.stories]
            .filter((s) => s.codegen.wallTimeS > 0)
            .sort((a, b) => a.planOrder - b.planOrder)
            .map((s) => ({ label: s.id, value: Math.round(s.codegen.wallTimeS / 60), hint: `${s.codegen.attempts} attempt(s), ${s.codegen.status}` }))}
          format={(v) => `${v} min`}
        />
      </SubCard>
    </div>
  );
}
