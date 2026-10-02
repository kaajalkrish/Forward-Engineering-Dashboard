import type { ReactNode } from "react";
import { Card } from "../components/ui";
import type { TabDef } from "./registry";

/** Common frame for every tab: icon + heading + subtitle, then the tab body. */
export function TabPanel({ tab, children }: { tab: TabDef; children?: ReactNode }) {
  const Icon = tab.icon;
  return (
    <Card className="p-5">
      <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
        <Icon className="h-5 w-5 text-blue-600" />
        {tab.title}
      </h2>
      <p className="mt-1 text-sm text-slate-500">{tab.subtitle}</p>
      <div className="mt-4">
        {children ?? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Nothing to show for this tab yet.
          </div>
        )}
      </div>
    </Card>
  );
}
