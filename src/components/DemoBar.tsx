// Controls for the simulated Build run. Always says it is a demo.
import { FastForward, Pause, Play, RotateCcw } from "lucide-react";
import type { DashboardData } from "../types";
import type { BuildDemo } from "../lib/useBuildDemo";

export function DemoBar({ demo, data }: { demo: BuildDemo; data: DashboardData }) {
  if (!demo.total) return null;
  const stepLabel = data.buildSteps.find((s) => s.key === demo.currentStep)?.label;
  const pct = Math.round((demo.storiesDone / demo.total) * 100);
  const btn = "no-print inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold";

  if (demo.status === "idle") {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-xs text-violet-950">
        <span>
          <b>Implementation demo.</b> Simulate the Build stage working through these {demo.total} stories, one at a time through
          the harness's build loop. Nothing is run or saved; your real data stays as it is.
        </span>
        <button onClick={demo.start} className={`${btn} ml-auto bg-violet-600 text-white hover:bg-violet-700`}>
          <Play className="h-3.5 w-3.5" /> Run implementation demo
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-violet-400 bg-violet-50 px-4 py-3 text-xs text-violet-950">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-violet-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Demo · simulated</span>
        {demo.status === "done" ? (
          <b>Build finished in the simulation: {demo.total} / {demo.total} stories passed.</b>
        ) : (
          <span>
            <b>{demo.current?.id}</b> {demo.current?.title} · step <b>{stepLabel}</b>
            {demo.status === "paused" && <span className="ml-1 font-semibold">(paused)</span>}
          </span>
        )}
        <span className="ml-auto flex flex-wrap gap-2">
          {demo.status === "running" && (
            <button onClick={demo.pause} className={`${btn} bg-white text-violet-800 ring-1 ring-violet-300 hover:bg-violet-100`}>
              <Pause className="h-3.5 w-3.5" /> Pause
            </button>
          )}
          {demo.status === "paused" && (
            <button onClick={demo.resume} className={`${btn} bg-violet-600 text-white hover:bg-violet-700`}>
              <Play className="h-3.5 w-3.5" /> Resume
            </button>
          )}
          {demo.status !== "done" && (
            <button onClick={demo.toggleSpeed} className={`${btn} bg-white text-violet-800 ring-1 ring-violet-300 hover:bg-violet-100`}>
              <FastForward className="h-3.5 w-3.5" /> {demo.speed}× speed
            </button>
          )}
          {demo.status === "done" && (
            <button onClick={demo.start} className={`${btn} bg-violet-600 text-white hover:bg-violet-700`}>
              <Play className="h-3.5 w-3.5" /> Replay
            </button>
          )}
          <button onClick={demo.reset} className={`${btn} bg-white text-violet-800 ring-1 ring-violet-300 hover:bg-violet-100`}>
            <RotateCcw className="h-3.5 w-3.5" /> Back to real data
          </button>
        </span>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-violet-200">
          <div className="h-full rounded-full bg-violet-600 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="tabular-nums font-semibold">{demo.storiesDone} / {demo.total} stories</span>
      </div>
    </div>
  );
}
