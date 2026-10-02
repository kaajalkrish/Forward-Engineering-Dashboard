// Small dependency-free SVG charts. Follows the dataviz method: one y-axis,
// 2px lines, recessive grid, legend + direct end labels, crosshair tooltip,
// and a table view so no value is reachable only by hover.
import { useEffect, useMemo, useRef, useState } from "react";

// Validated categorical slots (light surface): blue, orange.
export const SERIES_COLORS = ["#2a78d6", "#eb6834"] as const;

export interface LineSeries {
  name: string;
  color: string;
  values: number[]; // one per x point
}

const M = { top: 12, right: 64, bottom: 26, left: 44 };

/** Track an element's width so the SVG renders 1:1 (text stays at its real size). */
function useWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null);
  const [w, setW] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

export function LineChart({
  dates, series, yMax, yFormat = (v) => `${v}`, height = 220, reference,
}: {
  dates: string[]; // ISO dates, ascending
  series: LineSeries[];
  yMax: number;
  yFormat?: (v: number) => string;
  height?: number;
  reference?: { value: number; label: string };
}) {
  const [wrap, W] = useWidth<HTMLDivElement>(560);
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const H = height;
  const iw = W - M.left - M.right;
  const ih = H - M.top - M.bottom;

  const t = useMemo(() => dates.map((d) => new Date(d).getTime()), [dates]);
  const t0 = t[0], t1 = t[t.length - 1] || t0 + 1;
  const x = (i: number) => M.left + ((t[i] - t0) / (t1 - t0 || 1)) * iw;
  const y = (v: number) => M.top + ih - (v / (yMax || 1)) * ih;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * yMax);
  const fmtDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * iw;
    let best = 0;
    t.forEach((_, i) => { if (Math.abs(x(i) - M.left - px) < Math.abs(x(best) - M.left - px)) best = i; });
    setHover(best);
  };

  if (dates.length === 0 || series.length === 0) {
    return <div ref={wrap} className="py-8 text-center text-xs italic text-slate-400">No history recorded yet.</div>;
  }

  return (
    <div ref={wrap} className="relative">
      <div className="mb-2 flex flex-wrap items-center gap-3 text-xs text-slate-600">
        {series.length > 1 &&
          series.map((s) => (
            <span key={s.name} className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded" style={{ background: s.color }} /> {s.name}
            </span>
          ))}
        <button onClick={() => setShowTable((v) => !v)} className="no-print ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50">
          {showTable ? "Chart" : "Table"}
        </button>
      </div>

      {showTable ? (
        <table className="w-full text-left text-xs">
          <thead className="text-[11px] uppercase tracking-wider text-slate-500">
            <tr><th className="py-1">Date</th>{series.map((s) => <th key={s.name} className="py-1 text-right">{s.name}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100 tabular-nums">
            {dates.map((d, i) => (
              <tr key={d}><td className="py-1">{fmtDate(d)}</td>{series.map((s) => <td key={s.name} className="py-1 text-right">{yFormat(s.values[i])}</td>)}</tr>
            ))}
          </tbody>
        </table>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block" role="img" aria-label={series.map((s) => s.name).join(", ")}>
          {ticks.map((v) => (
            <g key={v}>
              <line x1={M.left} x2={M.left + iw} y1={y(v)} y2={y(v)} className="stroke-slate-100" />
              <text x={M.left - 6} y={y(v) + 3} textAnchor="end" className="fill-slate-400 text-[11px]">{yFormat(v)}</text>
            </g>
          ))}
          {[0, Math.floor((dates.length - 1) / 2), dates.length - 1].map((i) => (
            <text key={i} x={x(i)} y={H - 6} textAnchor="middle" className="fill-slate-400 text-[11px]">{fmtDate(dates[i])}</text>
          ))}
          {reference && (
            <g>
              <line x1={M.left} x2={M.left + iw} y1={y(reference.value)} y2={y(reference.value)} className="stroke-slate-400" strokeDasharray="4 4" />
              <text x={M.left + iw} y={y(reference.value) - 4} textAnchor="end" className="fill-slate-500 text-[11px]">{reference.label}</text>
            </g>
          )}
          {series.map((s) => (
            <g key={s.name}>
              <polyline fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />
              {/* direct end label, in text ink with a colored marker beside it */}
              <circle cx={x(s.values.length - 1)} cy={y(s.values[s.values.length - 1])} r={4} fill={s.color} stroke="white" strokeWidth={2} />
              <text x={x(s.values.length - 1) + 8} y={y(s.values[s.values.length - 1]) + 3} className="fill-slate-700 text-[11px] font-semibold">
                {yFormat(s.values[s.values.length - 1])}
              </text>
            </g>
          ))}
          {hover !== null && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y1={M.top} y2={M.top + ih} className="stroke-slate-300" />
              {series.map((s) => <circle key={s.name} cx={x(hover)} cy={y(s.values[hover])} r={4} fill={s.color} stroke="white" strokeWidth={2} />)}
            </g>
          )}
          <rect x={M.left} y={M.top} width={iw} height={ih} fill="transparent" onPointerMove={onMove} onPointerLeave={() => setHover(null)} />
        </svg>
      )}

      {!showTable && hover !== null && (
        <div
          className="pointer-events-none absolute top-8 z-10 min-w-[140px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"
          style={{ left: `min(calc(${(x(hover) / W) * 100}% + 12px), calc(100% - 160px))` }}
        >
          <div className="mb-1 text-[11px] text-slate-500">{fmtDate(dates[hover])}</div>
          {series.map((s) => (
            <div key={s.name} className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              <b className="tabular-nums text-slate-900">{yFormat(s.values[hover])}</b>
              <span className="text-slate-500">{s.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Horizontal bars for one measure across categories (single hue). */
export function BarList({ rows, format = (v) => `${v}`, color = SERIES_COLORS[0] }: {
  rows: { label: string; value: number; hint?: string }[];
  format?: (v: number) => string;
  color?: string;
}) {
  const max = Math.max(...rows.map((r) => r.value), 0) || 1;
  return (
    <ul className="space-y-1.5">
      {rows.map((r) => (
        <li key={r.label} className="group grid grid-cols-[110px_1fr_64px] items-center gap-3 text-xs" title={`${r.label}: ${format(r.value)}${r.hint ? ` · ${r.hint}` : ""}`}>
          <span className="truncate text-slate-700">{r.label}</span>
          <div className="h-3 rounded-r-[4px] bg-slate-50">
            <div className="h-full rounded-r-[4px] transition-opacity group-hover:opacity-80" style={{ width: `${(r.value / max) * 100}%`, background: color }} />
          </div>
          <span className="text-right tabular-nums text-slate-700">{format(r.value)}</span>
        </li>
      ))}
    </ul>
  );
}
