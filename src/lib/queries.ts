/**
 * Queries dos processos Sisprime no CPJ AMARAL (Metabase db=7, MySQL).
 *
 * A Sisprime é identificada pelos grupos de trabalho do CPJ:
 *   grupo_trabalho = 10 → "SISPRIME - AÇÕES ATIVAS"
 *   grupo_trabalho = 21 → "SISPRIME - AÇÕES PASSIVAS"
 *
 * `incidente = 0` restringe à capa do processo (exclui incidentes/apensos).
 *
 * Todas as queries de dados recebem `Filters` e aplicam buildWhere(f) sobre o
 * filtro-base. O gráfico de evolução (qEvolucao) ainda aplica o drill ano/mês.
 */
import { buildWhere, drillLevel, JUDICIAL_EXPR, type Filters } from "./filters";

// Filtro-base reaproveitado por todas as queries. `p` = alias de cad_processo.
// grupos: [10]=ativas, [21]=passivas, [10,21]=ambos (definido pela rota).
// Base completa do CPJ (sem piso de ano) — o recorte por período/situação fica
// a cargo dos filtros. O piso de 2025 segue valendo só p/ propostas/contab.
const baseG = (grupos: number[]) =>
  `p.grupo_trabalho IN (${grupos.join(", ")}) AND p.incidente = 0`;

const W = (f: Filters) => baseG(f.grupos) + buildWhere(f);

/** KPIs de topo: totais, split ativas/passivas e valor de causa. */
export const qKpis = (f: Filters) => `
  SELECT
    COUNT(*)                                              AS processos,
    SUM(p.grupo_trabalho = 10)                            AS ativas,
    SUM(p.grupo_trabalho = 21)                            AS passivas,
    ROUND(SUM(p.valor_causa), 2)                          AS valor_causa_total,
    ROUND(SUM(CASE WHEN p.grupo_trabalho = 10 THEN p.valor_causa ELSE 0 END), 2) AS valor_ativas,
    ROUND(SUM(CASE WHEN p.grupo_trabalho = 21 THEN p.valor_causa ELSE 0 END), 2) AS valor_passivas
  FROM cad_processo p
  WHERE ${W(f)}
`;

/**
 * Devedores e avalistas únicos, contados por CPF/CNPJ.
 * Devedor = parte principal do processo (1º réu nas ativas, 1º autor nas
 * passivas) — mesma definição do "mix de devedores" (`qMixCpf`), pra os
 * números baterem. Avalistas = garantidores (qualificacao AVALISTA) por CPF.
 */
export const qDevedores = (f: Filters) => `
  SELECT
    (
      SELECT COUNT(DISTINCT REGEXP_REPLACE(pe.cpf_cnpj, '[^0-9]', ''))
      FROM cad_processo p
      JOIN cad_pessoa pe ON pe.codigo = CASE WHEN p.grupo_trabalho = 10 THEN p.primeiro_reu ELSE p.primeiro_autor END
      WHERE ${W(f)} AND pe.cpf_cnpj IS NOT NULL AND TRIM(pe.cpf_cnpj) NOT IN ('', '0')
    ) AS devedores,
    (
      SELECT COUNT(DISTINCT REGEXP_REPLACE(pe.cpf_cnpj, '[^0-9]', ''))
      FROM cad_envolvido e
      JOIN cad_processo p     ON p.arquivo = e.arquivo AND p.ficha = e.ficha
      JOIN tab_qualificacao q ON q.codigo = e.qualificacao
      JOIN cad_pessoa pe      ON pe.codigo = e.pessoa
      WHERE ${W(f)} AND q.descricao = 'AVALISTA' AND pe.cpf_cnpj IS NOT NULL AND TRIM(pe.cpf_cnpj) NOT IN ('', '0')
    ) AS avalistas
`;

/** Split Ações Ativas × Passivas (qtde + valor de causa). */
export const qPorTipo = (f: Filters) => `
  SELECT
    CASE p.grupo_trabalho WHEN 10 THEN 'Ações Ativas' ELSE 'Ações Passivas' END AS tipo,
    COUNT(*)                     AS processos,
    ROUND(SUM(p.valor_causa), 2) AS valor
  FROM cad_processo p
  WHERE ${W(f)}
  GROUP BY p.grupo_trabalho
  ORDER BY processos DESC
`;

/** Distribuição por fase processual. */
export const qPorFase = (f: Filters) => `
  SELECT
    COALESCE(NULLIF(fa.descricao, ''), 'Sem fase') AS fase,
    COUNT(*)                     AS processos,
    ROUND(SUM(p.valor_causa), 2) AS valor
  FROM cad_processo p
  LEFT JOIN tab_fase fa ON fa.codigo = p.fase
  WHERE ${W(f)}
  GROUP BY fase
  ORDER BY processos DESC
  LIMIT 14
`;

/** Distribuição por tipo de ação. */
export const qPorAcao = (f: Filters) => `
  SELECT
    COALESCE(NULLIF(a.descricao, ''), 'Não informada') AS acao,
    COUNT(*)                     AS processos,
    ROUND(SUM(p.valor_causa), 2) AS valor
  FROM cad_processo p
  LEFT JOIN tab_acao a ON a.sigla = p.acao
  WHERE ${W(f)}
  GROUP BY acao
  ORDER BY processos DESC
  LIMIT 12
`;

/** Distribuição por comarca (com UF). */
export const qPorComarca = (f: Filters) => `
  SELECT
    COALESCE(NULLIF(c.descricao, ''), 'Não informada') AS comarca,
    COALESCE(NULLIF(c.estado, ''), '—')                AS uf,
    COUNT(*)                     AS processos,
    ROUND(SUM(p.valor_causa), 2) AS valor
  FROM cad_processo p
  LEFT JOIN z_tabela_comarca c ON c.id_comarca = p.z_comarca
  WHERE ${W(f)}
  GROUP BY comarca, uf
  ORDER BY processos DESC
  LIMIT 12
`;

/**
 * Evolução por data de ajuizamento (entrada), adaptativa ao drill:
 *   nível ano → 1 barra por ano    (bucket = 'YYYY')
 *   nível mes → 1 barra por mês     (bucket = 'YYYY-MM') do ano selecionado
 *   nível dia → 1 barra por dia      (bucket = 'YYYY-MM-DD') do mês selecionado
 */
export const qEvolucao = (f: Filters) => {
  const level = drillLevel(f);
  const base = W(f);
  if (level === "dia") {
    return `
      SELECT DATE_FORMAT(p.entrada, '%Y-%m-%d') AS bucket,
             COUNT(*) AS processos, ROUND(SUM(p.valor_causa), 2) AS valor
      FROM cad_processo p
      WHERE ${base} AND p.entrada IS NOT NULL AND DATE_FORMAT(p.entrada, '%Y-%m') = '${f.mes}'
      GROUP BY bucket ORDER BY bucket
    `;
  }
  if (level === "mes") {
    return `
      SELECT DATE_FORMAT(p.entrada, '%Y-%m') AS bucket,
             COUNT(*) AS processos, ROUND(SUM(p.valor_causa), 2) AS valor
      FROM cad_processo p
      WHERE ${base} AND p.entrada IS NOT NULL AND YEAR(p.entrada) = ${f.ano}
      GROUP BY bucket ORDER BY bucket
    `;
  }
  return `
    SELECT CAST(YEAR(p.entrada) AS CHAR) AS bucket,
           COUNT(*) AS processos, ROUND(SUM(p.valor_causa), 2) AS valor
    FROM cad_processo p
    WHERE ${base} AND p.entrada IS NOT NULL AND YEAR(p.entrada) >= 2014
    GROUP BY bucket ORDER BY bucket
  `;
};

/** Top processos por valor de causa. */
export const qTopProcessos = (f: Filters) => `
  SELECT
    TRIM(p.numero_processo) AS numero,
    COALESCE(NULLIF(pa.nome, ''), '—') AS autor,
    COALESCE(NULLIF(pr.nome, ''), '—') AS reu,
    COALESCE(NULLIF(fa.descricao, ''), '—') AS fase,
    COALESCE(NULLIF(c.descricao, ''), '—') AS comarca,
    CASE p.grupo_trabalho WHEN 10 THEN 'Ativa' ELSE 'Passiva' END AS tipo,
    ROUND(p.valor_causa, 2) AS valor
  FROM cad_processo p
  LEFT JOIN tab_fase fa         ON fa.codigo = p.fase
  LEFT JOIN z_tabela_comarca c  ON c.id_comarca = p.z_comarca
  LEFT JOIN cad_pessoa pa       ON pa.codigo = p.primeiro_autor
  LEFT JOIN cad_pessoa pr       ON pr.codigo = p.primeiro_reu
  WHERE ${W(f)} AND p.valor_causa > 0
  ORDER BY p.valor_causa DESC
  LIMIT 15
`;

// Classificação EXTRAJUDICIAL × JUDICIAL: `JUDICIAL_EXPR` mora em filters.ts
// (reaproveitado pelo filtro de classificação).

/** Dos processos ENCERRADOS, split extrajudicial × judicial. */
export const qEncerradosClasse = (f: Filters) => `
  SELECT
    CASE WHEN ${JUDICIAL_EXPR} THEN 'Judicial' ELSE 'Extrajudicial' END AS classe,
    COUNT(*)                     AS processos,
    ROUND(SUM(p.valor_causa), 2) AS valor
  FROM cad_processo p
  JOIN tab_fase fa ON fa.codigo = p.fase
  WHERE ${W(f)} AND fa.descricao LIKE 'ENCERRAD%'
  GROUP BY classe
  ORDER BY processos DESC
`;

/**
 * Mix de devedores por classificação: cada CPF/CNPJ (devedor = réu nas ativas,
 * autor nas passivas) é "puramente judicial", "puramente extrajudicial" ou
 * "ambas" conforme as classes dos seus processos.
 */
export const qMixCpf = (f: Filters) => `
  SELECT mix, COUNT(*) AS cpfs FROM (
    SELECT
      CASE WHEN MIN(jud) = 1 THEN 'Puramente judicial'
           WHEN MAX(jud) = 0 THEN 'Puramente extrajudicial'
           ELSE 'Ambas' END AS mix
    FROM (
      SELECT
        CASE WHEN p.grupo_trabalho = 10 THEN p.primeiro_reu ELSE p.primeiro_autor END AS dev,
        CASE WHEN ${JUDICIAL_EXPR} THEN 1 ELSE 0 END AS jud
      FROM cad_processo p
      WHERE ${W(f)}
    ) x
    JOIN cad_pessoa pe ON pe.codigo = x.dev
    WHERE pe.cpf_cnpj IS NOT NULL AND TRIM(pe.cpf_cnpj) NOT IN ('', '0')
    GROUP BY REGEXP_REPLACE(pe.cpf_cnpj, '[^0-9]', '')
  ) y
  GROUP BY mix
`;

// ---------------------------------------------------------------------------
// Opções dos filtros (listas distintas — sempre sobre o universo Sisprime,
// não constrangidas pelos filtros atuais, pra o usuário poder (de)selecionar).
// ---------------------------------------------------------------------------

export const qOpcoesFases = (grupos: number[]) => `
  SELECT DISTINCT fa.descricao AS v
  FROM cad_processo p JOIN tab_fase fa ON fa.codigo = p.fase
  WHERE ${baseG(grupos)} AND fa.descricao IS NOT NULL AND fa.descricao <> ''
  ORDER BY 1
`;

export const qOpcoesComarcas = (grupos: number[]) => `
  SELECT DISTINCT c.descricao AS v
  FROM cad_processo p JOIN z_tabela_comarca c ON c.id_comarca = p.z_comarca
  WHERE ${baseG(grupos)} AND c.descricao IS NOT NULL AND c.descricao <> ''
  ORDER BY 1
`;

export const qOpcoesAcoes = (grupos: number[]) => `
  SELECT DISTINCT a.descricao AS v
  FROM cad_processo p JOIN tab_acao a ON a.sigla = p.acao
  WHERE ${baseG(grupos)} AND a.descricao IS NOT NULL AND a.descricao <> ''
  ORDER BY 1
`;
