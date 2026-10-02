import { useCallback, useEffect, useState } from "react";
import type { DashboardData } from "../types";

// dashboard-data.json is produced by scripts/import-codegen.mjs from real harness output.
// ?data=sample shows the illustrative sample instead.
const REAL_URL = "/data/dashboard-data.json";
const SAMPLE_URL = "/data/sample.json";

export type LoadState =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "ready"; data: DashboardData; loadedAt: Date; fellBackToSample: boolean };

async function fetchJson(url: string): Promise<DashboardData | null> {
  const res = await fetch(`${url}?t=${Date.now()}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status} loading ${url}`);
  return (await res.json()) as DashboardData;
}

/**
 * Loads the dashboard data. `refreshMs` re-fetches on an interval so the page
 * stays "live" when the file is regenerated from harness output.
 */
export function useDashboardData(refreshMs = 30_000) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const wantSample = new URLSearchParams(window.location.search).get("data") === "sample";

  const load = useCallback(async () => {
    try {
      let data = wantSample ? await fetchJson(SAMPLE_URL) : await fetchJson(REAL_URL);
      let fellBackToSample = false;
      if (!data && !wantSample) {
        data = await fetchJson(SAMPLE_URL);
        fellBackToSample = true;
      }
      if (!data) throw new Error("No dashboard data found. Run: node scripts/import-codegen.mjs");
      setState({ status: "ready", data, loadedAt: new Date(), fellBackToSample });
    } catch (e) {
      // Keep showing the last good data on a failed refresh.
      setState((prev) => (prev.status === "ready" ? prev : { status: "error", error: String(e) }));
    }
  }, [wantSample]);

  useEffect(() => {
    void load();
    if (refreshMs <= 0) return;
    const id = setInterval(() => void load(), refreshMs);
    return () => clearInterval(id);
  }, [load, refreshMs]);

  return { state, reload: load };
}
