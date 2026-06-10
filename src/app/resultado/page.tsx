import { Suspense } from "react";
import {
  parseResultadoFilters,
  calcResultado,
  resultadoPorAno,
  topRecuperacoes,
  matrizMensalPorAno,
} from "@/lib/resultado-data";
import { ANO_MIN } from "@/lib/config";
import { Shell } from "@/components/Shell";
import { KpiCard } from "@/components/KpiCard";
import { FunnelExec, type FunnelStage } from "@/components/FunnelExec";
import { EvolucaoResultadoChart } from "@/components/EvolucaoResultadoChart";
import { BarCell } from "@/components/BarCell";
import {
  SortableCard,
  type SortableColumn,
  type SortableRow,
} from "@/components/SortableCard";
import { FiltersBar } from "@/components/FiltersBar";
import { PeriodFilter } from "@/components/PeriodFilter";
import { fmtBRL, fmtNum, fmtPct } from "@/lib/format";
import { Exportable } from "@/components/Exportable";

export const dynamic = "force-dynamic";

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const compLabel = (c: string) => { const [y, m] = c.split("-"); return `${MESES[Number(m) - 1]}/${y.slice(2)}`; };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const f = parseResultadoFilters(sp);
  const r = calcResultado(f);
  const porAno = resultadoPorAno(f);
  const top = topRecuperacoes(f, 12);
  const matriz = matrizMensalPorAno(f).filter((m) => m.ano >= ANO_MIN);

  // Funil (largura por valor: proposto → aceito → recuperado total)
  const base = r.valorProposto || 1;
  const stages: FunnelStage[] = [
    { label: "Propostas geradas", value: fmtBRL(r.valorProposto, { compact: true }), sub: `${fmtNum(r.propostas)} propostas · ${fmtNum(r.devedores)} devedores`, width: 1 },
    { label: "Propostas aceitas", value: fmtBRL(r.valorAceito, { compact: true }), sub: `${fmtNum(r.aceitas)} aceitas`, width: r.valorAceito / base, conv: `${fmtPct(r.taxaAceite)} de aceite` },
    { label: "Recuperação efetivada", value: fmtBRL(r.recuperado, { compact: true }), sub: `${fmtNum(r.baixas)} baixas pagas`, width: Math.max(r.recuperado / base, 0.12), conv: `${fmtPct(r.recuperado / base)} do proposto recuperado` },
  ];

  // Resultado por ano
  const maxProp = Math.max(...porAno.map((a) => a.valorProposto), 1);
  const maxRec = Math.max(...porAno.map((a) => a.recuperado), 1);
  const anoColumns: SortableColumn[] = [
    { key: "ano", header: "Ano", align: "left" },
    { key: "propostas", header: "Propostas", align: "right" },
    { key: "valorProposto", header: "Valor proposto", align: "right" },
    { key: "recuperado", header: "Recuperado", align: "right" },
    { key: "pct", header: "% recuperado", align: "right" },
  ];
  const anoRows: SortableRow[] = porAno.map((a) => {
    const pct = a.valorProposto > 0 ? a.recuperado / a.valorProposto : 0;
    return {
      id: String(a.ano),
      cells: [
        <td key="a" className="px-3 py-2 font-semibold text-content">{a.ano}</td>,
        <td key="p" className="px-3 py-2 text-right tabular-nums text-content-muted">{fmtNum(a.propostas)}</td>,
        <BarCell key="vp" value={a.valorProposto} max={maxProp} color="var(--bar-gray)" format={(v) => fmtBRL(v, { compact: true })} />,
        <td key="r" className="relative px-3 py-2 text-right">
          <div aria-hidden className="pointer-events-none absolute inset-y-1 left-1 rounded-sm" style={{ width: `calc(${(a.recuperado / maxRec) * 100}% - 2px)`, backgroundColor: "var(--bar-emerald)", opacity: 0.22 }} />
          <span className="relative font-semibold tabular-nums text-content">{a.recuperado > 0 ? fmtBRL(a.recuperado, { compact: true }) : "—"}</span>
        </td>,
        <td key="pc" className="px-3 py-2 text-right tabular-nums font-medium text-content">{a.recuperado > 0 ? fmtPct(pct) : "—"}</td>,
      ],
      sortValues: [a.ano, a.propostas, a.valorProposto, a.recuperado, pct],
    };
  });

  // Top recuperações
  const topColumns: SortableColumn[] = [
    { key: "nome", header: "Cliente", align: "left" },
    { key: "tipo", header: "Tipo", align: "center" },
    { key: "competencia", header: "Competência", align: "center" },
    { key: "proposta", header: "Origem", align: "center" },
    { key: "valor", header: "Recuperado", align: "right" },
  ];
  const topRows: SortableRow[] = top.map((c, i) => ({
    id: `${c.cpfDigits}-${i}`,
    cells: [
      <td key="n" className="max-w-[240px] truncate px-3 py-2 font-medium text-content" title={c.nome}>{c.nome || "—"}</td>,
      <td key="t" className="px-3 py-2 text-center text-content-muted">{c.tipo}</td>,
      <td key="c" className="px-3 py-2 text-center tabular-nums text-content-muted">{compLabel(c.competencia)}</td>,
      <td key="p" className="px-3 py-2 text-center">
        {c.temProposta ? (
          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-800 dark:bg-sky-900/50 dark:text-sky-200">com proposta</span>
        ) : (
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-700/50 dark:text-slate-300">direto</span>
        )}
      </td>,
      <td key="v" className="px-3 py-2 text-right font-semibold tabular-nums text-content">{fmtBRL(c.valor)}</td>,
    ],
    sortValues: [c.nome, c.tipo, c.competencia, c.temProposta ? 1 : 0, c.valor],
  }));

  const toolbar = (
    <Suspense fallback={null}>
      <FiltersBar paramKeys={["de", "ate"]}>
        <PeriodFilter />
      </FiltersBar>
    </Suspense>
  );

  return (
    <Shell
      title="Resultado"
      subtitle="Da carteira Sisprime: das propostas geradas ao quanto foi efetivamente recuperado."
      toolbar={toolbar}
      active="resultado"
    >
      {/* Hero KPIs */}
      <Exportable id="resultado-kpis" label="KPIs · Resultado" className="block">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard label="Valor recuperado" value={fmtBRL(r.recuperado, { compact: true })} accent="emerald" hint={`${fmtNum(r.baixas)} baixas pagas`} />
          <KpiCard label="Propostas geradas" value={fmtNum(r.propostas)} accent="azure" subValue={fmtBRL(r.valorProposto, { compact: true })} hint={`${fmtNum(r.devedores)} devedores`} />
          <KpiCard label="Taxa de aceite" value={fmtPct(r.taxaAceite)} accent="cyan" subValue={`${fmtNum(r.aceitas)} aceitas`} />
        </section>
      </Exportable>

      {/* Funil + destaque recuperação */}
      <Exportable id="resultado-funil" label="Funil de recuperação" className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="rounded-xl bg-card p-6 shadow-card ring-1 ring-line lg:col-span-3">
          <h2 className="mb-1 text-lg font-semibold text-content">Funil de recuperação</h2>
          <p className="mb-4 text-xs text-content-muted">Da proposta gerada à recuperação efetiva (cruzamento por CPF/CNPJ)</p>
          <FunnelExec stages={stages} />
        </div>
        <div className="flex flex-col justify-between gap-4 rounded-xl bg-gradient-to-br from-[#082b4a] to-[#0e5fac] p-6 text-white shadow-card lg:col-span-2">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-sky-200/80">Recuperação total no período</div>
            <div className="mt-2 text-4xl font-semibold tabular-nums">{fmtBRL(r.recuperado, { compact: true })}</div>
            <div className="mt-1 text-sm text-sky-100">{fmtNum(r.baixas)} baixas · {fmtNum(r.devedoresRecuperados)} devedores</div>
          </div>
          <div className="space-y-2 border-t border-white/15 pt-3 text-sm">
            <div className="flex justify-between"><span className="text-sky-200/80">Vindo de propostas</span><span className="font-semibold tabular-nums">{fmtBRL(r.recuperadoComProposta, { compact: true })}</span></div>
            <div className="flex justify-between"><span className="text-sky-200/80">Recuperação direta</span><span className="font-semibold tabular-nums">{fmtBRL(r.recuperadoSemProposta, { compact: true })}</span></div>
          </div>
        </div>
      </Exportable>

      {/* Evolução: proposto × recuperado + % + drilldown + comparativo */}
      <Exportable id="resultado-evolucao" label="Evolução da recuperação" className="mt-8 block rounded-xl bg-card p-6 shadow-card ring-1 ring-line">
        <h2 className="mb-1 text-lg font-semibold text-content">Evolução da recuperação</h2>
        <p className="mb-3 text-xs text-content-muted">Proposto × recuperado com % de conversão · clique nas barras para detalhar por mês · ou alterne para o comparativo anual acumulado</p>
        <Suspense fallback={<div className="h-[320px]" />}>
          <EvolucaoResultadoChart data={matriz} />
        </Suspense>
      </Exportable>

      {/* Resultado por ano + Top */}
      <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Exportable id="resultado-por-ano" label="Resultado por ano" className="block">
          <SortableCard title="Resultado por ano" subtitle="Propostas geradas × valor recuperado" columns={anoColumns} rows={anoRows} initialSort={{ key: "ano", dir: "desc" }} />
        </Exportable>
        <Exportable id="resultado-top" label="Maiores recuperações" className="block">
          <SortableCard title="Maiores recuperações" subtitle="Top 12 baixas no período" columns={topColumns} rows={topRows} initialSort={{ key: "valor", dir: "desc" }} />
        </Exportable>
      </section>

      <footer className="mt-10 border-t border-line pt-4 text-xs text-content-subtle">
        Propostas: planilhas de envio (aba Resumo). Recuperação: contabilizações mensais. Cruzamento por CPF/CNPJ — a
        “recuperação direta” são baixas cujo devedor não consta na base de propostas capturada (janelas distintas).
        Com a baixa parcela-a-parcela dá pra casar por contrato/processo e medir o pago vs. acordado.
      </footer>
    </Shell>
  );
}
