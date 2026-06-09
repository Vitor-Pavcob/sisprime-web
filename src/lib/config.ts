/**
 * Janela temporal global do relatório.
 *
 * Olhamos tudo de ANO_MIN em diante — processos (por ajuizamento/entrada),
 * propostas (por data de envio) e contabilizações (por competência). 2024 fica
 * de fora porque tem contabilizações ausentes, o que distorceria o cruzamento.
 */
export const ANO_MIN = 2025;

/**
 * Status de proposta considerados válidos no relatório. "Parcelada enviada",
 * "Bloqueio judicial" e afins ficam de fora.
 */
export const PROPOSTA_STATUS_VALIDOS = new Set(["Aceita", "Aguardando contraproposta", "Em análise"]);

/**
 * Tipos de contabilização que contam como recuperação. "Escritório 4" (pagamento
 * de honorários/HO) e "Não informado" ficam de fora.
 */
export const CONTAB_TIPOS_VALIDOS = new Set(["Judicial", "Extrajudicial"]);
