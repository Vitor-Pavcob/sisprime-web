"use client";

import { useState } from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Sector } from "recharts";

export type DonutSlice = { name: string; value: number; fill: string };

type Props = {
  data: DonutSlice[];
  height?: number;
  centerLabel?: string;
  centerValue?: string;
  /** Tipo de formatação do valor no tooltip. Default = "number" (pt-BR). */
  format?: "number" | "currency";
};

function fmtValue(v: number, format: "number" | "currency"): string {
  if (format === "currency") {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(v);
  }
  return v.toLocaleString("pt-BR");
}

// Renderiza o sector "ativo" um pouco maior — feedback visual de hover.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderActiveShape(props: any) {
  return <Sector {...props} outerRadius={props.outerRadius + 6} />;
}

export function DonutChart({
  data,
  height = 220,
  centerLabel,
  centerValue,
  format = "number",
}: Props) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);
  const total = data.reduce((s, d) => s + d.value, 0);
  const active = activeIndex != null ? data[activeIndex] : null;
  const activePct = active && total > 0 ? (active.value / total) * 100 : 0;

  return (
    <div className="relative w-full" style={{ height }}>
      {/* Tooltip flutuante posicionado fora da rosca (topo do card).
          Substitui o <Tooltip /> do recharts pra evitar sobreposição com as fatias. */}
      <div
        aria-hidden={!active}
        className={`pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 rounded-md border border-line-strong bg-card px-3 py-1.5 text-xs shadow-md ring-1 ring-black/5 transition-opacity duration-150 ${
          active ? "opacity-100" : "opacity-0"
        }`}
      >
        {active && (
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: active.fill }}
            />
            <span className="font-semibold text-content">{active.name}</span>
            <span className="text-content-muted">·</span>
            <span className="tabular-nums text-content">{fmtValue(active.value, format)}</span>
            <span className="text-content-muted">·</span>
            <span className="tabular-nums text-content-muted">{activePct.toFixed(1)}%</span>
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius="60%"
            outerRadius="90%"
            paddingAngle={2}
            startAngle={90}
            endAngle={-270}
            activeIndex={activeIndex}
            activeShape={renderActiveShape}
            onMouseEnter={(_, idx) => setActiveIndex(idx)}
            onMouseLeave={() => setActiveIndex(undefined)}
          >
            {data.map((slice) => (
              <Cell key={slice.name} fill={slice.fill} stroke="none" />
            ))}
          </Pie>
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            wrapperStyle={{ fontSize: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>

      {(centerLabel || centerValue) && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {centerValue && (
            <div className="text-2xl font-semibold text-content">{centerValue}</div>
          )}
          {centerLabel && (
            <div className="text-xs uppercase tracking-wider text-content-muted">{centerLabel}</div>
          )}
        </div>
      )}
      {total === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-content-subtle">
          Sem dados no período
        </div>
      )}
    </div>
  );
}
