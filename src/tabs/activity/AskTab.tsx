import { Bot, Link2, User } from "lucide-react";
import type { DashboardData } from "../../types";
import { formatShort } from "../../lib/format";
import { Code } from "../../components/ui";

export function AskTab({ data }: { data: DashboardData }) {
  const role = data.agentRoles.find((r) => r.role === "ask");
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Read-only history of the Explore stage's questions. Answers come from the <b>{role?.label ?? "ask"}</b> role
        ({role?.model ?? "Haiku"}) using read-only graph queries; every answer lists the graph nodes it relied on.
      </p>
      <ul className="space-y-4">
        {[...data.ask].sort((a, b) => a.at.localeCompare(b.at)).map((q) => (
          <li key={q.id} className="space-y-2">
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-blue-600 px-3.5 py-2 text-sm text-white">
                <div className="mb-0.5 flex items-center gap-1 text-[10px] text-blue-100">
                  <User className="h-3 w-3" /> {formatShort(q.at, data.meta.timezone)}
                </div>
                {q.question}
              </div>
            </div>
            <div className="flex">
              <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800">
                <div className="mb-0.5 flex items-center gap-1 text-[10px] text-slate-400">
                  <Bot className="h-3 w-3" /> graph-grounded answer
                </div>
                {q.answer}
                <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-slate-100 pt-2">
                  <Link2 className="h-3 w-3 text-slate-400" />
                  {q.citations.map((c) => <Code key={c}>{c}</Code>)}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
