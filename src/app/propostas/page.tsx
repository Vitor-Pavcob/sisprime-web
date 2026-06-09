import { Suspense } from "react";
import {
  PROPOSTAS,
  PROPOSTAS_META,
  parsePropFilters,
  applyFilters,
  evolucaoBuckets,
  drillLevel,
  opcoes,
  type Proposta,
} from "@/lib/propostas-data";
import { ANO_MIN, PROPOSTA_STATUS_VALIDOS } from "@/lib/config";
import { Shell } from "@/components/Shell";
import { KpiCard } from "@/components/KpiCard";
import { DonutChart } from "@/components/DonutChart";
import { BarCell } from "@/components/BarCell";
import {
  SortableCard,
  type SortableColumn,
  type SortableRow,
} from "@/components/SortableCard";
import { EvolucaoChart } from "@/components/EvolucaoChart";
import { FiltersBar } from "@/components/FiltersBar";
import { MultiSelectFilter } from "@/components/MultiSelectFilter";
import { PeriodFilter } from "@/components/PeriodFilter";
import { fmtBRL, fmtNum, fmtPct } from "@/lib/format";
import { blueAt } from "@/lib/theme";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  "Aceita": "#1e88e5",
  "Parcelada enviada": "#00a0df",
  "Aguardando contraproposta": "#f59e0b",
  "Em análise": "#64748b",
  "Bloqueio judicial": "#ef4444",
  "Outros": "#94a3b8",
};

const StatusIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M9 12l2 2 4-4" /></svg>
);
const CarteiraIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /></svg>
);
const CondicaoIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h12" /></svg>
);
const EscritorioIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18" /><path d="M5 21V8l7-4 7 4v13" /></svg>
);

const desagio = (acordo: number, atualizado: number) => (atualizado > 0 ? 1 - acordo / atualizado : 0);

function groupBy(rows: Proposta[], key: keyof Proposta) {
  const m = new Map<string, { processos: number; valor: number; atualizado: number }>();
  for (const r of rows) {
    const k = String(r[key]);
    const cur = m.get(k) ?? { processos: 0, valor: 0, atualizado: 0 };
    cur.processos += 1;
    cur.valor += r.valorAcordo;
    cur.atualizado += r.valorAtualizado;
    m.set(k, cur);
  }
  return [...m.entries()].map(([nome, v]) => ({ nome, ...v })).sort((a, b) => b.processos - a.processos);
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const f = parsePropFilters(await searchParams);
  const level = drillLevel(f);
  // Só os períodos com contabilização (alinha com a base de recuperação).
  const baseRows = PROPOSTAS.filter(
    (p) => p.ano != null && p.ano >= ANO_MIN && PROPOSTA_STATUS_VALIDOS.has(p.status)
  );
  const rows = applyFilters(baseRows, f);
  const opts = opcoes();
  const janela = `${ANO_MIN} em diante`;

  const total = rows.length;
  const sumAcordo = rows.reduce((s, r) => s + r.valorAcordo, 0);
  const sumAtualizado = rows.reduce((s, r) => s + r.valorAtualizado, 0);
  const aceitas = rows.filter((r) => r.status === "Aceita").length;
  const cpfs = new Set(rows.map((r) => r.cpf).filter(Boolean)).size;
  const ticket = total > 0 ? sumAcordo / total : 0;

  const porStatus = groupBy(rows, "status");
  const porCarteira = groupBy(rows, "carteira");
  const porCondicao = groupBy(rows, "condicao");
  const evolucao = evolucaoBuckets(rows, f);

  // ---- Tabela: por status ----
  const maxStatus = Math.max(...porStatus.map((r) => r.processos), 1);
  const statusColumns: SortableColumn[] = [
    { key: "status", header: "Status", align: "left" },
    { key: "processos", header: "Propostas", align: "right" },
    { key: "valor", header: "Valor de acordo", align: "right" },
    { key: "pct", header: "% propostas", align: "right" },
  ];
  const statusRows: SortableRow[] = porStatus.map((r) => {
    const pct = total > 0 ? r.processos / total : 0;
    return {
      id: r.nome,
      cells: [
        <td key="s" className="px-3 py-2">
          <span className="inline-flex items-center gap-2 font-medium text-content">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[r.nome] ?? "#94a3b8" }} />
            {r.nome}
          </span>
        </td>,
        <BarCell key="p" value={r.processos} max={maxStatus} color="var(--bar-blue)" />,
        <td key="v" className="px-3 py-2 text-right tabular-nums text-content">{fmtBRL(r.valor)}</td>,
        <td key="pc" className="px-3 py-2 text-right tabular-nums text-content-muted">{fmtPct(pct)}</td>,
      ],
      sortValues: [r.nome, r.processos, r.valor, pct],
    };
  });

  // ---- Tabela: por carteira (com deságio) ----
  const maxCart = Math.max(...porCarteira.map((r) => r.processos), 1);
  const cartColumns: SortableColumn[] = [
    { key: "carteira", header: "Carteira", align: "left" },
    { key: "processos", header: "Propostas", align: "right" },
    { key: "valor", header: "Valor de acordo", align: "right" },
    { key: "desagio", header: "Deságio médio", align: "right" },
  ];
  const cartRows: SortableRow[] = porCarteira.map((r) => {
    const d = desagio(r.valor, r.atualizado);
    return {
      id: r.nome,
      cells: [
        <td key="c" className="px-3 py-2 font-medium text-content">{r.nome}</td>,
        <BarCell key="p" value={r.processos} max={maxCart} color="var(--bar-cyan)" />,
        <td key="v" className="px-3 py-2 text-right tabular-nums text-content">{fmtBRL(r.valor)}</td>,
        <td key="d" className="px-3 py-2 text-right tabular-nums text-content-muted">{fmtPct(d)}</td>,
      ],
      sortValues: [r.nome, r.processos, r.valor, d],
    };
  });

  // ---- Tabela: top propostas ----
  const top = [...rows].sort((a, b) => b.valorAcordo - a.valorAcordo).slice(0, 15);
  const topColumns: SortableColumn[] = [
    { key: "devedor", header: "Devedor", align: "left" },
    { key: "carteira", header: "Carteira", align: "center" },
    { key: "status", header: "Status", align: "left" },
    { key: "atualizado", header: "Valor atualizado", align: "right" },
    { key: "acordo", header: "Valor de acordo", align: "right" },
    { key: "desagio", header: "Deságio", align: "right" },
    { key: "data", header: "Envio", align: "right" },
  ];
  const topRows: SortableRow[] = top.map((r, i) => {
    const d = desagio(r.valorAcordo, r.valorAtualizado);
    return {
      id: `${r.cpf}-${i}`,
      cells: [
        <td key="dv" className="max-w-[220px] truncate px-3 py-2 font-medium text-content" title={r.devedor}>{r.devedor || "—"}</td>,
        <td key="c" className="px-3 py-2 text-center text-content-muted">{r.carteira}</td>,
        <td key="s" className="px-3 py-2">
          <span className="inline-flex items-center gap-1.5 text-content-muted">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[r.status] ?? "#94a3b8" }} />
            {r.status}
          </span>
        </td>,
        <td key="va" className="px-3 py-2 text-right tabular-nums text-content-muted">{fmtBRL(r.valorAtualizado)}</td>,
        <td key="ac" className="px-3 py-2 text-right font-semibold tabular-nums text-content">{fmtBRL(r.valorAcordo)}</td>,
        <td key="d" className="px-3 py-2 text-right tabular-nums text-content-muted">{fmtPct(d)}</td>,
        <td key="dt" className="px-3 py-2 text-right tabular-nums text-content-muted">{r.dataEnvio ?? "—"}</td>,
      ],
      sortValues: [r.devedor, r.carteira, r.status, r.valorAtualizado, r.valorAcordo, d, r.dataEnvio ?? ""],
    };
  });

  const toolbar = (
    <Suspense fallback={null}>
      <FiltersBar paramKeys={["carteiras", "status", "condicoes", "escritorios", "de", "ate"]}>
        <MultiSelectFilter paramKey="status" allLabel="Todos os status" singularHint="status" pluralHint="status" options={opts.status} icon={StatusIcon} />
        <MultiSelectFilter paramKey="carteiras" allLabel="Todas as carteiras" singularHint="carteira" pluralHint="carteiras" options={opts.carteiras} icon={CarteiraIcon} />
        <MultiSelectFilter paramKey="condicoes" allLabel="Todas as condições" singularHint="condição" pluralHint="condições" options={opts.condicoes} icon={CondicaoIcon} />
        <MultiSelectFilter paramKey="escritorios" allLabel="Todos os escritórios" singularHint="escritório" pluralHint="escritórios" options={opts.escritorios} icon={EscritorioIcon} />
        <PeriodFilter />
      </FiltersBar>
    </Suspense>
  );

  return (
    <Shell
      title="Propostas"
      subtitle={`Propostas de acordo da carteira Sisprime · ${janela} · ${fmtNum(baseRows.length)} propostas.`}
      toolbar={toolbar}
      active="propostas"
    >
      {/* KPIs */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Propostas" value={fmtNum(total)} accent="azure" hint={`${cpfs} devedores`} />
        <KpiCard label="Valor de acordo" value={fmtBRL(sumAcordo, { compact: true })} accent="cyan" hint="proposto" />
        <KpiCard label="Taxa de aceite" value={fmtPct(total > 0 ? aceitas / total : 0)} accent="emerald" subValue={`${fmtNum(aceitas)} aceitas`} />
        <KpiCard label="Deságio médio" value={fmtPct(desagio(sumAcordo, sumAtualizado))} accent="amber" hint="vs. valor atualizado" />
        <KpiCard label="Ticket médio" value={fmtBRL(ticket, { compact: true })} accent="navy" hint="por proposta" />
        <KpiCard label="Valor atualizado" value={fmtBRL(sumAtualizado, { compact: true })} accent="azure" hint="dívida base" />
      </section>

      {/* Status + evolução */}
      <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl bg-card p-6 shadow-card ring-1 ring-line">
          <h2 className="mb-1 text-lg font-semibold text-content">Propostas por status</h2>
          <p className="mb-3 text-xs text-content-muted">Distribuição do desfecho das propostas</p>
          <DonutChart
            data={porStatus.map((r) => ({ name: r.nome, value: r.processos, fill: STATUS_COLORS[r.nome] ?? "#94a3b8" }))}
            centerLabel="propostas"
            centerValue={fmtNum(total)}
            height={220}
          />
          <div className="mt-3 space-y-1.5">
            {porStatus.map((r) => (
              <div key={r.nome} className="flex items-center gap-2 text-xs">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[r.nome] ?? "#94a3b8" }} />
                <span className="font-medium text-content">{r.nome}</span>
                <span className="ml-auto tabular-nums text-content-muted">{fmtNum(r.processos)} · {fmtBRL(r.valor, { compact: true })}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-card p-6 shadow-card ring-1 ring-line lg:col-span-2">
          <h2 className="mb-1 text-lg font-semibold text-content">Evolução das propostas</h2>
          <p className="mb-3 text-xs text-content-muted">
            Por data de envio · clique numa barra para detalhar (ano → mês → dia) · barras = propostas, linha = valor de acordo
          </p>
          <Suspense fallback={<div className="h-[300px]" />}>
            <EvolucaoChart data={evolucao} level={level} countLabel="propostas" valueLabel="em valor de acordo" />
          </Suspense>
        </div>
      </section>

      {/* Carteira + Condição */}
      <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SortableCard
            title="Por carteira"
            subtitle="Propostas, valor de acordo e deságio médio"
            columns={cartColumns}
            rows={cartRows}
            initialSort={{ key: "processos", dir: "desc" }}
          />
        </div>
        <div className="rounded-xl bg-card p-6 shadow-card ring-1 ring-line">
          <h2 className="mb-1 text-lg font-semibold text-content">Por condição</h2>
          <p className="mb-3 text-xs text-content-muted">À vista × parcelado</p>
          <DonutChart
            data={porCondicao.map((r, i) => ({ name: r.nome, value: r.processos, fill: blueAt(i) }))}
            centerLabel="propostas"
            centerValue={fmtNum(total)}
            height={200}
          />
          <div className="mt-3 space-y-1.5">
            {porCondicao.map((r, i) => (
              <div key={r.nome} className="flex items-center gap-2 text-xs">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: blueAt(i) }} />
                <span className="font-medium text-content">{r.nome}</span>
                <span className="ml-auto tabular-nums text-content-muted">{fmtNum(r.processos)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Status table */}
      <section className="mt-8">
        <SortableCard
          title="Resumo por status"
          subtitle={`${total} propostas no recorte atual`}
          columns={statusColumns}
          rows={statusRows}
          initialSort={{ key: "processos", dir: "desc" }}
        />
      </section>

      {/* Top propostas */}
      <section className="mt-8">
        <SortableCard
          title="Maiores propostas por valor de acordo"
          subtitle="Top 15"
          columns={topColumns}
          rows={topRows}
          initialSort={{ key: "acordo", dir: "desc" }}
        />
      </section>

      <footer className="mt-10 border-t border-line pt-4 text-xs text-content-subtle">
        Fonte: abas “Resumo” de {PROPOSTAS_META.arquivos.length} planilhas em rede (\\Srvad02…\SISPRIME\PROPOSTAS).
        Snapshot local de {PROPOSTAS_META.generatedAt}. Próximo passo: cruzar com a baixa de pagamentos.
      </footer>
    </Shell>
  );
}
