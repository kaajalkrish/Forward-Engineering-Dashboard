// Story-level helpers: dependency levels for the plan view and the state of each
// build-loop step (codegen/story_runner.py lifecycle) for one story.
import type { CodegenStatus, Story } from "../types";

/** Dependency depth: 0 for stories with no dependencies, else 1 + deepest dependency. */
export function storyLevels(stories: Story[]): Map<string, number> {
  const byId = new Map(stories.map((s) => [s.id, s]));
  const memo = new Map<string, number>();
  const visit = (id: string, stack: Set<string>): number => {
    if (memo.has(id)) return memo.get(id)!;
    if (stack.has(id)) return 0; // cycle guard: the stories_dag gate should prevent this
    stack.add(id);
    const s = byId.get(id);
    const lvl = s && s.dependsOn.length ? 1 + Math.max(...s.dependsOn.map((d) => visit(d, stack))) : 0;
    stack.delete(id);
    memo.set(id, lvl);
    return lvl;
  };
  stories.forEach((s) => visit(s.id, new Set()));
  return memo;
}

export const byPlanOrder = (a: Story, b: Story) => a.planOrder - b.planOrder;

export type StepState = "done" | "active" | "failed" | "skipped" | "todo" | "unknown";

/** State of each build-loop step (keys match DashboardData.buildSteps) for one story. */
export function buildStepStates(s: Story): Record<string, StepState> {
  const all = (st: StepState) =>
    ({ context: st, tests: st, red: st, impl: st, green: st, repair: st, gate: st, persist: st });
  const c = s.codegen;
  if (c.statusSource === "derived") {
    // Only what the files prove: tests and an implementation patch exist; the gate is our own check.
    return {
      ...all("unknown"),
      tests: c.tests.total > 0 ? "done" : "unknown",
      impl: c.changedFiles.some((f) => !/Test\.java$/.test(f)) ? "done" : "unknown",
      gate: c.qualityGate && c.qualityGate.passed !== null ? (c.qualityGate.passed ? "done" : "failed") : "unknown",
    };
  }
  switch (c.status) {
    case "pending":
      return all("todo");
    case "skipped":
      return all("skipped");
    case "passed":
      return { ...all("done"), repair: c.attempts > 1 ? "done" : "skipped" };
    case "generated-unverified":
      return { ...all("done"), red: "skipped", green: "skipped", repair: "skipped" };
    case "running":
      if (c.currentStep) {
        // Exact position in the loop: earlier steps done (or failed), current active, later todo.
        const order = ["context", "tests", "red", "impl", "green", "repair", "gate", "persist"];
        const at = order.indexOf(c.currentStep);
        return Object.fromEntries(
          order.map((k, i) => [
            k,
            c.failedSteps?.includes(k) ? "failed" : i < at ? (k === "repair" && c.attempts <= 1 ? "skipped" : "done") : i === at ? "active" : "todo",
          ]),
        ) as Record<string, StepState>;
      }
      return {
        context: "done", tests: "done", red: "done", impl: "done",
        green: c.testStatus && c.testStatus !== "ok" ? "failed" : "active",
        repair: c.testStatus && c.testStatus !== "ok" ? "active" : "todo",
        gate: "todo", persist: "todo",
      };
    case "failed":
      return { ...all("done"), green: "failed", repair: "failed", gate: "failed" };
    case "unknown":
      return all("unknown");
  }
}

type Tone = "slate" | "blue" | "green" | "amber" | "red";

export const CODEGEN_BADGE: Record<CodegenStatus, { tone: Tone; label: string }> = {
  pending: { tone: "slate", label: "pending" },
  running: { tone: "blue", label: "running" },
  passed: { tone: "green", label: "passed" },
  "generated-unverified": { tone: "amber", label: "generated-unverified" },
  failed: { tone: "red", label: "failed" },
  skipped: { tone: "slate", label: "skipped" },
  unknown: { tone: "slate", label: "status not recorded" },
};

/** Jira-style board column for a story. */
export type BoardColumn = "todo" | "in_progress" | "review" | "done";

export const BOARD_COLUMNS: { key: BoardColumn; label: string; hint: string }[] = [
  { key: "todo", label: "To do", hint: "pending in the story plan" },
  { key: "in_progress", label: "In progress", hint: "in the build loop" },
  { key: "review", label: "Needs verification", hint: "generated-unverified or failed" },
  { key: "done", label: "Done", hint: "passed with tests green" },
];

export function boardColumn(s: Story): BoardColumn {
  switch (s.codegen.status) {
    case "passed": return "done";
    case "running": return "in_progress";
    case "generated-unverified":
    case "unknown":
    case "failed": return "review";
    default: return "todo";
  }
}
