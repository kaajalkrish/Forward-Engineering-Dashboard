import { useState } from "react";
import { ChevronDown, Workflow } from "lucide-react";
import type { DashboardData, Phase } from "../types";
import { phaseDisplayStatus, phaseLabel, phaseStages, stageDisplayStatus, storyDisplayStatus } from "../lib/metrics";
import { STATUS_DOT, StatusPill } from "./ui";

export function Sidebar({ data, overall, openStory }: { data: DashboardData; overall: number; openStory: (id: string) => void }) {
  const { meta, weights } = data;
  const [open, setOpen] = useState(false);
  return (
    <aside className="flex w-full flex-col gap-4 bg-[#1e2536] px-4 py-5 text-slate-200 lg:sticky lg:top-0 lg:h-screen lg:w-[290px] lg:shrink-0 lg:overflow-y-auto">
      {/* Harness identity */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/90 text-white shadow">
          <Workflow className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-base font-bold leading-tight text-white">{meta.harnessName}</div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{meta.harnessTagline}</div>
        </div>
      </div>

      <div className="text-xs leading-snug text-slate-300">
        Workspace <span className="font-semibold text-white">{meta.workspace}</span>
        <span className="block font-mono text-[11px] text-slate-400">{meta.repoSlug}</span>
      </div>

      {/* Overall progress */}
      <div>
        <div className="mb-1 text-[11px] text-slate-400">Overall progress</div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
          <div className="h-full rounded-full bg-blue-400" style={{ width: `${overall}%` }} />
        </div>
        <div className="mt-1 text-[11px] text-slate-400">
          {overall}% · Stages {Math.round(weights.stageWeight * 100)}% + Stories {Math.round(weights.storyWeight * 100)}%
        </div>
      </div>

      {/* Phase cards: always shown on desktop, collapsible on small screens */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="no-print flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 lg:hidden"
        aria-expanded={open}
      >
        {open ? "Hide" : "Show"} phases &amp; stories
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <nav className={`${open ? "flex" : "hidden"} flex-col gap-3 lg:flex print:flex`}>
        {data.phases.map((p, i) => (
          <PhaseCard key={p.key} index={i + 1} phase={p} data={data} openStory={openStory} />
        ))}
      </nav>
    </aside>
  );
}

function PhaseCard({ index, phase, data, openStory }: { index: number; phase: Phase; data: DashboardData; openStory: (id: string) => void }) {
  const status = phaseDisplayStatus(data, phase);
  const stages = phaseStages(data, phase);
  // Implementation lists stories, so show the roles that build them (the Build stage's roles).
  const roleStages = phase.showsStories ? data.stages.filter((s) => s.key === "build") : stages;
  const roleKeys = [...new Set(roleStages.flatMap((s) => s.roles))];
  const roles = roleKeys
    .map((r) => data.agentRoles.find((a) => a.role === r)?.label ?? r)
    .join(" · ");
  // The Implementation phase lists the user stories (in build order) instead of stages.
  const stories = phase.showsStories
    ? [...data.stories].sort((a, b) => a.planOrder - b.planOrder)
    : [];

  return (
    <div
      className={`rounded-xl border p-3 ${
        status === "in_progress" ? "border-blue-500/40 bg-[#262f44]" : "border-white/5 bg-[#262e40]"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="truncate whitespace-nowrap text-[13px] font-bold text-white">
          P{index} · {phase.label}
        </span>
        <StatusPill status={status} tone="solid" label={phaseLabel(status, phase)} />
      </div>
      <ul className="flex flex-col gap-0.5 rounded-lg bg-black/15 p-1.5">
        {stages.map((s) => (
          <li
            key={s.key}
            title={`${s.label}: ${s.status}${s.gateKey ? ` · gate ${s.gateKey}` : ""}`}
            className="flex items-center gap-2 rounded px-1.5 py-0.5 text-xs text-slate-300 hover:bg-white/5"
          >
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[stageDisplayStatus(s)]}`} />
            <span className="font-medium">{s.label}</span>
          </li>
        ))}
        {stories.length > 0 && stages.length > 0 && (
          <li className="mt-1 border-t border-white/5 px-1.5 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Stories
          </li>
        )}
        {stories.map((st) => (
          <li key={st.id}>
            <button
              onClick={() => openStory(st.id)}
              title={`${st.title} · ${st.codegen.status}`}
              className="flex w-full items-center gap-2 rounded px-1.5 py-0.5 text-left text-xs text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[storyDisplayStatus(st)]}`} />
              <span className="font-medium">{st.id}</span>
            </button>
          </li>
        ))}
      </ul>
      {roles && <div className="mt-2 text-[11px] leading-snug text-slate-400">Roles — {roles}</div>}
    </div>
  );
}
