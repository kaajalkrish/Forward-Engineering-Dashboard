import { ArrowRight } from "lucide-react";
import type { DashboardData, TechItem } from "../../types";
import { SectionTitle, SubCard } from "../../components/ui";

export function TechStackTab({ data }: { data: DashboardData }) {
  const { source, target, harness, mappings } = data.techStack;
  return (
    <div className="space-y-4">
      <div className="grid items-stretch gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr]">
        <Column title="Legacy source" tone="border-t-amber-400" items={source} />
        <Arrow />
        <Column title="Harness" tone="border-t-indigo-400" items={harness} />
        <Arrow />
        <Column title="Java target" tone="border-t-emerald-400" items={target} />
      </div>

      <SubCard>
        <SectionTitle>What becomes what</SectionTitle>
        <ul className="divide-y divide-slate-100">
          {mappings.map((m) => (
            <li key={m.legacy} className="grid gap-1 py-2 text-xs md:grid-cols-[1fr_auto_1fr_1.4fr] md:items-center md:gap-3">
              <span className="font-semibold text-amber-800">{m.legacy}</span>
              <ArrowRight className="hidden h-3.5 w-3.5 text-slate-400 md:block" />
              <span className="font-semibold text-emerald-800">{m.modern}</span>
              <span className="text-slate-500">{m.note}</span>
            </li>
          ))}
        </ul>
      </SubCard>
    </div>
  );
}

function Column({ title, tone, items }: { title: string; tone: string; items: TechItem[] }) {
  return (
    <SubCard className={`border-t-4 ${tone}`}>
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</div>
      <ul className="space-y-2">
        {items.map((t) => (
          <li key={t.name} className="text-xs">
            <div className="font-semibold text-slate-800">
              {t.name} {t.version && <span className="font-normal text-slate-400">{t.version}</span>}
            </div>
            <div className="text-slate-500">{t.purpose}</div>
          </li>
        ))}
      </ul>
    </SubCard>
  );
}

function Arrow() {
  return (
    <div className="flex items-center justify-center text-slate-300">
      <ArrowRight className="h-6 w-6 rotate-90 lg:rotate-0" />
    </div>
  );
}
