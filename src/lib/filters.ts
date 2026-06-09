/**
 * Parse e construção de WHERE dos filtros da Visão Geral.
 *
 * Filtros (multi-seleção, afetam TODA a página):
 *   - fases      → tab_fase.descricao
 *   - comarcas   → z_tabela_comarca.descricao
 *   - acoes      → tab_acao.descricao
 *   - de / ate   → período de ajuizamento (cad_processo.entrada)
 *
 * Drill (afeta SÓ o gráfico de evolução):
 *   - ano  (YYYY)      → desce de ano para mês
 *   - mes  (YYYY-MM)   → desce de mês para dia
 */

export type Filters = {
  /** Grupos de trabalho CPJ: [10]=ativas, [21]=passivas, [10,21]=ambos.
   *  Definido pela ROTA (não vem da URL). */
  grupos: number[];
  fases: string[];
  comarcas: string[];
  acoes: string[];
  de: string | null;   // 'YYYY-MM-DD'
  ate: string | null;  // 'YYYY-MM-DD'
  // drill (chart-only)
  ano: number | null;
  mes: string | null;  // 'YYYY-MM'
};

type RawParams = Record<string, string | string[] | undefined>;

function csv(v: string | string[] | undefined): string[] {
  if (!v) return [];
  const s = Array.isArray(v) ? v.join(",") : v;
  return s.split(",").map((x) => x.trim()).filter(Boolean);
}

function one(v: string | string[] | undefined): string | null {
  if (!v) return null;
  const s = Array.isArray(v) ? v[0] : v;
  return s.trim() || null;
}

const isYmd = (s: string | null) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
const isYm = (s: string | null) => !!s && /^\d{4}-\d{2}$/.test(s);

export function parseFilters(sp: RawParams, grupos: number[] = [10, 21]): Filters {
  const anoRaw = one(sp.ano);
  const ano = anoRaw && /^\d{4}$/.test(anoRaw) ? Number(anoRaw) : null;
  const mes = isYm(one(sp.mes)) ? one(sp.mes) : null;
  return {
    grupos,
    fases: csv(sp.fases),
    comarcas: csv(sp.comarcas),
    acoes: csv(sp.acoes),
    de: isYmd(one(sp.de)) ? one(sp.de) : null,
    ate: isYmd(one(sp.ate)) ? one(sp.ate) : null,
    ano,
    mes,
  };
}

/** Escapa um literal de string para SQL (aspas simples duplicadas). */
function lit(v: string): string {
  return `'${v.replace(/'/g, "''")}'`;
}

function inList(vals: string[]): string {
  return vals.map(lit).join(", ");
}

/**
 * Cláusulas extras dos filtros de seleção/período — NÃO inclui o drill
 * (ano/mês), que só se aplica ao gráfico. Sempre começa com " AND ..." ou "".
 * Usa subqueries por código pra funcionar em qualquer query sem exigir joins.
 */
export function buildWhere(f: Filters): string {
  const parts: string[] = [];
  if (f.fases.length)
    parts.push(`p.fase IN (SELECT codigo FROM tab_fase WHERE descricao IN (${inList(f.fases)}))`);
  if (f.comarcas.length)
    parts.push(
      `p.z_comarca IN (SELECT id_comarca FROM z_tabela_comarca WHERE descricao IN (${inList(f.comarcas)}))`
    );
  if (f.acoes.length)
    parts.push(`p.acao IN (SELECT sigla FROM tab_acao WHERE descricao IN (${inList(f.acoes)}))`);
  if (f.de) parts.push(`p.entrada >= ${lit(f.de)}`);
  if (f.ate) parts.push(`p.entrada < DATE_ADD(${lit(f.ate)}, INTERVAL 1 DAY)`);
  return parts.length ? " AND " + parts.join(" AND ") : "";
}

/** Nível atual do drilldown do gráfico de evolução. */
export type DrillLevel = "ano" | "mes" | "dia";
export function drillLevel(f: Filters): DrillLevel {
  if (f.mes) return "dia";
  if (f.ano) return "mes";
  return "ano";
}
