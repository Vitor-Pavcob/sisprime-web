import { NextResponse } from "next/server";

// Diagnóstico TEMPORÁRIO — não expõe senha/segredo, só confirma se as env vars
// chegaram ao runtime. Remover após resolver o deploy.
export const runtime = "edge";

function stripControlChars(s: string): string {
  let out = "";
  for (const ch of s) if (ch.charCodeAt(0) >= 32) out += ch;
  return out;
}

export async function GET() {
  const raw = process.env.AUTH_USERS_JSON ?? "";
  const cleaned = stripControlChars(raw);
  let users: Array<{ login?: string }> = [];
  let jsonValid = false;
  let parseError: string | null = null;
  try {
    const p = JSON.parse(cleaned);
    if (Array.isArray(p)) {
      users = p;
      jsonValid = true;
    }
  } catch (e) {
    parseError = e instanceof Error ? e.message : String(e);
  }
  const secret = process.env.AUTH_JWT_SECRET;
  return NextResponse.json({
    rawLen: raw.length,
    cleanedLen: cleaned.length,
    controlCharsRemoved: raw.length - cleaned.length,
    jsonValid,
    parseError,
    usersCount: users.length,
    logins: users.map((u) => u?.login).filter(Boolean),
    jwtSecretSet: !!secret,
    jwtSecretLen: secret ? secret.length : 0,
    metabaseUrlSet: !!process.env.METABASE_URL,
    metabaseKeySet: !!process.env.METABASE_API_KEY,
  });
}
