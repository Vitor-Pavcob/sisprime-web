import { Suspense } from "react";
import {
  CONTABILIZACOES,
  CONTAB_META,
  parseContabFilters,
  applyFilters,
  timelineMensal,
  crossRefPropostas,
  opcoes,
  type Contab,
} from "@/lib/contabilizacoes-data";
import { Shell } from "@/components/Shell";
import { KpiCard } from "@/components/KpiCard";
import { DonutChart } from "@/components/DonutChart";
import { BarCell } from "@/components/BarCell";
import {
  SortableCard,
  type SortableColumn,
  type SortableRow,
} from "@/components/SortableCard";
import { TimelineChart } from "@/components/TimelineChart";
import { FiltersBar } from "@/components/FiltersBar";
import { MultiSelectFilter } from "@/components/MultiSelectFilter";
import { PeriodFilter } from "@/components/PeriodFilter";
import { fmtBRL, fmtNum, fmtPct } from "@/lib/format";
import { blueAt } from "@/lib/theme";
import { ANO_MIN } from "@/lib/config";

export const dynamic = "force-dynamic";

const CONTAB_TIPO_COLORS: Record<string, string> = {
  "Judicial": "#1e88e5",
  "Amigável": "#00a0df",
  "Escritório 4": "#5eb3f2",
  "Extrajudicial": "#0a2e52",
};
const tipoColor = (t: string, i: number) => CONTAB_TIPO_COLORS[t] ?? blueAt(i);

const TipoIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /></svg>
);

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const compLabel = (c: string) => { const [y, m] = c.split("-"); return `${MESES[Number(m) - 1]}/${y.slice(2)}`; };

function groupByTipo(rows: Contab[]) {
  const m = new Map<string, { processos: number; valor: number }>();
  for (const r of rows) {
    const cur = m.get(r.tipo) ?? { processos: 0, valor: 0 };
    cur.processos += 1; cur.valor += r.valor;
    m.set(r.tipo, cur);
  }
  return [...m.entries()].map(([nome, v]) => ({ nome, ...v })).sort((a, b) => b.valor - a.valor);
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const f = parseContabFilters(await searchParams);
  const rows = applyFilters(CONTABILIZACOES, f);
  const opts = opcoes();

  const total = rows.length;
  const valorTotal = rows.reduce((s, r) => s + r.valor, 0);
  const ticket = total > 0 ? valorTotal / total : 0;
  const cpfs = new Set(rows.map((r) => r.cpfDigits).filter(Boolean)).size;
  const meses = new Set(rows.map((r) => r.competencia)).size;
  const mediaMensal = meses > 0 ? valorTotal / meses : 0;

  const porTipo = groupByTipo(rows);
  const timeline = timelineMensal(rows);
  const cross = crossRefPropostas(rows);

  // ---- Tabela: por tipo ----
  const maxTipoVal = Math.max(...porTipo.map((r) => r.valor), 1);
  const tipoColumns: SortableColumn[] = [
    { key: "tipo", header: "Tipo de acordo", align: "left" },
    { key: "processos", header: "Baixas", align: "right" },
    { key: "valor", header: "Valor recuperado", align: "right" },
    { key: "pct", header: "% valor", align: "right" },
  ];
  const tipoRows: SortableRow[] = porTipo.map((r, i) => {
    const pct = valorTotal > 0 ? r.valor / valorTotal : 0;
    return {
      id: r.nome,
      cells: [
        <td key="t" className="px-3 py-2">
          <span className="inline-flex items-center gap-2 font-medium text-content">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tipoColor(r.nome, i) }} />
            {r.nome}
          </span>
        </td>,
        <td key="p" className="px-3 py-2 text-right tabular-nums text-content-muted">{fmtNum(r.processos)}</td>,
        <td key="v" className="relative px-3 py-2 text-right">
          <div aria-hidden className="pointer-events-none absolute inset-y-1 left-1 rounded-sm" style={{ width: `calc(${(r.valor / maxTipoVal) * 100}% - 2px)`, backgroundColor: "var(--bar-blue)", opacity: 0.2 }} />
          <span className="relative font-semibold tabular-nums text-content">{fmtBRL(r.valor)}</span>
        </td>,
        <td key="pc" className="px-3 py-2 text-right tabular-nums text-content-muted">{fmtPct(pct)}</td>,
      ],
      sortValues: [r.nome, r.processos, r.valor, pct],
    };
  });

  // ---- Tabela: top baixas ----
  const top = [...rows].sort((a, b) => b.valor - a.valor).slice(0, 15);
  const topColumns: SortableColumn[] = [
    { key: "nome", header: "Cliente", align: "left" },
    { key: "tipo", header: "Tipo", align: "center" },
    { key: "autos", header: "Autos", align: "left" },
    { key: "competencia", header: "Competência", align: "center" },
    { key: "valor", header: "Valor recuperado", align: "right" },
  ];
  const topRows: SortableRow[] = top.map((r, i) => ({
    id: `${r.cpfDigits}-${i}`,
    cells: [
      <td key="n" className="max-w-[230px] truncate px-3 py-2 font-medium text-content" title={r.nome}>{r.nome || "—"}</td>,
      <td key="t" className="px-3 py-2 text-center text-content-muted">{r.tipo}</td>,
      <td key="a" className="px-3 py-2 font-mono text-xs text-content-muted">{r.autos && r.autos !== "0" ? r.autos : "—"}</td>,
      <td key="c" className="px-3 py-2 text-center tabular-nums text-content-muted">{compLabel(r.competencia)}</td>,
      <td key="v" className="px-3 py-2 text-right font-semibold tabular-nums text-content">{fmtBRL(r.valor)}</td>,
    ],
    sortValues: [r.nome, r.tipo, r.autos, r.competencia, r.valor],
  }));

  const pctConv = valorTotal > 0 ? cross.comProposta.valor / valorTotal : 0;

  const toolbar = (
    <Suspense fallback={null}>
      <FiltersBar paramKeys={["tipos", "de", "ate"]}>
        <MultiSelectFilter paramKey="tipos" allLabel="Todos os tipos" singularHint="tipo" pluralHint="tipos" options={opts.tipos} icon={TipoIcon} />
        <PeriodFilter />
      </FiltersBar>
    </Suspense>
  );

  return (
    <Shell
      title="Contabilizações"
      subtitle={`Baixas/recuperação da carteira Sisprime · ${ANO_MIN} em diante · ${fmtNum(total)} baixas (snapshot ${CONTAB_META.generatedAt.slice(0, 10)}).`}
      toolbar={toolbar}
      active="contabilizacoes"
    >
      {/* KPIs */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Valor recuperado" value={fmtBRL(valorTotal, { compact: true })} accent="emerald" hint="total contabilizado" />
        <KpiCard label="Baixas" value={fmtNum(total)} accent="azure" hint={`${cpfs} clientes`} />
        <KpiCard label="Ticket médio" value={fmtBRL(ticket, { compact: true })} accent="cyan" hint="por baixa" />
        <KpiCard label="Média mensal" value={fmtBRL(mediaMensal, { compact: true })} accent="navy" hint={`${meses} meses ativos`} />
        <KpiCard label="Com proposta" value={fmtPct(pctConv)} accent="azure" subValue={fmtBRL(cross.comProposta.valor, { compact: true })} hint="cruzado por CPF" />
        <KpiCard label="Recup. judicial" value={fmtPct(valorTotal > 0 ? (porTipo.find((t) => t.nome === "Judicial")?.valor ?? 0) / valorTotal : 0)} accent="amber" hint="do valor total" />
      </section>

      {/* Timeline + tipo */}
      <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl bg-card p-6 shadow-card ring-1 ring-line lg:col-span-2">
          <h2 className="mb-1 text-lg font-semibold text-content">Recuperação ao longo do tempo</h2>
          <p className="mb-3 text-xs text-content-muted">Por competência mensal · barras = recuperado no mês, linha = acumulado</p>
          <Suspense fallback={<div className="h-[300px]" />}>
            <TimelineChart data={timeline} />
          </Suspense>
        </div>

        <div className="rounded-xl bg-card p-6 shadow-card ring-1 ring-line">
          <h2 className="mb-1 text-lg font-semibold text-content">Por tipo de acordo</h2>
          <p className="mb-3 text-xs text-content-muted">Composição do valor recuperado</p>
          <DonutChart
            data={porTipo.map((r, i) => ({ name: r.nome, value: r.valor, fill: tipoColor(r.nome, i) }))}
            centerLabel="recuperado"
            centerValue={fmtBRL(valorTotal, { compact: true })}
            height={220}
            format="currency"
          />
          <div className="mt-3 space-y-1.5">
            {porTipo.map((r, i) => (
              <div key={r.nome} className="flex items-center gap-2 text-xs">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tipoColor(r.nome, i) }} />
                <span className="font-medium text-content">{r.nome}</span>
                <span className="ml-auto tabular-nums text-content-muted">{fmtNum(r.processos)} · {fmtBRL(r.valor, { compact: true })}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cruzamento com propostas */}
      <section className="mt-8 rounded-xl bg-card p-6 shadow-card ring-1 ring-line">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold text-content">Cruzamento com propostas</h2>
          <span className="text-xs text-content-muted">Baixas casadas com a base de propostas por CPF/CNPJ</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <CrossCard label="Com proposta registrada" sub="CPF consta nas propostas" proc={cross.comProposta.processos} valor={cross.comProposta.valor} total={valorTotal} color="var(--bar-blue)" />
          <CrossCard label="Com proposta aceita" sub="CPF com proposta status “Aceita”" proc={cross.comPropostaAceita.processos} valor={cross.comPropostaAceita.valor} total={valorTotal} color="var(--bar-cyan)" />
          <CrossCard label="Sem proposta na base" sub="recuperação fora do funil de propostas" proc={cross.semProposta.processos} valor={cross.semProposta.valor} total={valorTotal} color="var(--bar-gray)" />
        </div>
        <p className="mt-4 text-xs text-content-subtle">
          Cruzamento provisório por CPF/CNPJ. Quando subir a baixa parcela-a-parcela, dá pra casar por contrato/processo e medir
          <span className="font-medium text-content"> proposta aceita → efetivamente paga</span> e inadimplência das parcelas.
        </p>
      </section>

      {/* Tabelas */}
      <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SortableCard title="Por tipo de acordo" subtitle={`${total} baixas · ${fmtBRL(valorTotal, { compact: true })}`} columns={tipoColumns} rows={tipoRows} initialSort={{ key: "valor", dir: "desc" }} />
        <SortableCard title="Maiores baixas" subtitle="Top 15 por valor recuperado" columns={topColumns} rows={topRows} initialSort={{ key: "valor", dir: "desc" }} />
      </section>

      <footer className="mt-10 border-t border-line pt-4 text-xs text-content-subtle">
        Fonte: {CONTAB_META.arquivos.length} arquivos mensais em rede (…\SISPRIME\CONTABILIZAÇÕES), aba de dados de cada mês.
        Snapshot local de {CONTAB_META.generatedAt}. Operadora: Thayana Ramos.
      </footer>
    </Shell>
  );
}

function CrossCard({ label, sub, proc, valor, total, color }: { label: string; sub: string; proc: number; valor: number; total: number; color: string }) {
  const pct = total > 0 ? valor / total : 0;
  return (
    <div className="rounded-lg border border-line bg-card-soft p-4">
      <div className="flex items-center gap-2">
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-sm font-semibold text-content">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-content">{fmtBRL(valor, { compact: true })}</div>
      <div className="mt-1 text-xs text-content-muted">{fmtNum(proc)} baixas · {fmtPct(pct)} do valor</div>
      <div className="mt-0.5 text-[11px] text-content-subtle">{sub}</div>
    </div>
  );
}
