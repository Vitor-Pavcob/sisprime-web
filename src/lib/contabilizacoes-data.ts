/**
 * Acesso aos dados de contabilizações (baixas/recuperação) Sisprime —
 * snapshot local src/data/contabilizacoes/contabilizacoes.json
 * (gerado por scripts/load-contabilizacoes.py).
 *
 * Cada registro = uma baixa contabilizada num mês (competência), com o valor
 * recuperado. Inclui cruzamento por CPF com as propostas.
 */
import raw from "@/data/contabilizacoes/contabilizacoes.json";
import metaRaw from "@/data/contabilizacoes/meta.json";
import { PROPOSTAS } from "./propostas-data";
import { ANO_MIN, PROPOSTA_STATUS_VALIDOS, CONTAB_TIPOS_VALIDOS } from "./config";

export type Contab = {
  competencia: string;     // 'YYYY-MM'
  tipo: string;
  autos: string;
  nome: string;
  cpf: string;
  cpfDigits: string;
  operador: string;
  valor: number;
  ano: number | null;
};

export const CONTABILIZACOES = raw as Contab[];
export const CONTAB_META = metaRaw as {
  generatedAt: string;
  totalContabilizacoes: number;
  valorTotal: number;
  arquivos: { arquivo: string; competencia: string; linhas: number }[];
  fonte: string;
};

const digits = (s: string) => (s || "").replace(/\D/g, "");

// Conjuntos de CPF das propostas (janela ANO_MIN+ e status válido), p/ cruzamento.
const propsJanela = PROPOSTAS.filter(
  (p) => p.ano != null && p.ano >= ANO_MIN && PROPOSTA_STATUS_VALIDOS.has(p.status)
);
const CPF_PROPOSTA = new Set(propsJanela.map((p) => digits(p.cpf)).filter(Boolean));
const CPF_PROPOSTA_ACEITA = new Set(
  propsJanela.filter((p) => p.status === "Aceita").map((p) => digits(p.cpf)).filter(Boolean)
);

export type ContabFilters = {
  tipos: string[];
  de: string | null;  // 'YYYY-MM-DD'
  ate: string | null;
};

type RawParams = Record<string, string | string[] | undefined>;
const csv = (v: string | string[] | undefined): string[] =>
  !v ? [] : (Array.isArray(v) ? v.join(",") : v).split(",").map((x) => x.trim()).filter(Boolean);
const one = (v: string | string[] | undefined): string | null => {
  if (!v) return null;
  const s = Array.isArray(v) ? v[0] : v;
  return s.trim() || null;
};
const isYmd = (s: string | null) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

export function parseContabFilters(sp: RawParams): ContabFilters {
  return {
    tipos: csv(sp.tipos),
    de: isYmd(one(sp.de)) ? one(sp.de) : null,
    ate: isYmd(one(sp.ate)) ? one(sp.ate) : null,
  };
}

export function applyFilters(rows: Contab[], f: ContabFilters): Contab[] {
  const tp = new Set(f.tipos);
  const deM = f.de ? f.de.slice(0, 7) : null;   // compara por mês de competência
  const ateM = f.ate ? f.ate.slice(0, 7) : null;
  return rows.filter((r) => {
    if (r.ano == null || r.ano < ANO_MIN) return false; // janela global 2025+
    if (!CONTAB_TIPOS_VALIDOS.has(r.tipo)) return false; // só Judicial/Extrajudicial (sem HO/Escritório 4)
    if (tp.size && !tp.has(r.tipo)) return false;
    if (deM && r.competencia < deM) return false;
    if (ateM && r.competencia > ateM) return false;
    return true;
  });
}

export function opcoes() {
  return {
    tipos: [...new Set(CONTABILIZACOES.map((r) => r.tipo))]
      .filter((t) => CONTAB_TIPOS_VALIDOS.has(t))
      .sort((a, b) => a.localeCompare(b, "pt-BR")),
  };
}

export type MesPonto = { competencia: string; processos: number; valor: number; acumulado: number };

/** Série mensal contínua (preenche meses sem baixa com zero) + acumulado. */
export function timelineMensal(rows: Contab[]): MesPonto[] {
  if (rows.length === 0) return [];
  const map = new Map<string, { processos: number; valor: number }>();
  for (const r of rows) {
    const cur = map.get(r.competencia) ?? { processos: 0, valor: 0 };
    cur.processos += 1;
    cur.valor += r.valor;
    map.set(r.competencia, cur);
  }
  // Só meses que têm contabilização (sem preencher períodos vazios).
  const months = [...map.keys()].sort();
  let acc = 0;
  return months.map((key) => {
    const v = map.get(key)!;
    acc += v.valor;
    return { competencia: key, processos: v.processos, valor: v.valor, acumulado: acc };
  });
}

export type CrossRef = {
  comProposta: { processos: number; valor: number };
  comPropostaAceita: { processos: number; valor: number };
  semProposta: { processos: number; valor: number };
};

/** Cruzamento das baixas com as propostas, por CPF. */
export function crossRefPropostas(rows: Contab[]): CrossRef {
  const z = () => ({ processos: 0, valor: 0 });
  const cr: CrossRef = { comProposta: z(), comPropostaAceita: z(), semProposta: z() };
  for (const r of rows) {
    const d = r.cpfDigits || digits(r.cpf);
    if (d && CPF_PROPOSTA.has(d)) {
      cr.comProposta.processos++; cr.comProposta.valor += r.valor;
      if (CPF_PROPOSTA_ACEITA.has(d)) { cr.comPropostaAceita.processos++; cr.comPropostaAceita.valor += r.valor; }
    } else {
      cr.semProposta.processos++; cr.semProposta.valor += r.valor;
    }
  }
  return cr;
}
