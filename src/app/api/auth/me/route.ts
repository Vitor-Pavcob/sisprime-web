import { NextResponse } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";

export const runtime = "edge";

export async function GET(req: Request) {
  const cookie = req.headers.get("cookie") ?? "";
  const m = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  const user = m ? await verifySessionToken(m[1]) : null;
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user });
}
