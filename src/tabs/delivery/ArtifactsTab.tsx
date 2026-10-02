import { useState } from "react";
import type { DashboardData } from "../../types";
import { formatShort } from "../../lib/format";
import { Badge, Code } from "../../components/ui";

export function ArtifactsTab({ data }: { data: DashboardData }) {
  const [phase, setPhase] = useState<string>("all");
  const stageByKey = new Map(data.stages.map((s) => [s.key, s]));
  const rows = [...data.artifacts]
    .filter((a) => phase === "all" || stageByKey.get(a.stageKey)?.phase === phase)
    .sort((a, b) => (stageByKey.get(a.stageKey)?.ordinal ?? 0) - (stageByKey.get(b.stageKey)?.ordinal ?? 0));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {[{ key: "all", label: "All" }, ...data.phases.map((p) => ({ key: p.key, label: p.label }))].map((f) => {
          const n = f.key === "all" ? data.artifacts.length : data.artifacts.filter((a) => stageByKey.get(a.stageKey)?.phase === f.key).length;
          return (
            <button
              key={f.key}
              onClick={() => setPhase(f.key)}
              className={`rounded-full px-3 py-1 font-semibold ring-1 ${phase === f.key ? "bg-blue-50 text-blue-700 ring-blue-300" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"}`}
            >
              {f.label} <span className="ml-1 text-slate-400">{n}</span>
            </button>
          );
        })}
        <span className="ml-auto text-slate-400">Each (kind, version) is unique per workspace; a new run adds a version, never overwrites.</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[900px] text-left text-xs">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-3 py-2">Artifact</th>
              <th className="px-3 py-2">Stage</th>
              <th className="px-3 py-2">Version</th>
              <th className="px-3 py-2">Location</th>
              <th className="px-3 py-2">Content hash</th>
              <th className="px-3 py-2">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((a) => (
              <tr key={a.id} className="align-top">
                <td className="px-3 py-2.5">
                  <div className="font-semibold text-slate-800">{a.label}</div>
                  <div className="font-mono text-[11px] text-slate-500">{a.kind}</div>
                  <div className="mt-0.5 text-slate-500">{a.summary}</div>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">{stageByKey.get(a.stageKey)?.label ?? a.stageKey}</td>
                <td className="px-3 py-2.5"><Badge tone="blue">v{a.version}</Badge></td>
                <td className="px-3 py-2.5"><Code wrap>{a.objectUri}</Code></td>
                <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500">{a.contentHash}</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">{formatShort(a.createdAt, data.meta.timezone)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
