/**
 * Acesso aos dados de propostas Sisprime (snapshot local em
 * src/data/propostas/propostas.json, gerado por scripts/load-propostas.py).
 *
 * Local-first: sem dependência de rede em runtime. Filtros e agregações
 * rodam em memória sobre o array importado.
 */
import raw from "@/data/propostas/propostas.json";
import metaRaw from "@/data/propostas/meta.json";
import { PROPOSTA_STATUS_VALIDOS } from "./config";

export type Proposta = {
  arquivo: string;
  devedor: string;
  cpf: string;
  contrato: string;
  carteira: string;
  carteiraRaw: string;
  principal: number;
  valorAtualizado: number;
  valorAcordo: number;
  entrada: number;
  valorParcelar: number;
  parcelas: number;
  condicao: string;
  status: string;
  escritorio: string;
  temVeiculo: boolean;
  dataEnvio: string | null;
  ano: number | null;
  mes: string | null;
};

export const PROPOSTAS = raw as Proposta[];
export const PROPOSTAS_META = metaRaw as {
  generatedAt: string;
  totalPropostas: number;
  arquivos: { arquivo: string; linhas: number }[];
  fonte: string;
};

export type DrillLevel = "ano" | "mes" | "dia";

export type PropFilters = {
  carteiras: string[];
  status: string[];
  condicoes: string[];
  escritorios: string[];
  de: string | null;
  ate: string | null;
  ano: number | null;
  mes: string | null;
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
const isYm = (s: string | null) => !!s && /^\d{4}-\d{2}$/.test(s);

export function parsePropFilters(sp: RawParams): PropFilters {
  const anoRaw = one(sp.ano);
  return {
    carteiras: csv(sp.carteiras),
    status: csv(sp.status),
    condicoes: csv(sp.condicoes),
    escritorios: csv(sp.escritorios),
    de: isYmd(one(sp.de)) ? one(sp.de) : null,
    ate: isYmd(one(sp.ate)) ? one(sp.ate) : null,
    ano: anoRaw && /^\d{4}$/.test(anoRaw) ? Number(anoRaw) : null,
    mes: isYm(one(sp.mes)) ? one(sp.mes) : null,
  };
}

export function drillLevel(f: PropFilters): DrillLevel {
  if (f.mes) return "dia";
  if (f.ano) return "mes";
  return "ano";
}

/** Aplica os filtros de seleção/período (NÃO o drill ano/mês). */
export function applyFilters(rows: Proposta[], f: PropFilters): Proposta[] {
  const cart = new Set(f.carteiras);
  const st = new Set(f.status);
  const cond = new Set(f.condicoes);
  const esc = new Set(f.escritorios);
  return rows.filter((r) => {
    if (cart.size && !cart.has(r.carteira)) return false;
    if (st.size && !st.has(r.status)) return false;
    if (cond.size && !cond.has(r.condicao)) return false;
    if (esc.size && !esc.has(r.escritorio)) return false;
    if (f.de && (!r.dataEnvio || r.dataEnvio < f.de)) return false;
    if (f.ate && (!r.dataEnvio || r.dataEnvio > f.ate)) return false;
    return true;
  });
}

export type EvoBucket = { bucket: string; processos: number; valor: number };

/** Buckets do gráfico de evolução conforme o nível do drill. `processos` = nº de propostas, `valor` = soma do valor de acordo. */
export function evolucaoBuckets(rows: Proposta[], f: PropFilters): EvoBucket[] {
  const level = drillLevel(f);
  const map = new Map<string, { processos: number; valor: number }>();
  for (const r of rows) {
    let key: string | null = null;
    if (level === "ano") {
      if (r.ano && r.ano >= 2020) key = String(r.ano);
    } else if (level === "mes") {
      if (r.ano === f.ano && r.mes) key = r.mes;
    } else {
      if (r.mes === f.mes && r.dataEnvio) key = r.dataEnvio;
    }
    if (!key) continue;
    const cur = map.get(key) ?? { processos: 0, valor: 0 };
    cur.processos += 1;
    cur.valor += r.valorAcordo;
    map.set(key, cur);
  }
  return [...map.entries()]
    .map(([bucket, v]) => ({ bucket, ...v }))
    .sort((a, b) => a.bucket.localeCompare(b.bucket));
}

/** Listas distintas para os filtros (universo completo). */
export function opcoes() {
  const uniq = (key: keyof Proposta) =>
    [...new Set(PROPOSTAS.map((r) => String(r[key])).filter((v) => v && v !== "—"))].sort((a, b) =>
      a.localeCompare(b, "pt-BR")
    );
  return {
    carteiras: uniq("carteira"),
    status: uniq("status").filter((s) => PROPOSTA_STATUS_VALIDOS.has(s)),
    condicoes: uniq("condicao"),
    escritorios: uniq("escritorio"),
  };
}
