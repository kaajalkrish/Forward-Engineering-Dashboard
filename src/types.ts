// Data contract for the Forward Engineering Dashboard.
//
// Everything the dashboard renders comes from ONE JSON document of type
// `DashboardData` (public/data/dashboard-data.json). The shape follows the
// COBOL → Java harness itself, so real output converts field-for-field:
//
//   phases / stages / gates  → controlplane/stages.py + web/src/lib/stages.ts,
//                              persistence tables journey_stage / gate / approval
//   agentRoles               → cost/tiering.py (11 roles, Haiku/Sonnet/Opus tiers)
//   artifacts                → persistence table `artifact` (kind + version)
//   epics / stories          → backlog/schema.py (Epic, UserStory, AcceptanceCriterion)
//   story.codegen            → codegen/story_runner.py StoryRunResult +
//                              codegen/story_quality.py StoryQualityGate
//   seams                    → queries.py seam candidates + weighted score
//   domain / services        → domain/schema.py + technical_design/schema.py
//   workUnits                → persistence table `work_unit`
//   timeline                 → persistence table `agent_run_event`
//   failures                 → `defect_ticket` + failed work units / stories
//
// Derived numbers (KPIs, percentages) are computed in lib/metrics.ts, never stored.

export type PhaseKey = "understand" | "design" | "migrate" | "implementation";

/** journey_stage.status */
/** "unknown" = the stage evidently ran, but its recorded status is not in the provided output. */
export type StageStatus = "pending" | "running" | "blocked" | "passed" | "failed" | "unknown";

/** gate.status */
export type GateStatus = "open" | "passed" | "failed";

/** codegen/story_plan.py StoryCodegenStatus, plus "running" while a story is in the loop. */
/** "unknown" = code was generated, but the harness's recorded status (Postgres story_codegen_status) is not in the output. */
export type CodegenStatus = "pending" | "running" | "passed" | "generated-unverified" | "failed" | "skipped" | "unknown";

/** codegen/test_runner.py StoryTestStatus */
export type TestStatus = "ok" | "tests-failed" | "no-tests-run" | "compile-failed" | "toolchain-unavailable" | "error";

export type ModelTier = "haiku" | "sonnet" | "opus";

export interface Meta {
  harnessName: string;
  harnessTagline: string;
  workspace: string;
  repoSlug: string;
  sourceRepo: string;
  timezone: string;
  graphSnapshot: string;
  brdPath: string; // brd_output/brd/<slug>/v<N>.html
  codePath: string; // codegen_output/<module>
  basePackage: string; // com.cobolmodernizer.<leaf>; story file paths are relative to it
  generatedAt: string;
  updatedAt: string;
  dataSource: DataSource;
}

/** Where this document came from and what it does NOT contain. */
export interface DataSource {
  mode: "sample" | "codegen_output";
  importedAt?: string;
  modulePath?: string;
  real: string[]; // human-readable list of sections backed by real output
  missing: { section: string; needs: string }[];
}

/** Overall progress = stageWeight · stages passed + storyWeight · stories accepted. */
export interface ProgressWeights {
  stageWeight: number;
  storyWeight: number;
}

export interface Phase {
  key: PhaseKey;
  label: string;
  summary: string;
  stageKeys: string[];
  /** Phase card lists the user stories instead of stages (Implementation). */
  showsStories?: boolean;
}

export interface Stage {
  key: string;
  label: string;
  phase: PhaseKey;
  ordinal: number;
  status: StageStatus;
  gateKey: string | null;
  mode: "deterministic" | "llm";
  roles: string[]; // agent roles used by this stage
  input: string;
  work: string;
  output: string;
  updatedAt?: string;
  note?: string; // e.g. how the status was inferred
  optional?: boolean; // nothing downstream needs it (Explore); ignored for phase status
}

export interface Approval {
  decision: "approved" | "rejected";
  approverEmail: string;
  approverRole: string;
  riskAccepted: boolean;
  rationale: string;
  decidedAt: string;
}

export interface Gate {
  key: string;
  stageKey: string;
  label: string;
  status: GateStatus;
  threshold: string;
  result: string;
  updatedAt?: string;
  approval?: Approval;
}

export interface AgentRole {
  role: string; // tiering role key, e.g. "codegen"
  label: string;
  tier: ModelTier;
  model: string;
  envVar: string;
  stages: string[];
  description: string;
  runs: number | null; // null = not recorded in the provided output
  costUsd: number | null;
  tokens: number | null;
}

/** One step of the per-story build loop (codegen/story_runner.py). */
export interface BuildStep {
  key: string;
  label: string;
  module: string;
  mode: "deterministic" | "llm" | "toolchain";
  toggle?: string; // env var that switches it to LLM
  description: string;
}

export interface Artifact {
  id: string;
  kind: string; // artifact.kind
  label: string;
  version: number;
  stageKey: string;
  objectUri: string;
  contentHash: string;
  createdAt: string;
  summary: string;
}

export interface Epic {
  id: string;
  title: string;
  outcome: string;
  brdRequirementIds: string[];
  storyIds: string[];
}

export interface AcceptanceCriterion {
  id: string;
  statement: string;
  covered: boolean; // cited by a generated test
}

export interface StoryQualityGate {
  passed: boolean | null; // null = not recorded (some checks need harness context not in the output)
  score: number; // 0..1
  checks: Record<string, boolean>;
  failures: string[];
  warnings: string[];
}

export interface StoryCodegen {
  status: CodegenStatus;
  statusSource?: "harness" | "derived" | "demo"; // derived = worked out from the files; demo = simulated run
  generationMode?: string; // e.g. "deterministic fast path (STORY_LLM_IMPL=0)"
  behaviorSignals?: string[];
  redStatus?: TestStatus; // pre-implementation baseline (should be red)
  testStatus?: TestStatus; // after implementation / repair
  attempts: number;
  /** While running: the build step in progress, plus steps already marked failed (e.g. a red GREEN run before repair). */
  currentStep?: string;
  failedSteps?: string[];
  tests: { total: number; passed: number; failed: number };
  changedFiles: string[];
  wallTimeS: number;
  costUsd: number;
  qualityGate?: StoryQualityGate;
  rationale?: string;
}

export interface Story {
  id: string;
  epicId: string;
  title: string;
  actor: string;
  narrative: string;
  brdRequirementIds: string[];
  acceptanceCriteria: AcceptanceCriterion[];
  dependsOn: string[];
  seamRefs: string[];
  evidenceRefs: string[]; // COBOL qualified names, e.g. "CBTRN02C:2000-POST-TRANSACTION"
  context: string; // bounded context
  service: string;
  planOrder: number; // position in the dependency-ordered story plan
  codegen: StoryCodegen;
}

export interface Seam {
  program: string;
  kind: "reader" | "writer" | "batch";
  score: number;
  factors: { business: number; isolation: number; testability: number; dataOwnership: number; risk: number };
  fanIn: number;
  fanOut: number;
  reads: string[];
  writes: string[];
  rationale: string;
}

export interface BoundedContext {
  name: string;
  capability: string;
  memberPrograms: string[];
  ownedResources: string[];
  deployment: "module" | "microservice";
  topologyScore: number;
  extractionRank: number;
  dependsOn: { target: string; style: "sync" | "async" }[];
  rationale: string;
}

export interface Service {
  name: string;
  boundedContext: string;
  deployment: "module" | "microservice";
  storyIds: string[];
  apis: { method: string; path: string; name: string }[];
  persistence: { resource: string; accessPattern: "legacy-mimic" | "repository" | "event-sourced" | "read-replica" | "unknown" }[];
}

/** A BRD requirement or business rule and the chain that implements it. */
export interface TraceThread {
  id: string;
  kind: "requirement" | "rule";
  title: string;
  cobolRefs: string[];
  epicIds: string[];
  storyIds: string[];
  javaRefs: string[];
  testRefs: string[];
}

/** agent/brd_judge.py JudgeReport: 1–5 per dimension, weighted, rated high/medium/low. */
export interface BrdJudge {
  version: number;
  weighted: number; // 1..5
  rating: "high" | "medium" | "low";
  minWeighted: number; // gate threshold, 4.2
  dimensionFloor: number; // every dimension must reach this, 3
  ungroundedRefs: number; // evidence refs not found in the code graph
  dimensions: { dimension: string; score: number; weight: number; rationale: string }[];
}

export interface Quality {
  brdJudge: BrdJudge | null; // null = no BRD in the provided output
  build: {
    // codegen/quality_gate.py QualityReport, in gate order
    gates: { key: string; label: string; status: "passed" | "failed" | "pending"; detail: string }[];
  };
  equivalence: {
    verdict: "pass" | "fail" | "pending";
    recordsCompared: number;
    mismatches: number;
    tolerated: number;
    tolerances: string[];
  };
}

export interface WorkUnit {
  id: string;
  stage: string;
  unitType: string;
  unitKey: string;
  status: "pending" | "running" | "succeeded" | "cached" | "failed" | "deferred";
  attempt: number;
  model?: string;
  costUsd: number;
  startedAt?: string;
  finishedAt?: string;
  errorCause?: string;
}

export interface TechItem {
  name: string;
  version?: string;
  purpose: string;
}

export interface TechStack {
  source: TechItem[];
  target: TechItem[];
  harness: TechItem[];
  mappings: { legacy: string; modern: string; note: string }[];
}

export interface TimelineEvent {
  id: string;
  ts: string;
  stage: string;
  role: string; // agent role or "system" / "user"
  type: string; // agent_run_event.type
  summary: string;
  level: "info" | "success" | "warning" | "error";
}

export type FeedbackStep = "analyzed" | "actioned" | "re_reviewed" | "logged";

/** BRD-judge / gate feedback and what the harness did with it. */
export interface FeedbackItem {
  id: string;
  at: string;
  source: string;
  target: string;
  dimension?: string;
  severity: "low" | "medium" | "high";
  suggestion: string;
  analysis: string;
  step: FeedbackStep;
  decision: "applied" | "dropped" | "open";
  reason?: string;
}

export interface Failure {
  id: string;
  at: string;
  source: "defect_ticket" | "story" | "work_unit" | "stage" | "code_check";
  stage: string;
  ref: string; // story id, work unit key or graph qname
  reason: string;
  severity: "low" | "medium" | "high";
  status: "open" | "resolved";
  resolution?: string;
}

/** Explore stage: "Ask the codebase", grounded in the graph. */
export interface AskExchange {
  id: string;
  at: string;
  question: string;
  answer: string;
  citations: string[];
}

export interface Inputs {
  outcome: { statement: string; drivers: string[] } | null;
  sourceRepo: string;
  counts: { programs: number; copybooks: number; bmsCopybooks: number; bmsMaps: number; jcl: number; cicsPrograms: number; cobolLines: number };
  graph: { nodes: number; edges: number; paragraphs: number; dataItems: number; parseErrors: number } | null;
  config: Record<string, string>;
}

export interface AgentRun {
  id: string;
  role: string;
  stage: string;
  model: string;
  status: "running" | "succeeded" | "failed";
  startedAt: string;
  finishedAt?: string;
  tokens: number;
  costUsd: number;
}

export interface RunState {
  currentStage: string;
  currentStoryId?: string;
  budget: { workspaceCapUsd: number; runCapUsd: number; spentUsd: number | null; killed: boolean };
  tokens: { input: number; output: number; cacheRead: number; cacheCreation: number } | null;
  agentRuns: AgentRun[];
}

export interface HistoryPoint {
  date: string;
  stagesPassed: number;
  storiesAccepted: number;
  costUsd: number;
}

/** Static analysis of the generated Maven module (codegen_output). */
export interface CodeAnalysis {
  modulePath: string;
  basePackage: string;
  springBoot?: string;
  java?: string;
  qualityPlugins: { name: string; version?: string }[];
  counts: {
    mainFiles: number;
    testFiles: number;
    filesWithTodo: number;
    stubbedServices: number;
    controllers: number;
    entities: number;
    endpoints: number;
  };
  packages: {
    name: string;
    kind: "story-service" | "program-scaffold";
    storyIds: string[];
    files: number;
    controllers: number;
    entities: string[];
    filesWithTodo: number;
  }[];
  tests: {
    storyId: string;
    file: string;
    declaredPackage: string;
    expectedPackage: string;
    packageOk: boolean;
    testMethods: number;
    assertions: number;
    trivialAssertions: number;
    behaviorSignals: Record<string, number>;
    compileProblems: string[];
  }[];
  compiledBy: "maven" | "ide" | "unknown";
  findings: { severity: "high" | "medium" | "low"; title: string; detail: string; where?: string }[];
}

export interface DashboardData {
  meta: Meta;
  weights: ProgressWeights;
  phases: Phase[];
  stages: Stage[];
  gates: Gate[];
  agentRoles: AgentRole[];
  buildSteps: BuildStep[];
  artifacts: Artifact[];
  epics: Epic[];
  stories: Story[];
  seams: Seam[];
  contexts: BoundedContext[];
  services: Service[];
  traceability: TraceThread[];
  quality: Quality;
  workUnits: WorkUnit[];
  techStack: TechStack;
  timeline: TimelineEvent[];
  feedback: FeedbackItem[];
  failures: Failure[];
  ask: AskExchange[];
  inputs: Inputs;
  state: RunState;
  history: HistoryPoint[];
  code?: CodeAnalysis;
}
