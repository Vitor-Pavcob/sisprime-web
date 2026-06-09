/**
 * Autenticação edge-compatible (middleware + route handlers).
 * Web Crypto (PBKDF2) + jose (JWT). Role simples: "master" (gerencia usuários)
 * ou "user" (acesso às telas). Todo logado vê as 5 telas; só master administra.
 *
 * Storage de usuários: Cloudflare KV (fonte de verdade quando configurado), com
 * seed/fallback em `AUTH_USERS_JSON`. Segredo do JWT: `AUTH_JWT_SECRET`.
 * Gere a seed com `node scripts/auth-bootstrap.mjs`.
 */
import { jwtVerify, SignJWT } from "jose";
import { isKvConfigured, kvGetJson, kvPutJson } from "./kv";

export type Role = "master" | "user";

export type StoredUser = {
  login: string;
  nome?: string;
  salt: string; // hex
  hash: string; // hex (PBKDF2-SHA256, 100k)
  role?: Role;  // ausente = "user"
};

export type SessionUser = { login: string; nome?: string; role: Role };

export const COOKIE_NAME = "sisprime_session";
const KV_USERS_KEY = "users";
const SESSION_SHORT = 60 * 60 * 8;        // 8h
const SESSION_LONG = 60 * 60 * 24 * 30;   // 30 dias com "lembrar"

const roleOf = (u: StoredUser): Role => (u.role === "master" ? "master" : "user");

/** Remove TODO espaço em branco (espaços, quebras de linha, tabs) que podem ser
 *  injetados ao colar a variável no painel do host e corrompem o JSON.
 *  Seguro: o JSON é compacto e nenhum valor (login/salt/hash) tem espaço. */
function stripWhitespace(s: string): string {
  let out = "";
  for (const ch of s) if (ch.charCodeAt(0) > 32) out += ch;
  return out;
}

function getUsersFromEnv(): StoredUser[] {
  const raw = process.env.AUTH_USERS_JSON;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(stripWhitespace(raw));
    return Array.isArray(parsed) ? (parsed as StoredUser[]) : [];
  } catch {
    return [];
  }
}

// ---- Storage: KV (fonte de verdade) com seed do env ----
export async function listUsers(): Promise<StoredUser[]> {
  if (!isKvConfigured()) return getUsersFromEnv();
  const fromKv = await kvGetJson<StoredUser[]>(KV_USERS_KEY);
  if (fromKv != null) return fromKv;
  // Primeira leitura sem dados no KV → migra a seed do env pro KV.
  const seed = getUsersFromEnv();
  if (seed.length > 0) await kvPutJson(KV_USERS_KEY, seed);
  return seed;
}

export async function saveUsers(users: StoredUser[]): Promise<void> {
  if (!isKvConfigured()) {
    throw new Error("KV não configurado — defina CF_ACCOUNT_ID, CF_KV_NAMESPACE_ID e CF_KV_TOKEN.");
  }
  await kvPutJson(KV_USERS_KEY, users);
}

function getJwtSecret(): Uint8Array {
  const secret = (process.env.AUTH_JWT_SECRET ?? "").trim();
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_JWT_SECRET ausente ou curto (>= 32 chars).");
  }
  return new TextEncoder().encode(secret);
}

// ---- Hashing (PBKDF2 via Web Crypto) ----
const PBKDF2_ITER = 100_000;
const SALT_BYTES = 16;
const HASH_BYTES = 32;

const toHex = (buf: ArrayBuffer | Uint8Array) =>
  Array.from(buf instanceof Uint8Array ? buf : new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) out[i / 2] = parseInt(hex.substr(i, 2), 16);
  return out;
}

export async function hashPassword(
  password: string,
  saltHex?: string
): Promise<{ salt: string; hash: string }> {
  const salt = saltHex ? fromHex(saltHex) : crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITER, hash: "SHA-256" },
    key,
    HASH_BYTES * 8
  );
  return { salt: toHex(salt), hash: toHex(derived) };
}

async function verifyPassword(password: string, saltHex: string, expectedHex: string): Promise<boolean> {
  const { hash } = await hashPassword(password, saltHex);
  if (hash.length !== expectedHex.length) return false;
  let diff = 0;
  for (let i = 0; i < hash.length; i++) diff |= hash.charCodeAt(i) ^ expectedHex.charCodeAt(i);
  return diff === 0;
}

export async function verifyCredentials(login: string, password: string): Promise<SessionUser | null> {
  const users = await listUsers();
  const u = users.find((x) => x.login.toLowerCase() === login.trim().toLowerCase());
  if (!u) return null;
  const ok = await verifyPassword(password, u.salt, u.hash);
  return ok ? { login: u.login, nome: u.nome, role: roleOf(u) } : null;
}

// ---- Sessão (JWT em cookie HttpOnly) ----
export const getSessionDuration = (remember: boolean) => (remember ? SESSION_LONG : SESSION_SHORT);

export async function createSessionToken(user: SessionUser, expiresInSec: number): Promise<string> {
  return new SignJWT({ sub: user.login, nome: user.nome, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${expiresInSec}s`)
    .sign(getJwtSecret());
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return {
      login: typeof payload.sub === "string" ? payload.sub : "",
      nome: typeof payload.nome === "string" ? payload.nome : undefined,
      role: payload.role === "master" ? "master" : "user",
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const { cookies } = await import("next/headers");
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  return token ? verifySessionToken(token) : null;
}

/** Para route handlers: extrai o usuário da request via cookie. */
export async function getUserFromRequest(req: Request): Promise<SessionUser | null> {
  const cookie = req.headers.get("cookie") ?? "";
  const m = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  return m ? verifySessionToken(m[1]) : null;
}
