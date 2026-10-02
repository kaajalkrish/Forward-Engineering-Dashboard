import { useState } from "react";
import { CheckSquare, Columns3, List } from "lucide-react";
import type { DashboardData, Epic, Story } from "../../types";
import { isStoryAccepted } from "../../lib/metrics";
import { BOARD_COLUMNS, boardColumn, byPlanOrder, CODEGEN_BADGE } from "../../lib/stories";
import { Badge, ProgressBar } from "../../components/ui";

export function BacklogTab({ data, openStory }: { data: DashboardData; openStory: (id: string) => void }) {
  const [view, setView] = useState<"board" | "list">("board");
  const totalAcs = data.stories.reduce((n, s) => n + s.acceptanceCriteria.length, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
        <Badge tone="blue">{data.epics.length} epics</Badge>
        <Badge tone="blue">{data.stories.length} stories</Badge>
        <Badge tone="blue">{totalAcs} acceptance criteria</Badge>
        <span className="text-slate-400">Backlog → epics first, then stories + ACs per epic, every story tied to BRD requirements.</span>
        <div className="ml-auto flex overflow-hidden rounded-full ring-1 ring-slate-200">
          <ViewButton active={view === "board"} onClick={() => setView("board")} icon={<Columns3 className="h-3.5 w-3.5" />} label="Board" />
          <ViewButton active={view === "list"} onClick={() => setView("list")} icon={<List className="h-3.5 w-3.5" />} label="List" />
        </div>
      </div>

      {data.epics.map((epic) => {
        const stories = epic.storyIds
          .map((id) => data.stories.find((s) => s.id === id))
          .filter((s): s is Story => s !== undefined)
          .sort(byPlanOrder);
        return (
          <div key={epic.id} className="rounded-xl border border-slate-200 bg-slate-50/60">
            <EpicHeader epic={epic} stories={stories} />
            {view === "board" ? (
              <div className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-4">
                {BOARD_COLUMNS.map((col) => {
                  const inCol = stories.filter((s) => boardColumn(s) === col.key);
                  return (
                    <div key={col.key} className="min-h-[90px] rounded-lg bg-slate-100/80 p-2">
                      <div className="mb-2 flex items-center justify-between px-1 text-[11px] font-bold uppercase tracking-wider text-slate-500" title={col.hint}>
                        {col.label} <span className="rounded-full bg-white px-1.5 text-slate-500">{inCol.length}</span>
                      </div>
                      <div className="space-y-2">
                        {inCol.map((s) => <StoryCard key={s.id} story={s} onOpen={openStory} />)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 bg-white">
                {stories.map((s) => {
                  const b = CODEGEN_BADGE[s.codegen.status];
                  return (
                    <li key={s.id}>
                      <button onClick={() => openStory(s.id)} className="flex w-full flex-wrap items-center gap-3 px-4 py-2 text-left text-xs hover:bg-slate-50">
                        <span className="font-mono font-semibold text-blue-700">{s.id}</span>
                        <span className="font-medium text-slate-800">{s.title}</span>
                        <span className="text-slate-400">{s.actor}</span>
                        <span className="ml-auto flex items-center gap-2">
                          <span className="text-slate-500">{s.acceptanceCriteria.length} ACs</span>
                          <Badge tone={b.tone}>{b.label}</Badge>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

function EpicHeader({ epic, stories }: { epic: Epic; stories: Story[] }) {
  const accepted = stories.filter(isStoryAccepted).length;
  const pct = stories.length ? Math.round((accepted / stories.length) * 100) : 0;
  return (
    <div className="flex flex-wrap items-start gap-3 border-b border-slate-200 bg-white px-4 py-3 rounded-t-xl">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="violet">EPIC</Badge>
          <span className="font-mono text-xs font-semibold text-slate-500">{epic.id}</span>
          <span className="text-sm font-bold text-slate-900">{epic.title}</span>
        </div>
        <p className="mt-1 text-xs text-slate-500">{epic.outcome}</p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {epic.brdRequirementIds.map((r) => <Badge key={r} tone={r.startsWith("RULE") ? "amber" : "blue"}>{r}</Badge>)}
        </div>
      </div>
      <div className="w-full sm:w-48">
        <div className="flex justify-between text-[11px] text-slate-500">
          <span>{accepted}/{stories.length} stories accepted</span>
          <span className="font-semibold">{pct}%</span>
        </div>
        <ProgressBar value={pct} className="mt-1 h-1.5" />
      </div>
    </div>
  );
}

function StoryCard({ story, onOpen }: { story: Story; onOpen: (id: string) => void }) {
  const b = CODEGEN_BADGE[story.codegen.status];
  const covered = story.acceptanceCriteria.filter((a) => a.covered).length;
  return (
    <button
      onClick={() => onOpen(story.id)}
      className="block w-full rounded-lg border border-slate-200 bg-white p-2.5 text-left shadow-sm transition hover:border-blue-300 hover:shadow"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] font-bold text-blue-700">{story.id}</span>
        <Badge tone={b.tone}>{b.label}</Badge>
      </div>
      <div className="mt-1 text-xs font-semibold leading-snug text-slate-800">{story.title}</div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1"><CheckSquare className="h-3 w-3" />{covered}/{story.acceptanceCriteria.length} ACs</span>
        <span>·</span>
        <span>{story.context}</span>
        {story.dependsOn.length > 0 && (<><span>·</span><span>after {story.dependsOn.join(", ")}</span></>)}
      </div>
    </button>
  );
}

function ViewButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-1 px-3 py-1 font-semibold ${active ? "bg-blue-50 text-blue-700" : "bg-white text-slate-600 hover:bg-slate-50"}`}>
      {icon} {label}
    </button>
  );
}
