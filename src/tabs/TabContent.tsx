import type { DashboardData } from "../types";
import { NoData } from "../components/DataSourceBanner";
import { AskTab } from "./activity/AskTab";
import { FailuresTab } from "./activity/FailuresTab";
import { FeedbackTab } from "./activity/FeedbackTab";
import { GraphsTab } from "./activity/GraphsTab";
import { TimelineTab } from "./activity/TimelineTab";
import { BuildLoopTab } from "./agents/BuildLoopTab";
import { RolesTab } from "./agents/RolesTab";
import { DomainTab } from "./architecture/DomainTab";
import { SeamsTab } from "./architecture/SeamsTab";
import { ServicesTab } from "./architecture/ServicesTab";
import { TechStackTab } from "./architecture/TechStackTab";
import { ArtifactsTab } from "./delivery/ArtifactsTab";
import { BacklogTab } from "./delivery/BacklogTab";
import { BuildTab } from "./delivery/BuildTab";
import { CodeTab } from "./delivery/CodeTab";
import { StoryPlanTab } from "./delivery/StoryPlanTab";
import { WorkUnitsTab } from "./delivery/WorkUnitsTab";
import { GatesTab } from "./overview/GatesTab";
import { PipelineTab } from "./overview/PipelineTab";
import { QualityTab } from "./overview/QualityTab";
import { TraceabilityTab } from "./overview/TraceabilityTab";
import { InputsTab } from "./system/InputsTab";
import { StateTab } from "./system/StateTab";

export interface TabProps {
  data: DashboardData;
  navigate: (tab: string) => void;
  openStory: (id: string) => void;
}

/** Body for a tab; `null` means not built yet (TabPanel shows a placeholder). */
// Tabs whose data the imported output may not contain: [has data?, what, where it comes from].
const NEEDS: Record<string, (d: DashboardData) => [boolean, string, string]> = {
  "work-units": (d) => [d.workUnits.length > 0, "Work units", "the Postgres work_unit table"],
  seams: (d) => [d.seams.length > 0, "Seam candidates", "the Seams stage (Neo4j seam scoring)"],
  domain: (d) => [d.contexts.length > 0, "The domain design", "the :DomainDesign node in Neo4j"],
  timeline: (d) => [d.timeline.length > 0, "The event timeline", "the Postgres agent_run_event table"],
  graphs: (d) => [d.history.length > 0, "Progress history", "stage and story status history from Postgres"],
  feedback: (d) => [d.feedback.length > 0, "Judge and gate feedback", "the BRD judge report and gate results"],
  ask: (d) => [d.ask.length > 0, "Explore-stage questions", "the cockpit's Explore stage history"],
};

export function TabContent({ tab, ...p }: TabProps & { tab: string }) {
  const need = NEEDS[tab]?.(p.data);
  if (need && !need[0]) return <NoData what={need[1]} needs={need[2]} />;
  switch (tab) {
    case "pipeline": return <PipelineTab data={p.data} navigate={p.navigate} />;
    case "traceability": return <TraceabilityTab data={p.data} openStory={p.openStory} />;
    case "quality": return <QualityTab data={p.data} />;
    case "gates": return <GatesTab data={p.data} />;
    case "backlog": return <BacklogTab data={p.data} openStory={p.openStory} />;
    case "plan": return <StoryPlanTab data={p.data} openStory={p.openStory} />;
    case "build": return <BuildTab data={p.data} openStory={p.openStory} />;
    case "code": return <CodeTab data={p.data} openStory={p.openStory} />;
    case "artifacts": return <ArtifactsTab data={p.data} />;
    case "work-units": return <WorkUnitsTab data={p.data} />;
    case "seams": return <SeamsTab data={p.data} />;
    case "domain": return <DomainTab data={p.data} />;
    case "services": return <ServicesTab data={p.data} openStory={p.openStory} />;
    case "techstack": return <TechStackTab data={p.data} />;
    case "roles": return <RolesTab data={p.data} />;
    case "build-loop": return <BuildLoopTab data={p.data} openStory={p.openStory} />;
    case "timeline": return <TimelineTab data={p.data} />;
    case "graphs": return <GraphsTab data={p.data} />;
    case "feedback": return <FeedbackTab data={p.data} />;
    case "failures": return <FailuresTab data={p.data} openStory={p.openStory} />;
    case "ask": return <AskTab data={p.data} />;
    case "inputs": return <InputsTab data={p.data} />;
    case "state": return <StateTab data={p.data} openStory={p.openStory} />;
    default: return null;
  }
}
