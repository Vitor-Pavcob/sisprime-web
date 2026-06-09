export function fmtBRL(n: number, opts: { compact?: boolean } = {}): string {
  if (!isFinite(n)) return "—";
  if (opts.compact) {
    if (Math.abs(n) >= 1e9) return `R$ ${(n / 1e9).toFixed(2).replace(".", ",")} bi`;
    if (Math.abs(n) >= 1e6) return `R$ ${(n / 1e6).toFixed(1).replace(".", ",")} mi`;
    if (Math.abs(n) >= 1e3) return `R$ ${(n / 1e3).toFixed(0)} mil`;
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(n);
}

export function fmtNum(n: number): string {
  return n.toLocaleString("pt-BR");
}

export function fmtPct(n: number, digits = 1): string {
  return `${(n * 100).toFixed(digits).replace(".", ",")}%`;
}

const MESES_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "AAAA-MM" → "abr/2026" (PT-BR). */
export function fmtAnoMes(ym: string): string {
  const [y, m] = ym.split("-");
  return `${MESES_PT[Number(m) - 1] ?? "?"}/${y}`;
}

/**
 * Faixas de cor para % de atingimento de meta:
 * ≥ 100% = verde · 70-99,99% = amarelo · 50-69,99% = laranja · < 50% = vermelho
 * Recebe a fração (0..1+, não percentual).
 */
export function pctAtingimentoColor(p: number): string {
  if (p >= 1) return "#10b981"; // emerald-500
  if (p >= 0.7) return "#eab308"; // yellow-500
  if (p >= 0.5) return "#f97316"; // orange-500
  return "#ef4444"; // red-500
}
