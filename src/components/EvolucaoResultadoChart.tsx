"use client";

import { useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type MatrizAno = { ano: number; meses: { proposto: number; recuperado: number }[] };

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// Cores: proposto = azul escuro · recuperado = azul claro · linha = cinza.
const COR_PROPOSTO = "#0a2e52";
const COR_RECUPERADO = "#5eb3f2";
const COR_LINHA = "#64748b";
const YEAR_COLORS = ["#94a3b8", "#0e5fac", "#1e88e5", "#00a0df", "#10b981", "#f59e0b", "#8b5cf6", "#0a2e52"];

function brl(v: number): string {
  if (Math.abs(v) >= 1e9) return `R$ ${(v / 1e9).toFixed(1).replace(".", ",")} bi`;
  if (Math.abs(v) >= 1e6) return `R$ ${(v / 1e6).toFixed(1).replace(".", ",")} mi`;
  if (Math.abs(v) >= 1e3) return `R$ ${(v / 1e3).toFixed(0)} mil`;
  return `R$ ${v.toFixed(0)}`;
}
const pctFmt = (v: number) => `${(v * 100).toFixed(0)}%`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md border border-line-strong bg-card px-3 py-2 text-xs shadow-md">
      <div className="font-semibold text-content">{label}</div>
      <div className="mt-1 flex items-center gap-2 text-content-muted"><span className="inline-block h-2 w-2 rounded-sm" style={{ background: COR_PROPOSTO }} />{brl(p.proposto)} proposto</div>
      <div className="mt-0.5 flex items-center gap-2 text-content-muted"><span className="inline-block h-2 w-2 rounded-sm" style={{ background: COR_RECUPERADO }} />{brl(p.recuperado)} recuperado</div>
      <div className="mt-0.5 flex items-center gap-2 font-medium text-content"><span className="inline-block h-2 w-2 rounded-full" style={{ background: COR_LINHA }} />{pctFmt(p.pct)} recuperado / proposto</div>
    </div>
  );
}

// Rótulo só no ponto FINAL de cada linha do comparativo (valor acumulado do
// ano), em vez de rotular os 12 meses. Renderizado via LabelList → recebe
// x/y/value/index de cada ponto; só desenha quando index === último mês com dado.
function buildEndLabel(color: string, lastMonth: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function EndLabel(props: any) {
    const { x, y, value, index } = props ?? {};
    if (index !== lastMonth || value == null) return null;
    if (typeof x !== "number" || typeof y !== "number") return null;
    return (
      <text x={x} y={y - 9} textAnchor="middle" style={{ fontSize: 10.5, fontWeight: 700, fill: color, paintOrder: "stroke", stroke: "var(--card)", strokeWidth: 3 }}>
        {brl(typeof value === "number" ? value : 0)}
      </text>
    );
  };
}

function Segmented({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="inline-flex rounded-lg border border-line-strong bg-card p-0.5 shadow-sm">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={`rounded-md px-3 py-1 text-xs font-medium transition ${value === o.value ? "bg-brand text-white shadow-sm" : "text-content-muted hover:text-content"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function EvolucaoResultadoChart({ data }: { data: MatrizAno[] }) {
  const [mode, setMode] = useState<"evolucao" | "comparativo">("evolucao");
  const [drillAno, setDrillAno] = useState<number | null>(null);
  const [metric, setMetric] = useState<"recuperado" | "proposto">("recuperado");

  const anosComRec = data.filter((d) => d.meses.some((m) => m.recuperado > 0)).map((d) => d.ano);
  const defaultSel = anosComRec.length ? anosComRec : data.map((d) => d.ano);
  const [anosSel, setAnosSel] = useState<number[]>(defaultSel);

  // ---- agregados anuais ----
  const annual = data.map((d) => {
    const proposto = d.meses.reduce((s, m) => s + m.proposto, 0);
    const recuperado = d.meses.reduce((s, m) => s + m.recuperado, 0);
    return { ano: d.ano, label: String(d.ano), proposto, recuperado, pct: proposto > 0 ? recuperado / proposto : 0 };
  });

  // ---- modo EVOLUÇÃO (barras + % linha, drill ano→mês) ----
  const barData =
    drillAno == null
      ? annual
      : (data.find((d) => d.ano === drillAno)?.meses ?? []).map((m, i) => ({
          label: MESES[i],
          proposto: m.proposto,
          recuperado: m.recuperado,
          pct: m.proposto > 0 ? m.recuperado / m.proposto : 0,
        }));
  const showLabels = barData.length <= 7;

  // ---- modo COMPARATIVO (linhas acumuladas jan→dez por ano) ----
  // Corta o acumulado após o último mês COM resultado (não estende a linha
  // até dez. dando impressão de continuidade onde não há dado).
  const lastIdx: Record<number, number> = {};
  for (const d of data) {
    let last = -1;
    for (let k = 0; k < 12; k++) {
      const v = metric === "recuperado" ? d.meses[k].recuperado : d.meses[k].proposto;
      if (v > 0) last = k;
    }
    lastIdx[d.ano] = last;
  }
  const compData = MESES.map((mes, i) => {
    const row: Record<string, number | string | null> = { label: mes };
    for (const d of data) {
      if (!anosSel.includes(d.ano)) continue;
      if (i > lastIdx[d.ano]) { row[String(d.ano)] = null; continue; }
      let acc = 0;
      for (let k = 0; k <= i; k++) acc += metric === "recuperado" ? d.meses[k].recuperado : d.meses[k].proposto;
      row[String(d.ano)] = acc;
    }
    return row;
  });
  const anoDestaque = anosSel.length ? Math.max(...anosSel) : null;
  const colorFor = (ano: number) => YEAR_COLORS[data.findIndex((d) => d.ano === ano) % YEAR_COLORS.length];
  const yearTotal = (ano: number) => {
    const d = data.find((x) => x.ano === ano);
    return d ? d.meses.reduce((s, m) => s + (metric === "recuperado" ? m.recuperado : m.proposto), 0) : 0;
  };
  // Áreas: da mais alta (atrás) para a mais baixa (frente); linhas vão todas por cima.
  const selSorted = [...anosSel].sort((a, b) => yearTotal(b) - yearTotal(a));

  const toggleAno = (ano: number) =>
    setAnosSel((prev) => (prev.includes(ano) ? prev.filter((a) => a !== ano) : [...prev, ano].sort((a, b) => a - b)));

  return (
    <div>
      {/* Controles */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <Segmented value={mode} onChange={(v) => setMode(v as "evolucao" | "comparativo")}
          options={[{ value: "evolucao", label: "Evolução" }, { value: "comparativo", label: "Comparativo anual" }]} />
        {mode === "evolucao" ? (
          <div className="flex items-center gap-1 text-xs">
            <Crumb label="Todos os anos" active={drillAno == null} onClick={() => setDrillAno(null)} />
            {drillAno != null && (<><span className="text-content-subtle">/</span><Crumb label={String(drillAno)} active onClick={() => {}} /></>)}
            {drillAno == null && <span className="ml-1 text-content-subtle">— clique numa barra para ver os meses</span>}
          </div>
        ) : (
          <Segmented value={metric} onChange={(v) => setMetric(v as "recuperado" | "proposto")}
            options={[{ value: "recuperado", label: "Recuperado" }, { value: "proposto", label: "Proposto" }]} />
        )}
      </div>

      {/* Checkboxes de anos (comparativo) */}
      {mode === "comparativo" && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-content-muted">Anos:</span>
          {data.map((d, i) => {
            const on = anosSel.includes(d.ano);
            const color = YEAR_COLORS[i % YEAR_COLORS.length];
            return (
              <button key={d.ano} type="button" onClick={() => toggleAno(d.ano)}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition ${on ? "border-line-strong bg-card-soft text-content" : "border-line bg-card text-content-subtle hover:text-content-muted"}`}>
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: on ? color : "transparent", boxShadow: on ? "none" : "inset 0 0 0 1.5px var(--line-strong)" }} />
                {d.ano}
              </button>
            );
          })}
        </div>
      )}

      {/* EVOLUÇÃO */}
      {mode === "evolucao" && (
        <>
          <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            <Leg color={COR_PROPOSTO} shape="bar" label="Valor proposto" />
            <Leg color={COR_RECUPERADO} shape="bar" label="Valor recuperado" />
            <Leg color={COR_LINHA} shape="line" label="% recuperado" />
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={barData} barGap={2} barCategoryGap="16%" margin={{ top: 20, right: 8, bottom: 4, left: 4 }}>
                <defs>
                  <linearGradient id="evoProp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COR_PROPOSTO} stopOpacity={1} />
                    <stop offset="100%" stopColor={COR_PROPOSTO} stopOpacity={0.06} />
                  </linearGradient>
                  <linearGradient id="evoRec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COR_RECUPERADO} stopOpacity={1} />
                    <stop offset="100%" stopColor={COR_RECUPERADO} stopOpacity={0.06} />
                  </linearGradient>
                  <linearGradient id="evoLinhaArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COR_LINHA} stopOpacity={0.34} />
                    <stop offset="60%" stopColor={COR_LINHA} stopOpacity={0.12} />
                    <stop offset="100%" stopColor={COR_LINHA} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fontWeight: 600, fill: "var(--content)" }} tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "var(--chart-axis)" }} tickLine={false} axisLine={false} width={52} tickFormatter={brl} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "var(--chart-axis)" }} tickLine={false} axisLine={false} width={44} tickFormatter={pctFmt} domain={[0, (max: number) => Math.max(1, max)]} />
                <Tooltip content={<BarTooltip />} cursor={{ fill: "var(--chart-grid)", opacity: 0.25 }} />
                <Bar yAxisId="left" dataKey="proposto" name="Proposto" fill="url(#evoProp)" radius={[4, 4, 0, 0]} maxBarSize={64}
                  isAnimationActive animationBegin={0} animationDuration={800} animationEasing="ease"
                  cursor={drillAno == null ? "pointer" : "default"}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onClick={(e: any) => { if (drillAno == null && e?.ano) setDrillAno(e.ano); }}>
                  {showLabels && <LabelList dataKey="proposto" position="top" offset={6} formatter={(v: number) => (v > 0 ? brl(v) : "")} style={{ fontSize: 10, fontWeight: 600, fill: "var(--content-muted)", paintOrder: "stroke", stroke: "var(--card)", strokeWidth: 3 }} />}
                </Bar>
                <Bar yAxisId="left" dataKey="recuperado" name="Recuperado" fill="url(#evoRec)" radius={[4, 4, 0, 0]} maxBarSize={64}
                  isAnimationActive animationBegin={0} animationDuration={800} animationEasing="ease"
                  cursor={drillAno == null ? "pointer" : "default"}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onClick={(e: any) => { if (drillAno == null && e?.ano) setDrillAno(e.ano); }}>
                  {showLabels && <LabelList dataKey="recuperado" position="top" offset={6} formatter={(v: number) => (v > 0 ? brl(v) : "")} style={{ fontSize: 10, fontWeight: 700, fill: "var(--content)", paintOrder: "stroke", stroke: "var(--card)", strokeWidth: 3 }} />}
                </Bar>
                <Area yAxisId="right" type="monotone" dataKey="pct" name="% recuperado" stroke={COR_LINHA} strokeWidth={2.5} fill="url(#evoLinhaArea)" dot={{ r: 3, fill: COR_LINHA, strokeWidth: 0 }} activeDot={{ r: 5 }}
                  isAnimationActive animationBegin={0} animationDuration={800} animationEasing="ease">
                  {showLabels && <LabelList dataKey="pct" position="top" offset={8} formatter={(v: number) => pctFmt(v)} style={{ fontSize: 10.5, fontWeight: 700, fill: COR_LINHA, paintOrder: "stroke", stroke: "var(--card)", strokeWidth: 3 }} />}
                </Area>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* COMPARATIVO */}
      {mode === "comparativo" && (
        <div className="h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={compData} margin={{ top: 24, right: 30, bottom: 4, left: 8 }}>
              <defs>
                {selSorted.map((ano) => (
                  <linearGradient key={ano} id={`cmpY${ano}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colorFor(ano)} stopOpacity={0.30} />
                    <stop offset="65%" stopColor={colorFor(ano)} stopOpacity={0.10} />
                    <stop offset="100%" stopColor={colorFor(ano)} stopOpacity={0.02} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fontWeight: 600, fill: "var(--content)" }} interval={0} tickMargin={8} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--chart-axis)" }} tickFormatter={brl} tickLine={false} axisLine={false} width={64} />
              <Tooltip cursor={{ stroke: "var(--chart-axis)", strokeWidth: 1, strokeDasharray: "3 3" }}
                contentStyle={{ borderRadius: 8, border: "1px solid var(--chart-tooltip-border)", backgroundColor: "var(--chart-tooltip-bg)", color: "var(--content)", fontSize: 12 }}
                labelStyle={{ fontWeight: 600 }}
                formatter={(value, name) => [brl(typeof value === "number" ? value : 0), name]} />
              <Legend verticalAlign="top" iconType="plainline" wrapperStyle={{ fontSize: 12, paddingBottom: 8 }} />
              {/* Áreas (degradê) atrás — da mais alta para a mais baixa, sem stroke nem tooltip/legend.
                  Animam JUNTO com as linhas (mesmo wipe da esquerda p/ direita, mesma duração). */}
              {selSorted.map((ano) => (
                <Area key={`a-${ano}`} type="monotone" dataKey={String(ano)} stroke="none" fill={`url(#cmpY${ano})`}
                  connectNulls={false} legendType="none" tooltipType="none" activeDot={false} dot={false}
                  isAnimationActive animationBegin={0} animationDuration={800} animationEasing="ease" />
              ))}
              {/* Linhas por cima — nunca sobrepostas por nenhuma área */}
              {selSorted.map((ano) => (
                <Line key={`l-${ano}`} type="monotone" dataKey={String(ano)} name={String(ano)} stroke={colorFor(ano)}
                  strokeWidth={ano === anoDestaque ? 3 : 2} dot={{ r: 2, strokeWidth: 0, fill: colorFor(ano) }} activeDot={{ r: 5 }} connectNulls={false}
                  isAnimationActive animationBegin={0} animationDuration={800} animationEasing="ease">
                  <LabelList content={buildEndLabel(colorFor(ano), lastIdx[ano])} />
                </Line>
              ))}
            </ComposedChart>
          </ResponsiveContainer>
          <p className="mt-1 text-center text-[11px] text-content-subtle">
            {metric === "recuperado" ? "Recuperado" : "Proposto"} acumulado de janeiro a dezembro · uma linha por ano (corta no último mês com resultado)
          </p>
        </div>
      )}
    </div>
  );
}

function Crumb({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  if (active) return <span className="rounded bg-brand/10 px-1.5 py-0.5 font-semibold text-brand">{label}</span>;
  return <button type="button" onClick={onClick} className="rounded px-1.5 py-0.5 font-medium text-content-muted transition hover:bg-card-soft hover:text-content">{label}</button>;
}

function Leg({ color, shape, label }: { color: string; shape: "bar" | "line"; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-content-muted">
      <span className={`inline-block h-2.5 w-2.5 ${shape === "line" ? "rounded-full" : "rounded-sm"}`} style={{ background: color }} />
      {label}
    </span>
  );
}
