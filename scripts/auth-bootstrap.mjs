// Gera AUTH_JWT_SECRET + AUTH_USERS_JSON para o .env.local (dev) e para as
// env vars do host (Cloudflare Pages). Hash compatível com src/lib/auth.ts
// (PBKDF2-SHA256, 100k iterações, salt 16 bytes, hash 32 bytes).
//
// Uso:
//   node scripts/auth-bootstrap.mjs "vitor.cassimiro:SenhaForte1:master" "bruna:OutraSenha2"
//   formato login:senha[:role]  (role = master|user, default user); use aspas.
//
// Sem argumentos, usa os usuários de exemplo abaixo (TROQUE as senhas!).

import { webcrypto as crypto } from "node:crypto";

const DEFAULT_USERS = [
  { login: "admin", nome: "Administrador", senha: "trocar-senha-123", role: "master" },
];

const PBKDF2_ITER = 100_000;
const toHex = (buf) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");

async function hash(senha) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(senha), "PBKDF2", false, ["deriveBits"]);
  const derived = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: PBKDF2_ITER, hash: "SHA-256" }, key, 256);
  return { salt: toHex(salt), hash: toHex(derived) };
}

function parseArgs() {
  const args = process.argv.slice(2);
  if (args.length === 0) return DEFAULT_USERS;
  return args.map((a) => {
    const parts = a.split(":");
    if (parts.length < 2) throw new Error(`Formato inválido: "${a}". Use login:senha[:role]`);
    const login = parts[0].trim();
    let role = "user";
    if (parts.length >= 3 && (parts[parts.length - 1] === "master" || parts[parts.length - 1] === "user")) {
      role = parts.pop();
    }
    const senha = parts.slice(1).join(":");
    return { login, nome: login, senha, role };
  });
}

const users = parseArgs();
const stored = [];
for (const u of users) {
  const { salt, hash: h } = await hash(u.senha);
  stored.push({ login: u.login, nome: u.nome, salt, hash: h, role: u.role });
}

const secret = toHex(crypto.getRandomValues(new Uint8Array(32)));

console.log("\n# Cole no .env.local (dev) e nas env vars do host (produção):\n");
console.log(`AUTH_JWT_SECRET=${secret}`);
console.log(`AUTH_USERS_JSON=${JSON.stringify(stored)}`);
console.log("\n# Usuários gerados:");
for (const u of users) console.log(`#   ${u.login} [${u.role}]  —  senha: ${u.senha}`);
console.log("");
