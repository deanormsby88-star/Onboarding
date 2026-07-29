"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WeekPoint } from "@/lib/analytics";

/**
 * Chart primitives. Self is ALWAYS blue (#3D7CC9) and manager is ALWAYS
 * purple (#8B3DAF) — the one pairing everyone learns (brief §12). The pair
 * sits in the CVD 6-8 ΔE band, so identity is never color-alone: every
 * chart carries a legend and labelled tooltips.
 */

export const SELF_BLUE = "#3D7CC9";
export const MANAGER_PURPLE = "#8B3DAF";
const GRID = "#e5e7eb";
const INK_MUTED = "#6b7280";

const axisProps = {
  stroke: INK_MUTED,
  fontSize: 12,
  tickLine: false,
  axisLine: { stroke: GRID },
} as const;

const tooltipStyle = {
  fontSize: 13,
  borderRadius: 8,
  border: `1px solid ${GRID}`,
} as const;

function fmt(v: number | string | undefined | null): string {
  return typeof v === "number" ? v.toFixed(1) : "—";
}

/** Overall score over time — the headline chart. Two lines, 1-5 scale. */
export function ScoreOverTime({ points }: { points: WeekPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="week" {...axisProps} interval="preserveStartEnd" />
        <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} {...axisProps} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmt(v as number)} />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        <ReferenceLine y={3} stroke={GRID} />
        <Line
          name="Self"
          dataKey="self"
          stroke={SELF_BLUE}
          strokeWidth={2}
          dot={{ r: 3, fill: SELF_BLUE, strokeWidth: 0 }}
          connectNulls
        />
        <Line
          name="Manager"
          dataKey="manager"
          stroke={MANAGER_PURPLE}
          strokeWidth={2}
          dot={{ r: 3, fill: MANAGER_PURPLE, strokeWidth: 0 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Delta over time — zero-centred; persistently positive = coaching signal. */
export function DeltaOverTime({ points }: { points: WeekPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="week" {...axisProps} interval="preserveStartEnd" />
        <YAxis domain={[-3, 3]} ticks={[-2, 0, 2]} {...axisProps} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v) => [fmt(v as number), "Delta (self − manager)"]}
        />
        <ReferenceLine y={0} stroke={INK_MUTED} />
        <Line
          name="Delta (self − manager)"
          dataKey="delta"
          stroke={INK_MUTED}
          strokeWidth={2}
          dot={{ r: 3, fill: INK_MUTED, strokeWidth: 0 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Current period by perspective — grouped bars, self vs manager. */
export function PerspectiveBars({
  rows,
}: {
  rows: { name: string; self: number | null; manager: number | null }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
        <XAxis
          dataKey="name"
          {...axisProps}
          tickFormatter={(v: string) => v.split(" and ")[0] ?? v}
        />
        <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} {...axisProps} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmt(v as number)} />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        <Bar name="Self" dataKey="self" fill={SELF_BLUE} radius={[4, 4, 0, 0]} maxBarSize={36} />
        <Bar name="Manager" dataKey="manager" fill={MANAGER_PURPLE} radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Calibration: each manager's rating distribution side by side. One chart
 * per manager (small multiples), same axes — never a dual axis.
 */
export function RatingHistogram({
  counts,
  total,
}: {
  counts: [number, number, number, number, number];
  total: number;
}) {
  const data = counts.map((n, i) => ({
    rating: String(i + 1),
    share: total === 0 ? 0 : (n / total) * 100,
    n,
  }));
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="rating" {...axisProps} />
        <YAxis unit="%" {...axisProps} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(_v, _n, item) => [
            `${item.payload.n} ratings (${item.payload.share.toFixed(0)}%)`,
            `Rated ${item.payload.rating}`,
          ]}
        />
        <Bar dataKey="share" fill={MANAGER_PURPLE} radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Org-wide self-vs-manager delta per person, ranked. Diverging around 0. */
export function DeltaRanking({
  rows,
}: {
  rows: { name: string; delta: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, rows.length * 34)}>
      <BarChart
        data={rows}
        layout="vertical"
        margin={{ top: 4, right: 24, bottom: 0, left: 40 }}
      >
        <CartesianGrid stroke={GRID} strokeDasharray="2 4" horizontal={false} />
        <XAxis type="number" domain={[-2.5, 2.5]} {...axisProps} />
        <YAxis
          type="category"
          dataKey="name"
          width={130}
          {...axisProps}
          tickFormatter={(v: string) => v.replace(" (Demo)", "")}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v) => [
            `${(v as number) > 0 ? "+" : ""}${(v as number).toFixed(2)}`,
            "Avg delta (self − manager)",
          ]}
        />
        <ReferenceLine x={0} stroke={INK_MUTED} />
        <Bar dataKey="delta" radius={4} maxBarSize={18}>
          {rows.map((r) => (
            <Cell key={r.name} fill={r.delta >= 0 ? SELF_BLUE : MANAGER_PURPLE} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
