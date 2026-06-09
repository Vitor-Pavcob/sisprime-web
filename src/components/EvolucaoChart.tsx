"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type EvolucaoPonto = { bucket: string; processos: number; valor: number };
export type DrillLevel = "ano" | "mes" | "dia";

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MESES_LONG = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function fmtBRLcompact(v: number): string {
  if (Math.abs(v) >= 1e9) return `R$ ${(v / 1e9).toFixed(1).replace(".", ",")} bi`;
  if (Math.abs(v) >= 1e6) return `R$ ${(v / 1e6).toFixed(0)} mi`;
  if (Math.abs(v) >= 1e3) return `R$ ${(v / 1e3).toFixed(0)} mil`;
  return `R$ ${v}`;
}

/** Rótulo do eixo X conforme o nível. */
function labelFor(bucket: string, level: DrillLevel): string {
  if (level === "ano") return bucket;
  if (level === "mes") return MESES[Number(bucket.slice(5, 7)) - 1] ?? bucket;
  return bucket.slice(8, 10); // dia
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function tooltipTitle(bucket: string, level: DrillLevel): string {
  if (level === "ano") return bucket;
  if (level === "mes") return `${MESES_LONG[Number(bucket.slice(5, 7)) - 1]} / ${bucket.slice(0, 4)}`;
  const [y, m, d] = bucket.split("-");
  return `${d}/${m}/${y}`;
}

export function EvolucaoChart({
  data,
  level,
  countLabel = "processos",
  valueLabel = "em valor de causa",
}: {
  data: EvolucaoPonto[];
  level: DrillLevel;
  countLabel?: string;
  valueLabel?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const ano = params.get("ano");
  const mes = params.get("mes");

  function nav(next: { ano?: string | null; mes?: string | null }) {
    const np = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (!v) np.delete(k);
      else np.set(k, v);
    }
    startTransition(() => router.replace(`${pathname}?${np.toString()}`, { scroll: false }));
  }

  // Clique numa barra: desce um nível (ano→mês, mês→dia). Dia é folha.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function onBarClick(entry: any) {
    const bucket: string | undefined = entry?.bucket ?? entry?.payload?.bucket;
    if (!bucket) return;
    if (level === "ano") nav({ ano: bucket, mes: null });
    else if (level === "mes") nav({ mes: bucket });
  }

  const chartData = data.map((d) => ({ ...d, label: labelFor(d.bucket, level) }));
  const clickable = level !== "dia";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function CustomTooltip({ active, payload }: any) {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    return (
      <div className="rounded-md border border-line-strong bg-card px-3 py-2 text-xs shadow-md">
        <div className="font-semibold text-content">{tooltipTitle(p.bucket, level)}</div>
        <div className="mt-1 flex items-center gap-2 text-content-muted">
          <span className="inline-block h-2 w-2 rounded-sm" style={{ background: "var(--bar-blue)" }} />
          {p.processos.toLocaleString("pt-BR")} {countLabel}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-content-muted">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--chart-line)" }} />
          {fmtBRLcompact(p.valor)} {valueLabel}
        </div>
        {clickable && (
          <div className="mt-1 text-[10px] text-content-subtle">clique para detalhar ▾</div>
        )}
      </div>
    );
  }

  return (
    <div className={pending ? "opacity-60" : ""}>
      {/* Breadcrumb do drill */}
      <div className="mb-2 flex items-center gap-1 text-xs">
        <Crumb label="Todos os anos" onClick={() => nav({ ano: null, mes: null })} active={level === "ano"} />
        {ano && (
          <>
            <span className="text-content-subtle">/</span>
            <Crumb label={ano} onClick={() => nav({ ano, mes: null })} active={level === "mes"} />
          </>
        )}
        {mes && (
          <>
            <span className="text-content-subtle">/</span>
            <Crumb label={`${MESES_LONG[Number(mes.slice(5, 7)) - 1]}`} active onClick={() => {}} />
          </>
        )}
      </div>

      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
            <defs>
              <linearGradient id="evoBars" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--bar-blue)" stopOpacity={1} />
                <stop offset="100%" stopColor="var(--bar-blue)" stopOpacity={0.06} />
              </linearGradient>
              <linearGradient id="evoLineArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-line)" stopOpacity={0.34} />
                <stop offset="60%" stopColor="var(--chart-line)" stopOpacity={0.12} />
                <stop offset="100%" stopColor="var(--chart-line)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "var(--chart-axis)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--chart-grid)" }}
            />
            <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "var(--chart-axis)" }} tickLine={false} axisLine={false} width={36} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "var(--chart-axis)" }} tickLine={false} axisLine={false} width={52} tickFormatter={fmtBRLcompact} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--card-strong)", opacity: 0.4 }} />
            <Bar
              yAxisId="left"
              dataKey="processos"
              fill="url(#evoBars)"
              radius={[3, 3, 0, 0]}
              maxBarSize={38}
              onClick={onBarClick}
              cursor={clickable ? "pointer" : "default"}
            />
            <Area yAxisId="right" type="monotone" dataKey="valor" stroke="var(--chart-line)" strokeWidth={2} fill="url(#evoLineArea)" dot={{ r: 2.5, fill: "var(--chart-line)", strokeWidth: 0 }} activeDot={{ r: 4 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Crumb({ label, onClick, active }: { label: string; onClick: () => void; active: boolean }) {
  if (active) {
    return <span className="rounded bg-brand/10 px-1.5 py-0.5 font-semibold text-brand">{label}</span>;
  }
  return (
    <button type="button" onClick={onClick} className="rounded px-1.5 py-0.5 font-medium text-content-muted transition hover:bg-card-soft hover:text-content">
      {label}
    </button>
  );
}
