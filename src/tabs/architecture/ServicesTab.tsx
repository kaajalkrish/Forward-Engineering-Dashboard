import type { DashboardData, Service } from "../../types";
import { storyDisplayStatus } from "../../lib/metrics";
import { Badge, Code, Dot, SubCard } from "../../components/ui";

const METHOD_TONE = { GET: "green", POST: "blue", PUT: "amber", PATCH: "amber", DELETE: "red" } as const;

// technical_design/schema.py PersistenceDesign.access_pattern
const ACCESS: Record<Service["persistence"][number]["accessPattern"], { tone: "violet" | "blue" | "green" | "amber" | "slate"; hint: string }> = {
  "legacy-mimic": { tone: "violet", hint: "Writes back to the legacy VSAM layout so COBOL keeps working during strangler-fig cut-over" },
  repository: { tone: "blue", hint: "Owned table behind a Spring Data repository" },
  "read-replica": { tone: "green", hint: "Read-only copy of data owned by another context" },
  "event-sourced": { tone: "amber", hint: "State rebuilt from an event log" },
  unknown: { tone: "slate", hint: "Entity generated; access pattern not recorded in the output" },
};

export function ServicesTab({ data, openStory }: { data: DashboardData; openStory: (id: string) => void }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        Persistence patterns:
        {Object.entries(ACCESS).map(([k, v]) => <Badge key={k} tone={v.tone} title={v.hint}>{k}</Badge>)}
        <span className="ml-auto font-mono text-[11px] text-slate-400">package {data.meta.basePackage}.&lt;service&gt;</span>
      </div>
      <div className="grid gap-3 xl:grid-cols-3">
        {data.services.map((svc) => (
          <SubCard key={svc.name}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-sm font-bold text-slate-900">{svc.name}</span>
              <Badge tone={svc.deployment === "microservice" ? "violet" : "blue"}>{svc.deployment}</Badge>
            </div>
            <div className="text-xs text-slate-500">{svc.boundedContext} context</div>

            <div className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">API contracts</div>
            <ul className="mt-1 space-y-1">
              {svc.apis.map((a) => (
                <li key={a.method + a.path} className="flex items-center gap-2 text-xs">
                  <span className="w-12"><Badge tone={METHOD_TONE[a.method as keyof typeof METHOD_TONE] ?? "slate"}>{a.method}</Badge></span>
                  <Code wrap>{a.path}</Code>
                  <span className="ml-auto shrink-0 text-[11px] text-slate-400">{a.name}</span>
                </li>
              ))}
            </ul>

            <div className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Persistence</div>
            <ul className="mt-1 space-y-1">
              {svc.persistence.map((p) => (
                <li key={p.resource} className="flex items-center gap-2 text-xs">
                  <Code>{p.resource}</Code>
                  <Badge tone={ACCESS[p.accessPattern].tone} title={ACCESS[p.accessPattern].hint}>{p.accessPattern}</Badge>
                </li>
              ))}
            </ul>

            <div className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Stories</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {svc.storyIds.map((id) => {
                const s = data.stories.find((x) => x.id === id);
                return (
                  <button key={id} onClick={() => openStory(id)} className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700">
                    {s && <Dot status={storyDisplayStatus(s)} />} {id}
                  </button>
                );
              })}
            </div>
          </SubCard>
        ))}
      </div>
    </div>
  );
}
