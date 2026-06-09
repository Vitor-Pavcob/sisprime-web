/**
 * Camada de "Resultado": cruza propostas (pipeline) × contabilizações
 * (recuperação efetiva) para a visão executiva.
 *
 * Match por CPF/CNPJ (devedor) — base defensável para o funil. O match
 * CPF+valor é mais estrito (o valor pago costuma diferir do proposto), então
 * para o funil usamos o devedor.
 */
import { PROPOSTAS, type Proposta } from "./propostas-data";
import { CONTABILIZACOES, type Contab } from "./contabilizacoes-data";
import { ANO_MIN, PROPOSTA_STATUS_VALIDOS, CONTAB_TIPOS_VALIDOS } from "./config";

const digits = (s: string) => (s || "").replace(/\D/g, "");

export type ResultadoFilters = { de: string | null; ate: string | null };

type RawParams = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined): string | null => {
  if (!v) return null;
  const s = Array.isArray(v) ? v[0] : v;
  return s.trim() || null;
};
const isYmd = (s: string | null) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

export function parseResultadoFilters(sp: RawParams): ResultadoFilters {
  return {
    de: isYmd(one(sp.de)) ? one(sp.de) : null,
    ate: isYmd(one(sp.ate)) ? one(sp.ate) : null,
  };
}

function filtraPropostas(f: ResultadoFilters): Proposta[] {
  return PROPOSTAS.filter((p) => {
    if (p.ano == null || p.ano < ANO_MIN) return false; // janela global 2025+
    if (!PROPOSTA_STATUS_VALIDOS.has(p.status)) return false; // status válido
    if (f.de && (!p.dataEnvio || p.dataEnvio < f.de)) return false;
    if (f.ate && (!p.dataEnvio || p.dataEnvio > f.ate)) return false;
    return true;
  });
}
function filtraContab(f: ResultadoFilters): Contab[] {
  const deM = f.de ? f.de.slice(0, 7) : null;
  const ateM = f.ate ? f.ate.slice(0, 7) : null;
  return CONTABILIZACOES.filter((c) => {
    if (c.ano == null || c.ano < ANO_MIN) return false; // janela global 2025+
    if (!CONTAB_TIPOS_VALIDOS.has(c.tipo)) return false; // só recuperação (sem HO/Escritório 4)
    if (deM && c.competencia < deM) return false;
    if (ateM && c.competencia > ateM) return false;
    return true;
  });
}

export type Resultado = {
  // pipeline
  propostas: number;
  valorProposto: number;
  aceitas: number;
  valorAceito: number;
  devedores: number;
  desagioMedio: number;
  // recuperação efetiva
  recuperado: number;
  baixas: number;
  devedoresRecuperados: number;
  // funil (cruzado por CPF)
  propostasEfetivadas: number;
  propostasAceitasEfetivadas: number;
  recuperadoComProposta: number;
  recuperadoSemProposta: number;
  // taxas
  taxaAceite: number;        // aceitas / propostas
  taxaEfetivacao: number;    // propostas c/ recuperação / aceitas
  taxaConversaoValor: number; // recuperado / valor aceito
};

export function calcResultado(f: ResultadoFilters): Resultado {
  const props = filtraPropostas(f);
  const contab = filtraContab(f);

  const cpfsBaixa = new Set(contab.map((c) => c.cpfDigits || digits(c.cpf)).filter(Boolean));
  const cpfsProposta = new Set(props.map((p) => digits(p.cpf)).filter(Boolean));

  const aceitasArr = props.filter((p) => p.status === "Aceita");
  const valorProposto = props.reduce((s, p) => s + p.valorAcordo, 0);
  const valorAceito = aceitasArr.reduce((s, p) => s + p.valorAcordo, 0);
  const valorAtualizado = props.reduce((s, p) => s + p.valorAtualizado, 0);

  const recuperado = contab.reduce((s, c) => s + c.valor, 0);
  const recComProp = contab
    .filter((c) => cpfsProposta.has(c.cpfDigits || digits(c.cpf)))
    .reduce((s, c) => s + c.valor, 0);

  const propsEfet = props.filter((p) => cpfsBaixa.has(digits(p.cpf)));
  const propsAceitasEfet = aceitasArr.filter((p) => cpfsBaixa.has(digits(p.cpf)));

  return {
    propostas: props.length,
    valorProposto,
    aceitas: aceitasArr.length,
    valorAceito,
    devedores: cpfsProposta.size,
    desagioMedio: valorAtualizado > 0 ? 1 - valorProposto / valorAtualizado : 0,
    recuperado,
    baixas: contab.length,
    devedoresRecuperados: cpfsBaixa.size,
    propostasEfetivadas: propsEfet.length,
    propostasAceitasEfetivadas: propsAceitasEfet.length,
    recuperadoComProposta: recComProp,
    recuperadoSemProposta: recuperado - recComProp,
    taxaAceite: props.length > 0 ? aceitasArr.length / props.length : 0,
    taxaEfetivacao: aceitasArr.length > 0 ? propsAceitasEfet.length / aceitasArr.length : 0,
    taxaConversaoValor: valorAceito > 0 ? recComProp / valorAceito : 0,
  };
}

export type ResultadoAno = {
  ano: number;
  propostas: number;
  valorProposto: number;
  recuperado: number;
};

/** Resultado por ano: propostas geradas × recuperado contabilizado. */
export function resultadoPorAno(f: ResultadoFilters): ResultadoAno[] {
  const props = filtraPropostas(f);
  const contab = filtraContab(f);
  const map = new Map<number, ResultadoAno>();
  const get = (y: number) => {
    let r = map.get(y);
    if (!r) { r = { ano: y, propostas: 0, valorProposto: 0, recuperado: 0 }; map.set(y, r); }
    return r;
  };
  for (const p of props) if (p.ano) { const r = get(p.ano); r.propostas++; r.valorProposto += p.valorAcordo; }
  for (const c of contab) if (c.ano) get(c.ano).recuperado += c.valor;
  return [...map.values()].sort((a, b) => a.ano - b.ano);
}

export type MatrizAno = {
  ano: number;
  meses: { proposto: number; recuperado: number }[]; // 12 posições (jan..dez)
};

/**
 * Matriz mês × ano para o gráfico de evolução/comparativo:
 * proposto por mês de envio (propostas) e recuperado por competência (baixas).
 */
export function matrizMensalPorAno(f: ResultadoFilters): MatrizAno[] {
  const props = filtraPropostas(f);
  const contab = filtraContab(f);
  const map = new Map<number, MatrizAno>();
  const ensure = (y: number) => {
    let r = map.get(y);
    if (!r) {
      r = { ano: y, meses: Array.from({ length: 12 }, () => ({ proposto: 0, recuperado: 0 })) };
      map.set(y, r);
    }
    return r;
  };
  for (const p of props) {
    if (!p.mes) continue;
    const [y, m] = p.mes.split("-").map(Number);
    if (!y || !m) continue;
    ensure(y).meses[m - 1].proposto += p.valorAcordo;
  }
  for (const c of contab) {
    if (!c.competencia) continue;
    const [y, m] = c.competencia.split("-").map(Number);
    if (!y || !m) continue;
    ensure(y).meses[m - 1].recuperado += c.valor;
  }
  return [...map.values()].sort((a, b) => a.ano - b.ano);
}

/** Maiores recuperações com o devedor + (se houver) a proposta correspondente. */
export function topRecuperacoes(f: ResultadoFilters, n = 12) {
  const contab = filtraContab(f);
  const props = filtraPropostas(f);
  const byCpf = new Map<string, Proposta[]>();
  for (const p of props) {
    const d = digits(p.cpf);
    if (!d) continue;
    (byCpf.get(d) ?? byCpf.set(d, []).get(d)!).push(p);
  }
  return [...contab]
    .sort((a, b) => b.valor - a.valor)
    .slice(0, n)
    .map((c) => {
      const d = c.cpfDigits || digits(c.cpf);
      const plist = byCpf.get(d) ?? [];
      const temProposta = plist.length > 0;
      return { ...c, temProposta };
    });
}
