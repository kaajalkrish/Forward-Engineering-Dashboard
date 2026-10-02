// States plainly which parts of the page are real output and which are missing.
import { useState } from "react";
import { ChevronDown, Database, FlaskConical } from "lucide-react";
import type { DashboardData } from "../types";
import { formatDateTime } from "../lib/format";

export function DataSourceBanner({ data, fellBackToSample }: { data: DashboardData; fellBackToSample: boolean }) {
  const [open, setOpen] = useState(false);
  const src = data.meta.dataSource;

  if (src.mode === "sample") {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
        <FlaskConical className="h-4 w-4" />
        <b>Sample data.</b>
        {fellBackToSample ? "No imported output found, so the illustrative sample is shown." : "Illustrative only."}
        <span className="text-amber-800">{src.missing[0]?.needs}</span>
        <a href="./" className="no-print ml-auto font-semibold underline">Show real output</a>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-950">
      <div className="flex flex-wrap items-center gap-2">
        <Database className="h-4 w-4 text-emerald-700" />
        <b>Real output</b>
        <span>
          from <code className="font-mono">{src.modulePath}</code>
          {src.importedAt && <>, imported {formatDateTime(src.importedAt, data.meta.timezone)}</>}.
        </span>
        <span className="text-emerald-800">Real: {src.real.join(" · ")}.</span>
        <button onClick={() => setOpen((v) => !v)} className="no-print ml-auto inline-flex items-center gap-1 font-semibold text-emerald-800 hover:underline" aria-expanded={open}>
          {src.missing.length} sections not in this output <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        <a href="?data=sample" className="no-print font-semibold text-emerald-800 underline">View sample</a>
      </div>
      {open && (
        <ul className="mt-2 grid gap-1 border-t border-emerald-200 pt-2 sm:grid-cols-2">
          {src.missing.map((m) => (
            <li key={m.section}>
              <b>{m.section}</b> <span className="text-emerald-800">needs {m.needs}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Shown inside a tab when the provided output has nothing for it. */
export function NoData({ what, needs }: { what: string; needs: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
      <b>{what}</b> is not in the provided output.
      <div className="mt-1 text-xs text-slate-500">Needs {needs}. Run the harness stage, then re-import.</div>
    </div>
  );
}
