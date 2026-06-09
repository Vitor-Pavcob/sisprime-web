import { Suspense } from "react";
import { runSql } from "@/lib/metabase";
import { parseFilters, drillLevel } from "@/lib/filters";
import {
  qKpis,
  qDevedores,
  qPorFase,
  qPorAcao,
  qPorComarca,
  qEvolucao,
  qTopProcessos,
  qEncerradosClasse,
  qMixCpf,
  qOpcoesFases,
  qOpcoesComarcas,
  qOpcoesAcoes,
} from "@/lib/queries";
import { Shell } from "@/components/Shell";
import { KpiCard } from "@/components/KpiCard";
import { DonutChart } from "@/components/DonutChart";
import { BarCell } from "@/components/BarCell";
import {
  SortableCard,
  type SortableColumn,
  type SortableRow,
} from "@/components/SortableCard";
import { EvolucaoChart, type EvolucaoPonto } from "@/components/EvolucaoChart";
import { FiltersBar } from "@/components/FiltersBar";
import { MultiSelectFilter } from "@/components/MultiSelectFilter";
import { PeriodFilter } from "@/components/PeriodFilter";
import { fmtBRL, fmtNum, fmtPct } from "@/lib/format";

const num = (v: unknown) => Number(v ?? 0);

type Kpi = {
  processos: number; valor_causa_total: number;
};
type Dev = { devedores: number; avalistas: number };
type FaseRow = { fase: string; processos: number; valor: number };
type AcaoRow = { acao: string; processos: number; valor: number };
type ComarcaRow = { comarca: string; uf: string; processos: number; valor: number };
type EvoRow = { bucket: string; processos: number; valor: number };
type TopRow = { numero: string; autor: string; reu: string; fase: string; comarca: string; tipo: string; valor: number };
type ClasseRow = { classe: string; processos: number; valor: number };
type MixRow = { mix: string; cpfs: number };

const CLASSE_COLORS: Record<string, string> = { "Judicial": "#0a2e52", "Extrajudicial": "#5eb3f2" };
const MIX_COLORS: Record<string, string> = {
  "Puramente judicial": "#0a2e52",
  "Puramente extrajudicial": "#5eb3f2",
  "Ambas": "#f59e0b",
};

const FaseIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h12" /></svg>
);
const ComarcaIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a7 7 0 017 7c0 5-7 13-7 13S5 14 5 9a7 7 0 017-7z" /><circle cx="12" cy="9" r="2.5" /></svg>
);
const AcaoIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="9" /></svg>
);

export async function ProcessosScreen({
  grupos,
  title,
  subtitle,
  active,
  sp,
}: {
  grupos: number[];
  title: string;
  subtitle: string;
  active: "ativas" | "passivas";
  sp: Record<string, string | string[] | undefined>;
}) {
  const filters = parseFilters(sp, grupos);
  const level = drillLevel(filters);
  const ladoLabel = active === "ativas" ? "Ativa" : "Passiva";

  let kpi: Kpi = { processos: 0, valor_causa_total: 0 };
  let dev: Dev = { devedores: 0, avalistas: 0 };
  let porFase: FaseRow[] = [];
  let porAcao: AcaoRow[] = [];
  let porComarca: ComarcaRow[] = [];
  let evolucao: EvolucaoPonto[] = [];
  let topProc: TopRow[] = [];
  let encClasse: ClasseRow[] = [];
  let mixCpf: MixRow[] = [];
  let optFases: string[] = [];
  let optComarcas: string[] = [];
  let optAcoes: string[] = [];
  let erro: string | null = null;

  try {
    const [k, d, f, a, c, e, tp, ec, mx, of, oc, oa] = await Promise.all([
      runSql<Kpi>(qKpis(filters)),
      runSql<Dev>(qDevedores(filters)),
      runSql<FaseRow>(qPorFase(filters)),
      runSql<AcaoRow>(qPorAcao(filters)),
      runSql<ComarcaRow>(qPorComarca(filters)),
      runSql<EvoRow>(qEvolucao(filters)),
      runSql<TopRow>(qTopProcessos(filters)),
      runSql<ClasseRow>(qEncerradosClasse(filters)),
      runSql<MixRow>(qMixCpf(filters)),
      runSql<{ v: string }>(qOpcoesFases(grupos)),
      runSql<{ v: string }>(qOpcoesComarcas(grupos)),
      runSql<{ v: string }>(qOpcoesAcoes(grupos)),
    ]);
    kpi = k[0] ?? kpi;
    dev = d[0] ?? dev;
    porFase = f;
    porAcao = a;
    porComarca = c;
    evolucao = e.map((r) => ({ bucket: String(r.bucket), processos: num(r.processos), valor: num(r.valor) }));
    topProc = tp;
    encClasse = ec;
    mixCpf = mx;
    optFases = of.map((r) => r.v).filter(Boolean);
    optComarcas = oc.map((r) => r.v).filter(Boolean);
    optAcoes = oa.map((r) => r.v).filter(Boolean);
  } catch (e) {
    erro = e instanceof Error ? e.message : String(e);
    console.warn(`[${active}] Metabase falhou:`, erro);
  }

  const valorTotal = num(kpi.valor_causa_total);
  const totalProc = num(kpi.processos) || 1;
  const ticket = valorTotal / totalProc;

  const encTotal = encClasse.reduce((s, r) => s + num(r.processos), 0);
  const mixTotal = mixCpf.reduce((s, r) => s + num(r.cpfs), 0);
  const MIX_ORDER = ["Puramente judicial", "Puramente extrajudicial", "Ambas"];
  const mixOrdered = [...mixCpf].sort((a, b) => MIX_ORDER.indexOf(a.mix) - MIX_ORDER.indexOf(b.mix));

  // ---- Tabela: por fase ----
  const maxFaseProc = Math.max(...porFase.map((r) => num(r.processos)), 1);
  const totalFaseValor = porFase.reduce((s, r) => s + num(r.valor), 0);
  const faseColumns: SortableColumn[] = [
    { key: "fase", header: "Fase", align: "left" },
    { key: "processos", header: "Processos", align: "right" },
    { key: "valor", header: "Valor de causa", align: "right" },
    { key: "pct", header: "% proc.", align: "right" },
  ];
  const faseRows: SortableRow[] = porFase.map((r) => {
    const pct = num(r.processos) / totalProc;
    return {
      id: r.fase,
      cells: [
        <td key="f" className="px-3 py-2 font-medium text-content">{r.fase}</td>,
        <BarCell key="p" value={num(r.processos)} max={maxFaseProc} color="var(--bar-blue)" />,
        <td key="v" className="px-3 py-2 text-right tabular-nums text-content">{fmtBRL(num(r.valor))}</td>,
        <td key="pc" className="px-3 py-2 text-right tabular-nums text-content-muted">{fmtPct(pct)}</td>,
      ],
      sortValues: [r.fase, num(r.processos), num(r.valor), pct],
    };
  });

  // ---- Tabela: por ação ----
  const maxAcaoProc = Math.max(...porAcao.map((r) => num(r.processos)), 1);
  const acaoColumns: SortableColumn[] = [
    { key: "acao", header: "Tipo de ação", align: "left" },
    { key: "processos", header: "Processos", align: "right" },
    { key: "valor", header: "Valor de causa", align: "right" },
  ];
  const acaoRows: SortableRow[] = porAcao.map((r) => ({
    id: r.acao,
    cells: [
      <td key="a" className="px-3 py-2 font-medium text-content">{r.acao}</td>,
      <BarCell key="p" value={num(r.processos)} max={maxAcaoProc} color="var(--bar-cyan)" />,
      <td key="v" className="px-3 py-2 text-right tabular-nums text-content">{fmtBRL(num(r.valor))}</td>,
    ],
    sortValues: [r.acao, num(r.processos), num(r.valor)],
  }));

  // ---- Tabela: por comarca ----
  const maxComProc = Math.max(...porComarca.map((r) => num(r.processos)), 1);
  const comarcaColumns: SortableColumn[] = [
    { key: "comarca", header: "Comarca", align: "left" },
    { key: "uf", header: "UF", align: "center" },
    { key: "processos", header: "Processos", align: "right" },
    { key: "valor", header: "Valor de causa", align: "right" },
  ];
  const comarcaRows: SortableRow[] = porComarca.map((r) => ({
    id: r.comarca + r.uf,
    cells: [
      <td key="c" className="px-3 py-2 font-medium text-content">{r.comarca}</td>,
      <td key="u" className="px-3 py-2 text-center text-content-muted">{r.uf}</td>,
      <BarCell key="p" value={num(r.processos)} max={maxComProc} color="var(--bar-blue)" />,
      <td key="v" className="px-3 py-2 text-right tabular-nums text-content">{fmtBRL(num(r.valor))}</td>,
    ],
    sortValues: [r.comarca, r.uf, num(r.processos), num(r.valor)],
  }));

  // ---- Tabela: top processos ----
  const contraHeader = active === "ativas" ? "Réu (devedor)" : "Autor (parte contrária)";
  const topColumns: SortableColumn[] = [
    { key: "numero", header: "Nº do processo", align: "left" },
    { key: "reu", header: contraHeader, align: "left" },
    { key: "fase", header: "Fase", align: "left" },
    { key: "comarca", header: "Comarca", align: "left" },
    { key: "valor", header: "Valor de causa", align: "right" },
  ];
  const topRows: SortableRow[] = topProc.map((r, i) => {
    const contra = active === "ativas" ? r.reu : r.autor;
    return {
      id: `${r.numero}-${i}`,
      cells: [
        <td key="n" className="px-3 py-2 font-mono text-xs text-content">{r.numero}</td>,
        <td key="r" className="max-w-[260px] truncate px-3 py-2 text-content" title={contra}>{contra}</td>,
        <td key="f" className="px-3 py-2 text-content-muted">{r.fase}</td>,
        <td key="c" className="px-3 py-2 text-content-muted">{r.comarca}</td>,
        <td key="v" className="px-3 py-2 text-right font-semibold tabular-nums text-content">{fmtBRL(num(r.valor))}</td>,
      ],
      sortValues: [r.numero, contra, r.fase, r.comarca, num(r.valor)],
    };
  });

  const toolbar = (
    <Suspense fallback={null}>
      <FiltersBar paramKeys={["fases", "comarcas", "acoes", "de", "ate"]}>
        <MultiSelectFilter paramKey="fases" allLabel="Todas as fases" singularHint="fase" pluralHint="fases" options={optFases} icon={FaseIcon} />
        <MultiSelectFilter paramKey="comarcas" allLabel="Todas as comarcas" singularHint="comarca" pluralHint="comarcas" options={optComarcas} icon={ComarcaIcon} />
        <MultiSelectFilter paramKey="acoes" allLabel="Todos os tipos de ação" singularHint="tipo de ação" pluralHint="tipos de ação" options={optAcoes} icon={AcaoIcon} />
        <PeriodFilter />
      </FiltersBar>
    </Suspense>
  );

  return (
    <Shell title={title} subtitle={subtitle} toolbar={toolbar} active={active}>
      {erro && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200">
          Conexão com a base indisponível no momento — atualize em alguns segundos.
        </div>
      )}

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard label={`Ações ${active === "ativas" ? "ativas" : "passivas"}`} value={fmtNum(num(kpi.processos))} accent="azure" hint="capa (sem incidentes)" />
        <KpiCard label="Valor de causa" value={fmtBRL(valorTotal, { compact: true })} accent="emerald" hint="somatório total" />
        <KpiCard label="Ticket médio" value={fmtBRL(ticket, { compact: true })} accent="cyan" hint="por processo" />
        <KpiCard label="Devedores" value={fmtNum(num(dev.devedores))} accent="amber" hint="principal · CPF/CNPJ único" />
        <KpiCard label="Avalistas" value={fmtNum(num(dev.avalistas))} accent="navy" hint="garantidores · CPF único" />
        <KpiCard label="Encerrados" value={fmtNum(encTotal)} accent="azure" hint={`${fmtPct(encTotal / totalProc)} dos processos`} />
      </section>

      {/* Evolução */}
      <section className="mt-8 rounded-xl bg-card p-6 shadow-card ring-1 ring-line">
        <h2 className="mb-1 text-lg font-semibold text-content">Evolução por ajuizamento</h2>
        <p className="mb-3 text-xs text-content-muted">
          Clique numa barra para detalhar: ano → mês → dia · barras = processos, linha = valor de causa
        </p>
        <Suspense fallback={<div className="h-[300px]" />}>
          <EvolucaoChart data={evolucao} level={level} />
        </Suspense>
      </section>

      {/* Classificação extrajudicial × judicial */}
      <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-card p-6 shadow-card ring-1 ring-line">
          <h2 className="mb-1 text-lg font-semibold text-content">Encerrados: extrajudicial × judicial</h2>
          <p className="mb-3 text-xs text-content-muted">Dos processos encerrados no recorte atual, quantos via extrajudicial vs. judicial (ajuizados)</p>
          <DonutChart
            data={encClasse.map((r) => ({ name: r.classe, value: num(r.processos), fill: CLASSE_COLORS[r.classe] ?? "#64748b" }))}
            centerLabel="encerrados"
            centerValue={fmtNum(encTotal)}
            height={220}
          />
          <div className="mt-3 space-y-1.5">
            {encClasse.map((r) => (
              <div key={r.classe} className="flex items-center gap-2 text-xs">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CLASSE_COLORS[r.classe] ?? "#64748b" }} />
                <span className="font-medium text-content">{r.classe}</span>
                <span className="ml-auto tabular-nums text-content-muted">{fmtNum(num(r.processos))} · {fmtBRL(num(r.valor), { compact: true })}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-card p-6 shadow-card ring-1 ring-line">
          <h2 className="mb-1 text-lg font-semibold text-content">Mix de devedores por classificação</h2>
          <p className="mb-3 text-xs text-content-muted">Devedores (CPF/CNPJ) com processos puramente extrajudiciais, puramente judiciais, ou nas duas vias</p>
          <DonutChart
            data={mixOrdered.map((r) => ({ name: r.mix, value: num(r.cpfs), fill: MIX_COLORS[r.mix] ?? "#64748b" }))}
            centerLabel="devedores"
            centerValue={fmtNum(mixTotal)}
            height={220}
          />
          <div className="mt-3 space-y-1.5">
            {mixOrdered.map((r) => {
              const pct = mixTotal > 0 ? num(r.cpfs) / mixTotal : 0;
              return (
                <div key={r.mix} className="flex items-center gap-2 text-xs">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: MIX_COLORS[r.mix] ?? "#64748b" }} />
                  <span className="font-medium text-content">{r.mix}</span>
                  <span className="ml-auto tabular-nums text-content-muted">{fmtNum(num(r.cpfs))} · {fmtPct(pct)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Fase processual */}
      <section className="mt-8">
        <SortableCard
          title="Distribuição por fase processual"
          subtitle={`${porFase.length} fases · valor de causa total ${fmtBRL(totalFaseValor, { compact: true })}`}
          columns={faseColumns}
          rows={faseRows}
          initialSort={{ key: "processos", dir: "desc" }}
        />
      </section>

      {/* Ação + Comarca */}
      <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SortableCard title="Por tipo de ação" subtitle="Top 12" columns={acaoColumns} rows={acaoRows} initialSort={{ key: "processos", dir: "desc" }} />
        <SortableCard title="Por comarca" subtitle="Top 12 · concentração no Paraná" columns={comarcaColumns} rows={comarcaRows} initialSort={{ key: "processos", dir: "desc" }} />
      </section>

      {/* Top processos */}
      <section className="mt-8">
        <SortableCard title="Maiores processos por valor de causa" subtitle="Top 15" columns={topColumns} rows={topRows} initialSort={{ key: "valor", dir: "desc" }} />
      </section>

      <footer className="mt-10 border-t border-line pt-4 text-xs text-content-subtle">
        Fonte: CPJ Amaral · grupo de trabalho {grupos.join("/")} (Sisprime — Ações {ladoLabel}s). {totalProc} processos no recorte.
      </footer>
    </Shell>
  );
}
