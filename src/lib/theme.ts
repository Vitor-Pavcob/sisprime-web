// Paleta de cores Sisprime para charts. Escala de azul institucional,
// com tons quentes reservados para destacar risco/passivo.

/** Sequência de azuis (forte → claro) para fatias de donut/segmentos. */
export const SISPRIME_BLUES = [
  "#082b4a",
  "#0e5fac",
  "#1e88e5",
  "#00a0df",
  "#5eb3f2",
  "#3b82f6",
  "#60a5fa",
  "#93c5fd",
  "#1d4ed8",
  "#0ea5e9",
  "#2563eb",
  "#7dd3fc",
  "#1e3a8a",
  "#bfdbfe",
];

/** Cor por tipo de ação (ativa = azul marca, passiva = navy escuro). */
export const TIPO_COLORS: Record<string, string> = {
  "Ações Ativas": "#1e88e5",
  "Ações Passivas": "#082b4a",
};

/** Pega a i-ésima cor da escala, ciclando. */
export function blueAt(i: number): string {
  return SISPRIME_BLUES[i % SISPRIME_BLUES.length];
}
