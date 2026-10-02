// Simulated Build stage ("implementation demo"). Steps every story through the harness's
// per-story loop (codegen/story_runner.py) in plan order and returns a *display copy* of the
// data. Nothing is written anywhere; resetting returns the real data untouched.
import { useEffect, useMemo, useRef, useState } from "react";
import type { DashboardData, Story, StoryCodegen, TimelineEvent } from "../types";

export type DemoStatus = "idle" | "running" | "paused" | "done";

interface Frame {
  step: string;
  failedSteps?: string[];
  attempts: number;
  testStatus?: StoryCodegen["testStatus"];
  event?: { role: string; type: string; level: TimelineEvent["level"]; text: string };
}

/** The loop for one story. `withRepair` adds a failing GREEN run and one repair pass. */
function script(s: Story, withRepair: boolean): Frame[] {
  const n = Math.max(1, s.codegen.tests.total);
  const frames: Frame[] = [
    { step: "context", attempts: 1, event: { role: "system", type: "story", level: "info", text: `${s.id} started: context pack built from ${s.evidenceRefs.length} COBOL refs.` } },
    { step: "tests", attempts: 1 },
    { step: "red", attempts: 1, testStatus: "tests-failed" },
    { step: "impl", attempts: 1, testStatus: "tests-failed" },
  ];
  if (withRepair) {
    frames.push(
      { step: "green", attempts: 1, testStatus: "tests-failed", failedSteps: ["green"], event: { role: "codegen", type: "tool_call", level: "error", text: `${s.id} GREEN run: ${Math.max(1, n - 1)} of ${n} tests still failing.` } },
      { step: "repair", attempts: 2, testStatus: "tests-failed", failedSteps: ["green"], event: { role: "repair", type: "repair", level: "info", text: `${s.id} repair attempt 2: implementation regenerated from the failing log.` } },
      { step: "gate", attempts: 2, testStatus: "ok" },
    );
  } else {
    frames.push({ step: "green", attempts: 1, testStatus: "ok" }, { step: "gate", attempts: 1, testStatus: "ok" });
  }
  frames.push({ step: "persist", attempts: withRepair ? 2 : 1, testStatus: "ok" });
  return frames;
}

const passedCodegen = (s: Story, attempts: number): StoryCodegen => ({
  ...s.codegen,
  status: "passed",
  statusSource: "demo",
  currentStep: undefined,
  failedSteps: undefined,
  redStatus: "tests-failed",
  testStatus: "ok",
  attempts,
  tests: { total: Math.max(1, s.codegen.tests.total), passed: Math.max(1, s.codegen.tests.total), failed: 0 },
  qualityGate: {
    passed: true,
    score: 1,
    checks: {
      acceptance_criteria_covered: true, lineage_cited: true, test_result_acceptable: true, production_files_generated: true,
      package_scope_respected: true, expected_package_touched: true, behavior_signals_represented: true,
    },
    failures: [],
    warnings: [],
  },
  rationale: "Demo run: simulated result, not produced by the harness.",
});

export function useBuildDemo(real: DashboardData | null) {
  const [status, setStatus] = useState<DemoStatus>("idle");
  const [cursor, setCursor] = useState({ story: 0, frame: 0 });
  const [speed, setSpeed] = useState(1);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const seq = useRef(0);

  const order = useMemo(() => (real ? [...real.stories].sort((a, b) => a.planOrder - b.planOrder) : []), [real]);
  // One story in five needs a repair pass, so the loop's repair step is visible.
  const scripts = useMemo(() => order.map((s, i) => script(s, i % 5 === 4)), [order]);

  const push = (e: Omit<TimelineEvent, "id" | "ts" | "stage">) =>
    setEvents((prev) => [...prev, { ...e, id: `DEMO-${++seq.current}`, ts: new Date().toISOString(), stage: "build" }]);

  // Advance one frame per tick.
  useEffect(() => {
    if (status !== "running" || !order.length) return;
    const id = setTimeout(() => {
      const frames = scripts[cursor.story];
      const f = frames[cursor.frame];
      if (f?.event) push({ role: f.event.role, type: `demo_${f.event.type}`, level: f.event.level, summary: f.event.text });
      if (cursor.frame + 1 < frames.length) {
        setCursor({ story: cursor.story, frame: cursor.frame + 1 });
        return;
      }
      const s = order[cursor.story];
      push({ role: "codegen", type: "demo_story", level: "success", summary: `${s.id} passed: ${Math.max(1, s.codegen.tests.total)} / ${Math.max(1, s.codegen.tests.total)} tests green, quality gate 7 / 7.` });
      if (cursor.story + 1 < order.length) setCursor({ story: cursor.story + 1, frame: 0 });
      else {
        push({ role: "system", type: "demo_stage", level: "success", summary: `Build finished: ${order.length} / ${order.length} stories passed (simulated).` });
        setCursor({ story: order.length, frame: 0 });
        setStatus("done");
      }
    }, 420 / speed);
    return () => clearTimeout(id);
  }, [status, cursor, speed, order, scripts]);

  const start = () => {
    seq.current = 0;
    setEvents([]);
    setCursor({ story: 0, frame: 0 });
    setStatus("running");
    push({ role: "system", type: "demo_stage", level: "info", summary: `Build started (simulated): ${order.length} stories in plan order.` });
  };
  // ?demo=1 starts the demo as soon as data is loaded (handy for presenting).
  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoStarted.current || !order.length) return;
    if (new URLSearchParams(window.location.search).get("demo") === "1") {
      autoStarted.current = true;
      start();
    }
  });

  const reset = () => {
    setStatus("idle");
    setCursor({ story: 0, frame: 0 });
    setEvents([]);
  };

  const data = useMemo<DashboardData | null>(() => {
    if (!real || status === "idle") return real;
    const stories = real.stories.map((s) => {
      const i = order.findIndex((o) => o.id === s.id);
      if (i < cursor.story) return { ...s, codegen: passedCodegen(s, scripts[i].at(-1)!.attempts) };
      if (i === cursor.story && status !== "done") {
        const f = scripts[i][cursor.frame];
        return {
          ...s,
          codegen: {
            ...s.codegen,
            status: "running" as const,
            statusSource: "demo" as const,
            currentStep: f.step,
            failedSteps: f.failedSteps,
            attempts: f.attempts,
            redStatus: cursor.frame >= 2 ? ("tests-failed" as const) : undefined,
            testStatus: f.testStatus,
            qualityGate: undefined,
            rationale: "Demo run: simulated, not produced by the harness.",
          },
        };
      }
      return {
        ...s,
        codegen: { ...s.codegen, status: "pending" as const, statusSource: "demo" as const, currentStep: undefined, failedSteps: undefined, qualityGate: undefined, testStatus: undefined, rationale: "Demo run: waiting in the plan." },
      };
    });
    const done = status === "done";
    return {
      ...real,
      stories,
      stages: real.stages.map((st) =>
        st.key === "build" ? { ...st, status: done ? "passed" : "running", note: "demo: simulated Build run" } : st,
      ),
      gates: real.gates.map((g) => (g.key === "code" && done ? { ...g, status: "passed", result: `Demo: ${order.length} / ${order.length} stories passed (simulated)` } : g)),
      timeline: [...real.timeline, ...events],
      state: { ...real.state, currentStage: "build", currentStoryId: done ? undefined : order[cursor.story]?.id },
    };
  }, [real, status, cursor, order, scripts, events]);

  const current = status === "running" || status === "paused" ? order[cursor.story] : undefined;
  const currentStep = current ? scripts[cursor.story][cursor.frame]?.step : undefined;

  return {
    data,
    status,
    speed,
    storiesDone: Math.min(cursor.story, order.length),
    total: order.length,
    current,
    currentStep,
    start,
    pause: () => setStatus("paused"),
    resume: () => setStatus("running"),
    reset,
    toggleSpeed: () => setSpeed((v) => (v === 1 ? 4 : 1)),
  };
}

export type BuildDemo = ReturnType<typeof useBuildDemo>;
