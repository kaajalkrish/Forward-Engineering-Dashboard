import { ArrowRight } from "lucide-react";
import type { DashboardData, Story } from "../../types";
import { storyDisplayStatus } from "../../lib/metrics";
import { byPlanOrder, CODEGEN_BADGE, storyLevels } from "../../lib/stories";
import { Badge, Dot, SectionTitle, SubCard } from "../../components/ui";

const CARD_W = 200;
const CARD_H = 62;
const COL_GAP = 52;
const ROW_GAP = 14;

const BORDER: Record<string, string> = {
  completed: "border-emerald-300",
  in_progress: "border-blue-400 ring-2 ring-blue-100",
  pending: "border-slate-200",
  blocked: "border-rose-300",
};

export function StoryPlanTab({ data, openStory }: { data: DashboardData; openStory: (id: string) => void }) {
  const levels = storyLevels(data.stories);
  const maxLevel = Math.max(0, ...levels.values());
  const columns: Story[][] = Array.from({ length: maxLevel + 1 }, (_, l) =>
    data.stories.filter((s) => levels.get(s.id) === l).sort(byPlanOrder),
  );
  const pos = new Map<string, { x: number; y: number }>();
  columns.forEach((col, l) => col.forEach((s, i) => pos.set(s.id, { x: l * (CARD_W + COL_GAP), y: i * (CARD_H + ROW_GAP) })));
  const width = (maxLevel + 1) * CARD_W + maxLevel * COL_GAP;
  const height = Math.max(...columns.map((c) => c.length)) * (CARD_H + ROW_GAP) - ROW_GAP;
  const edges = data.stories.flatMap((s) => s.dependsOn.map((d) => ({ from: d, to: s.id })));
  const sequence = [...data.stories].sort(byPlanOrder);
  const gate = data.gates.find((g) => g.key === "stories_dag");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
        <Badge tone="blue">{data.stories.length} stories</Badge>
        <Badge tone="blue">{edges.length} dependencies</Badge>
        <Badge tone="blue">{maxLevel + 1} levels</Badge>
        {gate && <Badge tone={gate.status === "passed" ? "green" : "slate"}>gate stories_dag · {gate.result}</Badge>}
      </div>

      <SubCard>
        <SectionTitle right={<span className="text-[11px] text-slate-400">left → right: a story starts only after everything pointing at it</span>}>
          Dependency graph
        </SectionTitle>
        <div className="overflow-x-auto pb-2">
          <div className="mb-1 flex text-[10px] font-bold uppercase tracking-wider text-slate-400" style={{ width }}>
            {columns.map((_, l) => (
              <div key={l} style={{ width: CARD_W, marginRight: l < maxLevel ? COL_GAP : 0 }}>Level {l}</div>
            ))}
          </div>
          <div className="relative" style={{ width, height }}>
            <svg className="absolute inset-0" width={width} height={height} aria-hidden>
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M0,0 L10,5 L0,10 z" className="fill-slate-400" />
                </marker>
              </defs>
              {edges.map(({ from, to }) => {
                const a = pos.get(from);
                const b = pos.get(to);
                if (!a || !b) return null;
                const x1 = a.x + CARD_W, y1 = a.y + CARD_H / 2, x2 = b.x - 2, y2 = b.y + CARD_H / 2;
                const mx = (x1 + x2) / 2;
                return (
                  <path key={`${from}-${to}`} d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`} fill="none" className="stroke-slate-300" strokeWidth={1.5} markerEnd="url(#arrow)" />
                );
              })}
            </svg>
            {data.stories.map((s) => {
              const p = pos.get(s.id)!;
              const b = CODEGEN_BADGE[s.codegen.status];
              return (
                <button
                  key={s.id}
                  onClick={() => openStory(s.id)}
                  style={{ left: p.x, top: p.y, width: CARD_W, height: CARD_H }}
                  className={`absolute rounded-lg border bg-white px-2.5 py-1.5 text-left shadow-sm transition hover:shadow ${BORDER[storyDisplayStatus(s)]}`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-[11px] font-bold text-slate-800">#{s.planOrder} {s.id}</span>
                    <Badge tone={b.tone}>{b.label === "generated-unverified" ? "unverified" : b.label}</Badge>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-slate-600">{s.title}</div>
                </button>
              );
            })}
          </div>
        </div>
      </SubCard>

      <SubCard>
        <SectionTitle>Build sequence</SectionTitle>
        <ol className="flex flex-wrap items-center gap-1.5 text-xs">
          {sequence.map((s, i) => (
            <li key={s.id} className="flex items-center gap-1.5">
              <button onClick={() => openStory(s.id)} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 font-mono font-semibold text-slate-700 hover:bg-slate-200">
                <Dot status={storyDisplayStatus(s)} /> {s.id}
              </button>
              {i < sequence.length - 1 && <ArrowRight className="h-3 w-3 text-slate-300" />}
            </li>
          ))}
        </ol>
      </SubCard>
    </div>
  );
}
