import { Braces, FileDown } from "lucide-react";
import type { ReactNode } from "react";
import type { DashboardData } from "../types";
import { formatDateTime, timeAgo } from "../lib/format";

function Chip({ label, children, mono = false }: { label: string; children: ReactNode; mono?: boolean }) {
  return (
    <span
      title={typeof children === "string" ? children : undefined}
      className="inline-flex min-w-0 max-w-full items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs shadow-sm"
    >
      <span className="shrink-0 text-slate-500">{label}</span>
      <span className={`min-w-0 truncate font-semibold text-slate-800 ${mono ? "font-mono text-[11px]" : ""}`}>{children}</span>
    </span>
  );
}

export function HeaderBar({ data, now }: { data: DashboardData; now: Date }) {
  const { meta, state } = data;
  const { spentUsd, workspaceCapUsd } = state.budget;

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${meta.repoSlug}-dashboard.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <header className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Chip label="Times in">{meta.timezone}</Chip>
        <Chip label="Workspace">{meta.workspace}</Chip>
        <Chip label="Graph">{meta.graphSnapshot}</Chip>
        <Chip label="Budget">{spentUsd === null ? `spend not recorded · cap $${workspaceCapUsd.toFixed(2)}` : `$${spentUsd.toFixed(2)} / $${workspaceCapUsd.toFixed(2)}`}</Chip>
      </div>
      <div className="flex flex-wrap gap-2">
        <Chip label="Source" mono>{meta.sourceRepo}</Chip>
        <Chip label="BRD" mono>{meta.brdPath}</Chip>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Chip label="Code" mono>{meta.codePath}</Chip>
        <Chip label="Generated">{formatDateTime(meta.generatedAt, meta.timezone)}</Chip>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          Live · updated {timeAgo(meta.updatedAt, now)}
        </span>
        <button
          onClick={() => window.print()}
          className="no-print inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <FileDown className="h-3.5 w-3.5" /> Export PDF
        </button>
        <button
          onClick={downloadJson}
          className="no-print inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <Braces className="h-3.5 w-3.5" /> JSON
        </button>
      </div>
    </header>
  );
}
