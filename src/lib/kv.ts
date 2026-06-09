// Cliente HTTP minimalista para o Cloudflare Workers KV via REST API.
// Funciona em edge runtime com fetch (sem binding).
//
// Env vars (Encrypted no Cloudflare Pages):
//   - CF_ACCOUNT_ID      : id da conta Cloudflare
//   - CF_KV_NAMESPACE_ID : id do namespace KV que guarda os usuários
//   - CF_KV_TOKEN        : API token com permissão "Workers KV Storage: Edit"

const KV_API_BASE = "https://api.cloudflare.com/client/v4/accounts";

function kvUrl(key: string): string {
  const account = process.env.CF_ACCOUNT_ID;
  const namespace = process.env.CF_KV_NAMESPACE_ID;
  if (!account || !namespace) {
    throw new Error("Cloudflare KV não configurado: defina CF_ACCOUNT_ID e CF_KV_NAMESPACE_ID.");
  }
  return `${KV_API_BASE}/${account}/storage/kv/namespaces/${namespace}/values/${encodeURIComponent(key)}`;
}

function kvAuthHeaders(): Headers {
  const token = process.env.CF_KV_TOKEN;
  if (!token) throw new Error("CF_KV_TOKEN ausente.");
  return new Headers({ Authorization: `Bearer ${token}` });
}

export function isKvConfigured(): boolean {
  return Boolean(process.env.CF_ACCOUNT_ID && process.env.CF_KV_NAMESPACE_ID && process.env.CF_KV_TOKEN);
}

export async function kvGet(key: string): Promise<string | null> {
  const res = await fetch(kvUrl(key), { method: "GET", headers: kvAuthHeaders(), cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`KV GET ${key} falhou: ${res.status} ${await res.text()}`);
  return await res.text();
}

export async function kvPut(key: string, value: string): Promise<void> {
  const res = await fetch(kvUrl(key), { method: "PUT", headers: kvAuthHeaders(), body: value });
  if (!res.ok) throw new Error(`KV PUT ${key} falhou: ${res.status} ${await res.text()}`);
}

export async function kvGetJson<T>(key: string): Promise<T | null> {
  const raw = await kvGet(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function kvPutJson<T>(key: string, value: T): Promise<void> {
  await kvPut(key, JSON.stringify(value));
}
