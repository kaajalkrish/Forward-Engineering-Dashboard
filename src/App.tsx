import { useCallback, useEffect, useState } from "react";
import { DataSourceBanner } from "./components/DataSourceBanner";
import { DemoBar } from "./components/DemoBar";
import { HeaderBar } from "./components/HeaderBar";
import { StoryDrawer } from "./components/StoryDrawer";
import { KpiTiles, StatusCard } from "./components/KpiTiles";
import { Sidebar } from "./components/Sidebar";
import { TabBar } from "./components/TabBar";
import { computeKpis, currentPhase } from "./lib/metrics";
import { useBuildDemo } from "./lib/useBuildDemo";
import { useDashboardData } from "./lib/useDashboardData";
import { DEFAULT_TAB, TABS } from "./tabs/registry";
import { TabContent } from "./tabs/TabContent";
import { TabPanel } from "./tabs/TabPanel";

/** Active tab lives in the URL hash (#timeline) so views can be linked and survive refresh. */
function useHashTab(): [string, (key: string) => void] {
  const read = () => {
    const h = window.location.hash.slice(1);
    return TABS.some((t) => t.key === h) ? h : DEFAULT_TAB;
  };
  const [tab, setTab] = useState(read);
  useEffect(() => {
    const onHash = () => setTab(read());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return [tab, (key) => { window.location.hash = key; }];
}

/** Re-renders every 10s so "updated Xs ago" keeps ticking. */
function useNow(intervalMs = 10_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export default function App() {
  const { state } = useDashboardData();
  // Simulated Build run; returns a display copy of the data while active.
  const demo = useBuildDemo(state.status === "ready" ? state.data : null);
  const [activeTab, setActiveTab] = useHashTab();
  // ?story=STORY-005 opens a story directly (shareable link).
  const [storyId, setStoryId] = useState<string | null>(() => new URLSearchParams(window.location.search).get("story"));
  const closeStory = useCallback(() => setStoryId(null), []);
  const now = useNow();

  if (state.status === "loading") return <Message>Loading dashboard data…</Message>;
  if (state.status === "error") return <Message>Could not load dashboard data: {state.error}</Message>;

  const data = demo.data ?? state.data;
  const kpis = computeKpis(data);
  const phase = currentPhase(data);
  const phaseIndex = phase ? data.phases.indexOf(phase) + 1 : 0;
  const tab = TABS.find((t) => t.key === activeTab) ?? TABS[0];

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar data={data} overall={kpis.overall} openStory={setStoryId} />
      <main className="min-w-0 flex-1 space-y-4 px-4 py-5 lg:px-6">
        <HeaderBar data={data} now={now} />
        <DataSourceBanner data={data} fellBackToSample={state.fellBackToSample} />
        <DemoBar demo={demo} data={data} />
        <KpiTiles kpis={kpis} />
        <StatusCard data={data} phase={phase} phaseIndex={phaseIndex} />
        <TabBar active={tab.key} onSelect={setActiveTab} />
        <TabPanel tab={tab}>
          <TabContent tab={tab.key} data={data} navigate={setActiveTab} openStory={setStoryId} />
        </TabPanel>
      </main>
      <StoryDrawer data={data} storyId={storyId} onClose={closeStory} onOpenStory={setStoryId} />
    </div>
  );
}

function Message({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6 text-sm text-slate-600">{children}</div>
  );
}
