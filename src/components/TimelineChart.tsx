"use client";

import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const LABEL_HALO = { paintOrder: "stroke", stroke: "var(--card)", strokeWidth: 3 } as const;

export type MesPonto = { competencia: string; processos: number; valor: number; acumulado: number };

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function label(comp: string): string {
  const [y, m] = comp.split("-");
  return `${MESES[Number(m) - 1]}/${y.slice(2)}`;
}
function brl(v: number): string {
  if (Math.abs(v) >= 1e9) return `R$ ${(v / 1e9).toFixed(1).replace(".", ",")} bi`;
  if (Math.abs(v) >= 1e6) return `R$ ${(v / 1e6).toFixed(1).replace(".", ",")} mi`;
  if (Math.abs(v) >= 1e3) return `R$ ${(v / 1e3).toFixed(0)} mil`;
  return `R$ ${v.toFixed(0)}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as MesPonto;
  return (
    <div className="rounded-md border border-line-strong bg-card px-3 py-2 text-xs shadow-md">
      <div className="font-semibold text-content">{label(p.competencia)}</div>
      <div className="mt-1 flex items-center gap-2 text-content-muted">
        <span className="inline-block h-2 w-2 rounded-sm" style={{ background: "var(--bar-blue)" }} />
        {brl(p.valor)} recuperado · {p.processos} baixa{p.processos === 1 ? "" : "s"}
      </div>
      <div className="mt-0.5 flex items-center gap-2 text-content-muted">
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--chart-line)" }} />
        {brl(p.acumulado)} acumulado
      </div>
    </div>
  );
}

export function TimelineChart({ data }: { data: MesPonto[] }) {
  const chartData = data.map((d) => ({ ...d, label: label(d.competencia) }));
  // Acima de ~18 meses os rótulos se sobrepõem — aí ficam só no hover.
  const showLabels = chartData.length <= 18;
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 20, right: 8, bottom: 4, left: 4 }}>
          <defs>
            <linearGradient id="tlBars" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--bar-blue)" stopOpacity={1} />
              <stop offset="100%" stopColor="var(--bar-blue)" stopOpacity={0.06} />
            </linearGradient>
            <linearGradient id="tlLineArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-line)" stopOpacity={0.34} />
              <stop offset="60%" stopColor="var(--chart-line)" stopOpacity={0.12} />
              <stop offset="100%" stopColor="var(--chart-line)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--chart-axis)" }} tickLine={false} axisLine={{ stroke: "var(--chart-grid)" }} interval={0} angle={-90} textAnchor="end" height={48} />
          <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "var(--chart-axis)" }} tickLine={false} axisLine={false} width={48} tickFormatter={brl} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "var(--chart-axis)" }} tickLine={false} axisLine={false} width={52} tickFormatter={brl} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--card-strong)", opacity: 0.4 }} />
          <Bar yAxisId="left" dataKey="valor" fill="url(#tlBars)" radius={[3, 3, 0, 0]} maxBarSize={26}>
            {showLabels && (
              <LabelList
                dataKey="valor"
                position="top"
                offset={6}
                formatter={(v: number) => (v > 0 ? brl(v) : "")}
                style={{ fontSize: 9.5, fontWeight: 600, fill: "var(--content)", ...LABEL_HALO }}
              />
            )}
          </Bar>
          <Area yAxisId="right" type="monotone" dataKey="acumulado" stroke="var(--chart-line)" strokeWidth={2} fill="url(#tlLineArea)" dot={false} activeDot={{ r: 4 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
