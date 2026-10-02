// Derived numbers for the dashboard. Everything here is computed from the raw
// DashboardData so KPIs can never disagree with the records they summarise.
import type { CodegenStatus, DashboardData, Phase, Seam, Stage, Story, TraceThread } from "../types";

/** "unknown" = happened, but its recorded status is not in the provided output. */
export type DisplayStatus = "completed" | "in_progress" | "pending" | "blocked" | "unknown";

/** Mirrors codegen ACCEPTED_STORY_STATUSES: the build may move on past these. */
const ACCEPTED: ReadonlySet<CodegenStatus> = new Set(["passed", "generated-unverified", "skipped"]);

export const isStoryAccepted = (s: Story) => ACCEPTED.has(s.codegen.status);
/** Verified = tests actually ran green (harness status "passed"). */
export const isStoryVerified = (s: Story) => s.codegen.status === "passed";

export function stageDisplayStatus(s: Stage): DisplayStatus {
  switch (s.status) {
    case "passed": return "completed";
    case "running": return "in_progress";
    case "failed":
    case "blocked": return "blocked";
    case "unknown": return "unknown";
    default: return "pending";
  }
}

export function storyDisplayStatus(s: Story): DisplayStatus {
  if (isStoryAccepted(s)) return "completed";
  if (s.codegen.status === "running") return "in_progress";
  if (s.codegen.status === "failed") return "blocked";
  if (s.codegen.status === "unknown") return "unknown";
  return "pending";
}

export function phaseStages(d: DashboardData, phase: Phase): Stage[] {
  return phase.stageKeys
    .map((k) => d.stages.find((s) => s.key === k))
    .filter((s): s is Stage => s !== undefined);
}

export function phaseDisplayStatus(d: DashboardData, phase: Phase): DisplayStatus {
  if (phase.showsStories) return storiesDisplayStatus(d);
  // An optional stage nobody ran (Explore) does not hold a phase open.
  const stages = phaseStages(d, phase).filter((s) => !(s.optional && s.status === "pending"));
  if (stages.length > 0 && stages.every((s) => s.status === "passed")) return "completed";
  if (stages.some((s) => s.status === "failed" || s.status === "blocked")) return "blocked";
  // Every stage is either passed or not recorded: say exactly that, not "in progress".
  if (stages.every((s) => s.status === "passed" || s.status === "unknown")) return "unknown";
  // Work evidently started in this phase (a stage ran, even if its status was not recorded).
  if (stages.some((s) => s.status === "running" || s.status === "passed" || s.status === "unknown")) return "in_progress";
  return "pending";
}

/** The phase that contains the current stage. */
/** Status of the story set: done when every story is accepted, otherwise by what is known. */
export function storiesDisplayStatus(d: DashboardData): DisplayStatus {
  const s = d.stories;
  if (!s.length) return "pending";
  if (s.every(isStoryAccepted)) return "completed";
  if (s.some((x) => x.codegen.status === "failed")) return "blocked";
  if (s.some((x) => x.codegen.status === "running" || isStoryAccepted(x))) return "in_progress";
  if (s.every((x) => x.codegen.status === "unknown")) return "unknown";
  return "pending";
}

/** Pill label for a phase; "unknown" phases are a mix of confirmed and unrecorded stages. */
export const phaseLabel = (s: DisplayStatus, phase?: Phase) =>
  s === "unknown" ? (phase?.showsStories ? "not recorded" : "partly recorded") : undefined;

export function currentPhase(d: DashboardData): Phase | undefined {
  return d.phases.find((p) => p.stageKeys.includes(d.state.currentStage));
}

export function stageProgress(d: DashboardData): number {
  if (d.stages.length === 0) return 0;
  return d.stages.filter((s) => s.status === "passed").length / d.stages.length;
}

/** Story progress counts only stories verified by green tests, not merely generated or accepted. */
export function storyProgress(d: DashboardData): number {
  if (d.stories.length === 0) return 0;
  return d.stories.filter(isStoryVerified).length / d.stories.length;
}

/** Overall = stageWeight · stages passed + storyWeight · stories verified, 0..100. */
export function overallProgress(d: DashboardData): number {
  const { stageWeight, storyWeight } = d.weights;
  return Math.round((stageWeight * stageProgress(d) + storyWeight * storyProgress(d)) * 100);
}

export type ThreadState = "complete" | "in_progress" | "no_evidence" | "broken";

/**
 * complete    – COBOL → requirement → story → Java → test chain linked AND every story accepted by Build
 * in_progress – chain partially linked, or a story on it is not accepted yet
 * no_evidence – linked to stories, but cites no COBOL source (allowed by the harness, e.g. some NFRs)
 * broken      – no story, or points at an epic/story that does not exist
 */
export function threadState(t: TraceThread, d: DashboardData): ThreadState {
  const byId = new Map(d.stories.map((s) => [s.id, s]));
  const epicIds = new Set(d.epics.map((e) => e.id));
  const dangling = t.storyIds.some((id) => !byId.has(id)) || t.epicIds.some((id) => !epicIds.has(id));
  if (dangling || t.storyIds.length === 0) return "broken";
  if (t.cobolRefs.length === 0) return "no_evidence";
  const allAccepted = t.storyIds.every((id) => isStoryAccepted(byId.get(id)!));
  if (allAccepted && t.javaRefs.length > 0 && t.testRefs.length > 0) return "complete";
  return "in_progress";
}

export function gateDisplayStatus(status: "open" | "passed" | "failed", stageRunning = false): DisplayStatus {
  if (status === "passed") return "completed";
  if (status === "failed") return "blocked";
  return stageRunning ? "in_progress" : "pending";
}

/** Acceptance-criteria coverage across all stories (AC cited by a generated test). */
export function acCoverage(d: DashboardData): { covered: number; total: number } {
  const acs = d.stories.flatMap((s) => s.acceptanceCriteria);
  return { covered: acs.filter((a) => a.covered).length, total: acs.length };
}

/** Test totals: `ran` counts stories whose tests executed; the rest did not run. */
export function testTotals(d: DashboardData): { ran: number; passed: number; failed: number; notRun: number } {
  const executed = (s: Story) => s.codegen.testStatus === "ok" || s.codegen.testStatus === "tests-failed";
  return d.stories.reduce(
    (acc, s) =>
      executed(s)
        ? { ...acc, ran: acc.ran + s.codegen.tests.total, passed: acc.passed + s.codegen.tests.passed, failed: acc.failed + s.codegen.tests.failed }
        : { ...acc, notRun: acc.notRun + s.codegen.tests.total },
    { ran: 0, passed: 0, failed: 0, notRun: 0 },
  );
}

/** Seam weights from the harness design (queries.py / phase-4 plan). Risk subtracts. */
export const SEAM_WEIGHTS = { business: 0.25, isolation: 0.2, testability: 0.2, dataOwnership: 0.2, risk: -0.15 } as const;

export function seamScore(f: Seam["factors"]): number {
  return (
    SEAM_WEIGHTS.business * f.business +
    SEAM_WEIGHTS.isolation * f.isolation +
    SEAM_WEIGHTS.testability * f.testability +
    SEAM_WEIGHTS.dataOwnership * f.dataOwnership +
    SEAM_WEIGHTS.risk * f.risk
  );
}

export interface Kpis {
  overall: number;
  stagesPassed: number;
  stagesTotal: number;
  gatesPassed: number;
  gatesTotal: number;
  storiesAccepted: number;
  storiesVerified: number;
  storiesTotal: number;
  artifacts: number;
  approvals: number;
  lineageLinked: number;
  lineageTotal: number;
  brokenLinks: number;
}

export function computeKpis(d: DashboardData): Kpis {
  const states = d.traceability.map((t) => threadState(t, d));
  return {
    overall: overallProgress(d),
    stagesPassed: d.stages.filter((s) => s.status === "passed").length,
    stagesTotal: d.stages.length,
    gatesPassed: d.gates.filter((g) => g.status === "passed").length,
    gatesTotal: d.gates.length,
    storiesAccepted: d.stories.filter(isStoryAccepted).length,
    storiesVerified: d.stories.filter(isStoryVerified).length,
    storiesTotal: d.stories.length,
    artifacts: d.artifacts.length,
    approvals: d.gates.filter((g) => g.approval).length,
    lineageLinked: states.filter((s) => s === "complete" || s === "in_progress").length,
    lineageTotal: states.length,
    brokenLinks: states.filter((s) => s === "broken").length,
  };
}
