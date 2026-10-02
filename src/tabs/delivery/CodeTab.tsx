import { useState } from "react";
import { Check, X } from "lucide-react";
import type { DashboardData } from "../../types";
import { Badge, Code, SectionTitle, SubCard } from "../../components/ui";
import { NoData } from "../../components/DataSourceBanner";

const SEV_TONE = { high: "red", medium: "amber", low: "slate" } as const;

export function CodeTab({ data, openStory }: { data: DashboardData; openStory: (id: string) => void }) {
  const [showScaffolds, setShowScaffolds] = useState(false);
  const code = data.code;
  if (!code) return <NoData what="Generated code analysis" needs="a codegen_output module imported with scripts/import-codegen.mjs" />;

  const c = code.counts;
  const storyPkgs = code.packages.filter((p) => p.kind === "story-service");
  const scaffolds = code.packages.filter((p) => p.kind === "program-scaffold");
  const tiles: [string, string, boolean?][] = [
    ["Source files", `${c.mainFiles}`],
    ["Test files", `${c.testFiles}`],
    ["Files still TODO", `${c.filesWithTodo} / ${c.mainFiles}`, c.filesWithTodo > 0],
    ["Stubbed services", `${c.stubbedServices}`, c.stubbedServices > 0],
    ["REST endpoints", `${c.endpoints}`],
    ["JPA entities", `${c.entities}`],
  ];

  return (
    <div className="space-y-4">
      <SubCard>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
          <Code>{code.modulePath}</Code>
          <span>Spring Boot <b>{code.springBoot ?? "?"}</b></span>
          <span>Java <b>{code.java ?? "?"}</b></span>
          <span>package <span className="font-mono">{code.basePackage}</span></span>
          <span>
            compiled by <b>{code.compiledBy === "ide" ? "IDE (not Maven)" : code.compiledBy}</b>
          </span>
          <span className="flex flex-wrap gap-1">
            {code.qualityPlugins.map((p) => <Badge key={p.name}>{p.name}{p.version ? ` ${p.version}` : ""}</Badge>)}
          </span>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {tiles.map(([label, value, warn]) => (
            <div key={label} className="rounded-lg bg-slate-50 px-3 py-2">
              <dt className="text-[11px] text-slate-500">{label}</dt>
              <dd className={`text-lg font-bold tabular-nums ${warn ? "text-amber-700" : "text-slate-900"}`}>{value}</dd>
            </div>
          ))}
        </dl>
      </SubCard>

      <SubCard>
        <SectionTitle right={<span className="text-[11px] text-slate-400">found by reading the files</span>}>Findings</SectionTitle>
        <ul className="space-y-2">
          {code.findings.map((f) => (
            <li key={f.title} className="rounded-lg border border-slate-100 px-3 py-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={SEV_TONE[f.severity]}>{f.severity}</Badge>
                <span className="text-sm font-semibold text-slate-900">{f.title}</span>
              </div>
              <p className="mt-1 text-slate-600">{f.detail}</p>
              {f.where && <div className="mt-1"><span className="text-slate-400">where </span><Code>{f.where}</Code></div>}
            </li>
          ))}
        </ul>
      </SubCard>

      <SubCard>
        <SectionTitle>Story tests</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-2 pr-3">Story</th>
                <th className="px-2 py-2">Declared package</th>
                <th className="px-2 py-2 text-center">Compiles</th>
                <th className="px-2 py-2 text-right">@Test</th>
                <th className="px-2 py-2 text-right">Placeholder asserts</th>
                <th className="px-2 py-2">COBOL behaviour referenced</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {code.tests.map((t) => (
                <tr key={t.file} className="align-top">
                  <td className="py-2 pr-3">
                    <button onClick={() => openStory(t.storyId)} className="font-mono font-semibold text-blue-700 hover:underline">{t.storyId}</button>
                    <div className="max-w-[260px] truncate font-mono text-[10.5px] text-slate-400" title={t.file}>{t.file.split("/").pop()}</div>
                  </td>
                  <td className="px-2 py-2">
                    <Code wrap>{t.declaredPackage}</Code>
                    {!t.packageOk && <div className="mt-0.5 text-[10.5px] text-slate-400">expected {t.expectedPackage}</div>}
                  </td>
                  <td className="px-2 py-2 text-center" title={t.compileProblems.join("\n")}>
                    {t.packageOk && !t.compileProblems.length ? <Check className="mx-auto h-4 w-4 text-emerald-600" strokeWidth={3} /> : <X className="mx-auto h-4 w-4 text-rose-600" strokeWidth={3} />}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">{t.testMethods}</td>
                  <td className={`px-2 py-2 text-right tabular-nums ${t.trivialAssertions === t.assertions && t.assertions ? "font-semibold text-amber-700" : ""}`}>
                    {t.trivialAssertions} / {t.assertions}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(t.behaviorSignals).map(([k, n]) => <Badge key={k}>{k.replace(/_/g, " ")} {n}</Badge>)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SubCard>

      <SubCard>
        <SectionTitle
          right={
            <button onClick={() => setShowScaffolds((v) => !v)} className="no-print rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">
              {showScaffolds ? "Hide" : "Show"} {scaffolds.length} program scaffolds
            </button>
          }
        >
          Packages
        </SectionTitle>
        <table className="w-full text-left text-xs">
          <thead className="text-[11px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="py-1.5 pr-2">Package</th>
              <th className="px-2 py-1.5">Kind</th>
              <th className="px-2 py-1.5">Stories</th>
              <th className="px-2 py-1.5 text-right">Files</th>
              <th className="px-2 py-1.5 text-right">TODO</th>
              <th className="px-2 py-1.5 text-right">Controllers</th>
              <th className="px-2 py-1.5">Entities</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[...storyPkgs, ...(showScaffolds ? scaffolds : [])].map((p) => (
              <tr key={p.name} className="align-top">
                <td className="py-1.5 pr-2 font-mono text-[11px] text-slate-800">{p.name}</td>
                <td className="px-2 py-1.5"><Badge tone={p.kind === "story-service" ? "blue" : "slate"}>{p.kind === "story-service" ? "story service" : "program scaffold"}</Badge></td>
                <td className="px-2 py-1.5 font-mono text-[11px] text-slate-600">{p.storyIds.join(", ") || "—"}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{p.files}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{p.filesWithTodo}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{p.controllers}</td>
                <td className="px-2 py-1.5 font-mono text-[10.5px] text-slate-500">{p.entities.join(", ") || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SubCard>
    </div>
  );
}
