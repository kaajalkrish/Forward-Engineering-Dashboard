// Tab catalogue. The grouped layout follows the reference dashboard; the tabs
// themselves are the COBOL → Java harness's own concepts.
import {
  Activity, Boxes, Bot, CheckCheck, Cpu, FileCode2, FileInput, FolderOpen, GitBranch,
  GitFork, Layers, LineChart, ListChecks, ListOrdered, MessageSquare,
  MessagesSquare, Network, Package, Scissors, Server, ShieldCheck,
  TriangleAlert, Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type TabGroupKey = "overview" | "delivery" | "architecture" | "agents" | "activity" | "system";

export interface TabDef {
  key: string;
  label: string;
  group: TabGroupKey;
  icon: LucideIcon;
  title: string; // panel heading
  subtitle: string;
}

export const TAB_GROUPS: { key: TabGroupKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "delivery", label: "Delivery" },
  { key: "architecture", label: "Architecture" },
  { key: "agents", label: "Agents & Skills" },
  { key: "activity", label: "Activity" },
  { key: "system", label: "System" },
];

export const TABS: TabDef[] = [
  // Overview
  { key: "pipeline", label: "Pipeline", group: "overview", icon: Package,
    title: "Pipeline — 4 phases, 13 stages, input → work → gate at each step",
    subtitle: "Understand → Design → Migrate → Implementation (stories). Weighting: stages 40% · stories 60%." },
  { key: "traceability", label: "Traceability", group: "overview", icon: GitBranch,
    title: "Traceability — COBOL → BRD → epic → story → Java → test",
    subtitle: "Every requirement and business rule followed from COBOL evidence to verified code." },
  { key: "quality", label: "Quality & Coverage", group: "overview", icon: ShieldCheck,
    title: "Quality & Coverage — judge, story gates, mvn verify, equivalence",
    subtitle: "Nothing moves on unless the gates are green and outputs match the COBOL oracle." },
  { key: "gates", label: "Gates & Approvals", group: "overview", icon: CheckCheck,
    title: "Gates & Approvals — every hard gate, attributed",
    subtitle: "Threshold, result and who approved it (RBAC-attributed)." },

  // Delivery
  { key: "backlog", label: "Backlog", group: "delivery", icon: Layers,
    title: "Backlog — epics and user stories",
    subtitle: "Generated from the BRD: epics first, then INVEST stories with acceptance criteria." },
  { key: "plan", label: "Story Plan", group: "delivery", icon: ListOrdered,
    title: "Story Plan — dependency-ordered build sequence",
    subtitle: "Acyclic story DAG; Build runs stories in this order." },
  { key: "build", label: "Build", group: "delivery", icon: Cpu,
    title: "Build — story-by-story codegen",
    subtitle: "Tests first (red) → implementation (green) → bounded repair → story quality gate." },
  { key: "code", label: "Generated Code", group: "delivery", icon: FileCode2,
    title: "Generated Code — what is actually in codegen_output",
    subtitle: "Read straight from the Maven module: files, tests, packages and what still needs work." },
  { key: "artifacts", label: "Artifacts", group: "delivery", icon: FolderOpen,
    title: "Artifacts — versioned outputs of every stage",
    subtitle: "Content-hashed, versioned per kind." },
  { key: "work-units", label: "Work Units", group: "delivery", icon: ListChecks,
    title: "Work Units — durable progress and cache",
    subtitle: "Every expensive LLM or verification unit: status, attempts, cost; cached units are reused." },

  // Architecture
  { key: "seams", label: "Seams", group: "architecture", icon: Scissors,
    title: "Seams — ranked strangler-fig candidates",
    subtitle: "0.25·business + 0.20·isolation + 0.20·testability + 0.20·data ownership − 0.15·risk (pure Cypher)." },
  { key: "domain", label: "Domain Design", group: "architecture", icon: Network,
    title: "Domain Design — bounded contexts",
    subtitle: "Business-capability contexts, data ownership and module-vs-microservice decision." },
  { key: "services", label: "Services", group: "architecture", icon: Server,
    title: "Services — technical design",
    subtitle: "Spring Boot services, API contracts and persistence patterns." },
  { key: "techstack", label: "Tech Stack", group: "architecture", icon: Boxes,
    title: "Tech Stack — mainframe → Java, and the harness in between",
    subtitle: "Legacy source, target platform and harness tooling." },

  // Agents & Skills
  { key: "roles", label: "Agent Roles", group: "agents", icon: Users,
    title: "Agent Roles — 11 roles, tiered by model",
    subtitle: "Haiku for breadth, Sonnet for synthesis, Opus for judging, design and repair." },
  { key: "build-loop", label: "Build Loop", group: "agents", icon: Bot,
    title: "Build Loop — the per-story pipeline",
    subtitle: "Deterministic by default; LLM steps switch on per env toggle." },

  // Activity
  { key: "timeline", label: "Timeline", group: "activity", icon: Activity,
    title: "Timeline — every step, live",
    subtitle: "Agent run events, newest first." },
  { key: "graphs", label: "Graphs", group: "activity", icon: LineChart,
    title: "Graphs — progress and spend over time",
    subtitle: "Stages passed, stories accepted and cost." },
  { key: "feedback", label: "Feedback", group: "activity", icon: MessageSquare,
    title: "Feedback loop — analyzed → actioned → re-reviewed → logged",
    subtitle: "Nothing applied without analysis, nothing dropped without a recorded reason." },
  { key: "failures", label: "Failures", group: "activity", icon: TriangleAlert,
    title: "Failures — what broke and how it was fixed",
    subtitle: "Stage failures, story failures, timed-out work units and defect tickets." },
  { key: "ask", label: "Ask", group: "activity", icon: MessagesSquare,
    title: "Ask the codebase — graph-grounded answers",
    subtitle: "Questions asked in Explore, with the graph nodes each answer cites." },

  // System
  { key: "inputs", label: "Inputs", group: "system", icon: FileInput,
    title: "Inputs — outcome, source estate and configuration",
    subtitle: "What the harness was given to work with." },
  { key: "state", label: "State", group: "system", icon: GitFork,
    title: "State — where the run is right now",
    subtitle: "Current stage and story, budget, tokens and agent runs." },
];

export const DEFAULT_TAB = "pipeline";
