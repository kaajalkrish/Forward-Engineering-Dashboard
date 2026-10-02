import { Target } from "lucide-react";
import type { DashboardData } from "../../types";
import { Code, SectionTitle, SubCard } from "../../components/ui";

const n = (v: number) => v.toLocaleString("en-US");

export function InputsTab({ data }: { data: DashboardData }) {
  const { outcome, counts, graph, config, sourceRepo } = data.inputs;
  const estate: [string, number][] = [
    ["COBOL programs", counts.programs],
    ["Copybooks", counts.copybooks],
    ["BMS copybooks", counts.bmsCopybooks],
    ["BMS screen maps", counts.bmsMaps],
    ["JCL members", counts.jcl],
    ["CICS programs", counts.cicsPrograms],
    ["COBOL lines", counts.cobolLines],
  ];
  const graphStats: [string, number][] = graph
    ? [
        ["Nodes", graph.nodes],
        ["Edges", graph.edges],
        ["Paragraphs", graph.paragraphs],
        ["Data items", graph.dataItems],
        ["Parse errors", graph.parseErrors],
      ]
    : [];

  return (
    <div className="space-y-4">
      <SubCard className="border-l-4 border-l-indigo-400">
        <SectionTitle right={<span className="text-[11px] text-slate-400">Outcome stage</span>}>
          <span className="inline-flex items-center gap-2"><Target className="h-4 w-4 text-indigo-500" /> Business outcome</span>
        </SectionTitle>
        {outcome ? (
          <>
            <p className="text-sm text-slate-800">{outcome.statement}</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {outcome.drivers.map((d) => (
                <li key={d} className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">{d}</li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm italic text-slate-500">Not in the provided output (recorded by the cockpit's Outcome stage).</p>
        )}
      </SubCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <SubCard>
          <SectionTitle right={<Code>{sourceRepo}</Code>}>Source estate</SectionTitle>
          <Stats items={estate} />
        </SubCard>
        <SubCard>
          <SectionTitle right={<span className="text-[11px] text-slate-400">{data.meta.graphSnapshot}</span>}>Code graph</SectionTitle>
          {graph ? (
            <Stats items={graphStats} good={(label, v) => label === "Parse errors" && v === 0} />
          ) : (
            <p className="text-sm italic text-slate-500">Graph statistics need the Neo4j code graph.</p>
          )}
        </SubCard>
      </div>

      <SubCard>
        <SectionTitle right={<span className="text-[11px] text-slate-400">from .env</span>}>Run configuration</SectionTitle>
        <dl className="grid gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2">
          {Object.entries(config).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-3 border-b border-slate-100 py-1.5">
              <dt><Code>{k}</Code></dt>
              <dd className="text-right font-medium text-slate-700">{v}</dd>
            </div>
          ))}
        </dl>
      </SubCard>
    </div>
  );
}

function Stats({ items, good }: { items: [string, number][]; good?: (label: string, v: number) => boolean }) {
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map(([label, v]) => (
        <div key={label} className="rounded-lg bg-slate-50 px-3 py-2">
          <dt className="text-[11px] text-slate-500">{label}</dt>
          <dd className={`text-lg font-bold tabular-nums ${good?.(label, v) ? "text-emerald-600" : "text-slate-900"}`}>{n(v)}</dd>
        </div>
      ))}
    </dl>
  );
}
