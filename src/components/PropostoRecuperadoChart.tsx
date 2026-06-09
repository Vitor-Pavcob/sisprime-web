"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type AnoPonto = {
  ano: number;
  proposto: number;
  recuperado: number;
  pct: number; // recuperado / proposto (0..1+)
};

function brl(v: number): string {
  if (Math.abs(v) >= 1e9) return `R$ ${(v / 1e9).toFixed(1).replace(".", ",")} bi`;
  if (Math.abs(v) >= 1e6) return `R$ ${(v / 1e6).toFixed(1).replace(".", ",")} mi`;
  if (Math.abs(v) >= 1e3) return `R$ ${(v / 1e3).toFixed(0)} mil`;
  return `R$ ${v.toFixed(0)}`;
}
const pctFmt = (v: number) => `${(v * 100).toFixed(0)}%`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as AnoPonto;
  return (
    <div className="rounded-md border border-line-strong bg-card px-3 py-2 text-xs shadow-md">
      <div className="font-semibold text-content">{label}</div>
      <div className="mt-1 flex items-center gap-2 text-content-muted">
        <span className="inline-block h-2 w-2 rounded-sm" style={{ background: "var(--bar-gray)" }} />
        {brl(p.proposto)} proposto
      </div>
      <div className="mt-0.5 flex items-center gap-2 text-content-muted">
        <span className="inline-block h-2 w-2 rounded-sm" style={{ background: "var(--bar-emerald)" }} />
        {brl(p.recuperado)} recuperado
      </div>
      <div className="mt-0.5 flex items-center gap-2 font-medium text-content">
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--bar-cyan)" }} />
        {pctFmt(p.pct)} recuperado / proposto
      </div>
    </div>
  );
}

function LegendItem({ color, shape, label }: { color: string; shape: "bar" | "line"; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-content-muted">
      <span className={`inline-block h-2.5 w-2.5 ${shape === "line" ? "rounded-full" : "rounded-sm"}`} style={{ background: color }} />
      {label}
    </span>
  );
}

export function PropostoRecuperadoChart({ data }: { data: AnoPonto[] }) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        <LegendItem color="var(--bar-gray)" shape="bar" label="Valor proposto" />
        <LegendItem color="var(--bar-emerald)" shape="bar" label="Valor recuperado" />
        <LegendItem color="var(--bar-cyan)" shape="line" label="% recuperado (recuperado / proposto)" />
      </div>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis dataKey="ano" tick={{ fontSize: 12, fill: "var(--chart-axis)" }} tickLine={false} axisLine={{ stroke: "var(--chart-grid)" }} />
            <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "var(--chart-axis)" }} tickLine={false} axisLine={false} width={48} tickFormatter={brl} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "var(--chart-axis)" }} tickLine={false} axisLine={false} width={44} tickFormatter={pctFmt} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--card-strong)", opacity: 0.4 }} />
            <Bar yAxisId="left" dataKey="proposto" fill="var(--bar-gray)" radius={[3, 3, 0, 0]} maxBarSize={34} />
            <Bar yAxisId="left" dataKey="recuperado" fill="var(--bar-emerald)" radius={[3, 3, 0, 0]} maxBarSize={34} />
            <Line yAxisId="right" type="monotone" dataKey="pct" stroke="var(--bar-cyan)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--bar-cyan)" }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
