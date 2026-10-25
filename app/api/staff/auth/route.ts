import { NextRequest, NextResponse } from "next/server";
import {
  STAFF_COOKIE,
  cookieOptions,
  createStaffToken,
  isStaffRequest,
  verifyPin,
} from "@/lib/server/staff-auth";

export const dynamic = "force-dynamic";

// Brute-force protection (per server instance)
const attempts = new Map<string, { count: number; until: number }>();

export async function GET() {
  return NextResponse.json({ authenticated: isStaffRequest() });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { action?: string; pin?: string };

  if (body.action === "logout") {
    const res = NextResponse.json({ ok: true });
    res.cookies.set(STAFF_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const rec = attempts.get(ip);
  if (rec && rec.until > Date.now()) {
    return NextResponse.json({ ok: false, error: "TOO_MANY_ATTEMPTS" }, { status: 429 });
  }

  if (!verifyPin(body.pin || "")) {
    const count = (rec?.count || 0) + 1;
    attempts.set(ip, { count, until: count >= 5 ? Date.now() + 5 * 60_000 : 0 });
    return NextResponse.json({ ok: false, error: "INVALID_PIN" }, { status: 401 });
  }

  attempts.delete(ip);
  const { token, maxAge } = createStaffToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(STAFF_COOKIE, token, cookieOptions(maxAge));
  return res;
}
