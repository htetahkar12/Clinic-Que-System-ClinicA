import "server-only";
import crypto from "crypto";

function secret(): string {
  return (
    process.env.SESSION_SECRET ||
    process.env.STAFF_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "dev-only-insecure-secret"
  );
}

function hmac(data: string): string {
  return crypto.createHmac("sha256", secret()).update(data).digest("base64url");
}

/** Creates a tamper-proof token: base64url(payload|expires).signature */
export function signToken(payload: string, maxAgeSec: number): string {
  const body = `${payload}|${Date.now() + maxAgeSec * 1000}`;
  return `${Buffer.from(body).toString("base64url")}.${hmac(body)}`;
}

/** Returns the payload if the token is valid and not expired, otherwise null. */
export function verifyToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const [b64, sig] = token.split(".");
  if (!b64 || !sig) return null;
  let body: string;
  try {
    body = Buffer.from(b64, "base64url").toString();
  } catch {
    return null;
  }
  const expected = hmac(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const idx = body.lastIndexOf("|");
  const expires = Number(body.slice(idx + 1));
  if (!expires || Date.now() > expires) return null;
  return body.slice(0, idx);
}

export function hashSecret(value: string): string {
  return crypto.createHash("sha256").update(`${value}:${secret()}`).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
