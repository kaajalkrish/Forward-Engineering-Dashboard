import type { BoundedContext, DashboardData } from "../../types";
import { Badge, Code, ProgressBar, SectionTitle, SubCard } from "../../components/ui";

const W = 600;
const H = 330;
const NODE_W = 170;
const NODE_H = 64;

export function DomainTab({ data }: { data: DashboardData }) {
  const contexts = [...data.contexts].sort((a, b) => a.extractionRank - b.extractionRank);
  const programContext = new Map(data.contexts.flatMap((c) => c.memberPrograms.map((p) => [p, c.name] as const)));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-3">
        {contexts.map((c) => <ContextCard key={c.name} c={c} data={data} />)}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <SubCard>
          <SectionTitle right={<span className="text-[11px] text-slate-400">solid = sync call · dashed = async event</span>}>Context map</SectionTitle>
          <ContextMap contexts={data.contexts} />
        </SubCard>

        <SubCard>
          <SectionTitle right={<span className="text-[11px] text-slate-400">gate design_data_ownership</span>}>Data ownership</SectionTitle>
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-1.5 pr-2">File</th>
                <th className="py-1.5 pr-2">Owner</th>
                <th className="py-1.5 pr-2">Written by</th>
                <th className="py-1.5">Read from other contexts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.contexts.flatMap((c) =>
                c.ownedResources.map((r) => {
                  const writers = data.seams.filter((s) => s.writes.includes(r)).map((s) => s.program);
                  const foreignReaders = data.seams
                    .filter((s) => s.reads.includes(r) && programContext.get(s.program) !== c.name)
                    .map((s) => s.program);
                  return (
                    <tr key={r} className="align-top">
                      <td className="py-1.5 pr-2"><Code>{r}</Code></td>
                      <td className="py-1.5 pr-2 font-semibold text-slate-800">{c.name}</td>
                      <td className="py-1.5 pr-2 font-mono text-[11px] text-slate-600">
                        {writers.length === 0 && "—"}
                        {writers.map((w, i) => {
                          const owner = programContext.get(w);
                          const foreign = owner !== c.name;
                          return (
                            <span key={w} title={foreign ? `${w} is ${owner ? `in ${owner}` : "not assigned to any context"}` : undefined}>
                              {i > 0 && ", "}
                              <span className={foreign ? "font-semibold text-amber-700" : ""}>{w}{foreign && (owner ? ` (${owner})` : " (unassigned)")}</span>
                            </span>
                          );
                        })}
                      </td>
                      <td className="py-1.5 font-mono text-[11px] text-slate-500">{foreignReaders.join(", ") || "—"}</td>
                    </tr>
                  );
                }),
              )}
            </tbody>
          </table>
          <p className="mt-2 text-[11px] text-slate-500">
            One owner per file; other contexts may read through the owner's API or a read replica, never write.
            Writers shown in <span className="font-semibold text-amber-700">amber</span> sit outside the owning context and
            must move behind its API before cut-over.
          </p>
        </SubCard>
      </div>
    </div>
  );
}

function ContextCard({ c, data }: { c: BoundedContext; data: DashboardData }) {
  const stories = data.stories.filter((s) => s.context === c.name);
  const micro = c.deployment === "microservice";
  return (
    <SubCard>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-slate-900">{c.name}</span>
        <Badge tone={micro ? "violet" : "blue"}>{c.deployment}</Badge>
      </div>
      <div className="text-xs text-slate-500">{c.capability} · extraction #{c.extractionRank}</div>
      <div className="mt-2">
        <div className="flex justify-between text-[11px] text-slate-500">
          <span>module ← topology score → microservice</span>
          <span className="font-semibold tabular-nums text-slate-700">{c.topologyScore.toFixed(2)}</span>
        </div>
        <ProgressBar value={c.topologyScore * 100} color={micro ? "bg-violet-500" : "bg-blue-500"} className="mt-1 h-1.5" />
      </div>
      <p className="mt-2 text-xs text-slate-600">{c.rationale}</p>
      <dl className="mt-2 space-y-1.5 text-xs">
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Programs</dt>
          <dd className="mt-0.5 flex flex-wrap gap-1">{c.memberPrograms.map((p) => <Code key={p}>{p}</Code>)}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Owns</dt>
          <dd className="mt-0.5 flex flex-wrap gap-1">{c.ownedResources.map((r) => <Badge key={r} tone="green">{r}</Badge>)}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Stories</dt>
          <dd className="mt-0.5 font-mono text-[11px] text-slate-600">{stories.map((s) => s.id).join(" · ") || "—"}</dd>
        </div>
      </dl>
    </SubCard>
  );
}

function ContextMap({ contexts }: { contexts: BoundedContext[] }) {
  // Place contexts on a circle; with three this gives a triangle.
  const cx = W / 2, cy = H / 2, r = Math.min(W, H) / 2 - NODE_H;
  const pos = new Map(
    contexts.map((c, i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / contexts.length + Math.PI / contexts.length;
      const rx = W / 2 - NODE_W / 2 - 16, ry = r + 12;
      return [c.name, { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) }] as const;
    }),
  );
  const edges = contexts.flatMap((c) => c.dependsOn.map((d) => ({ from: c.name, to: d.target, style: d.style })));

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-[600px]" role="img" aria-label="Context map">
        <defs>
          <marker id="ctx-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" className="fill-slate-500" />
          </marker>
        </defs>
        {edges.map((e) => {
          const a = pos.get(e.from), b = pos.get(e.to);
          if (!a || !b) return null;
          const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
          // Shift each edge sideways so A→B and B→A run as two parallel lines.
          const nx = (-dy / len) * 9, ny = (dx / len) * 9;
          // Clip both ends at the node rectangles' borders.
          const s = Math.min(NODE_W / 2 / Math.abs(dx || 1e-6), NODE_H / 2 / Math.abs(dy || 1e-6));
          const x1 = a.x + dx * s + nx, y1 = a.y + dy * s + ny;
          const x2 = b.x - dx * (s + 6 / len) + nx, y2 = b.y - dy * (s + 6 / len) + ny;
          const lx = (x1 + x2) / 2 + nx * 2.2, ly = (y1 + y2) / 2 + ny * 2.2;
          return (
            <g key={`${e.from}-${e.to}`}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-slate-400" strokeWidth={1.8} strokeDasharray={e.style === "async" ? "6 4" : undefined} markerEnd="url(#ctx-arrow)" />
              <text x={lx} y={ly + 4} textAnchor="middle" className="fill-slate-600 text-[12px] font-semibold" stroke="white" strokeWidth={4} paintOrder="stroke">
                {e.style}
              </text>
            </g>
          );
        })}
        {contexts.map((c) => {
          const p = pos.get(c.name)!;
          const micro = c.deployment === "microservice";
          return (
            <g key={c.name}>
              <rect x={p.x - NODE_W / 2} y={p.y - NODE_H / 2} width={NODE_W} height={NODE_H} rx={12} className={micro ? "fill-violet-50 stroke-violet-400" : "fill-blue-50 stroke-blue-400"} strokeWidth={1.5} />
              <text x={p.x} y={p.y - 4} textAnchor="middle" className="fill-slate-900 text-[16px] font-bold">{c.name}</text>
              <text x={p.x} y={p.y + 16} textAnchor="middle" className="fill-slate-500 text-[13px]">{c.deployment}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
