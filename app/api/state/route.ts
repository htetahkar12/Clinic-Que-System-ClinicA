import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const STATE_FILE_PATH = path.join(process.cwd(), ".clinic-runtime-state.json");

declare global {
  // eslint-disable-next-line no-var
  var __CLINIC_LIVE_STATE__: Record<string, unknown> | undefined;
}

function readServerState(): Record<string, unknown> | null {
  try {
    if (fs.existsSync(STATE_FILE_PATH)) {
      const raw = fs.readFileSync(STATE_FILE_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      globalThis.__CLINIC_LIVE_STATE__ = parsed;
      return parsed;
    }
  } catch {
    // Fallback to memory if filesystem is read-only
  }
  return globalThis.__CLINIC_LIVE_STATE__ || null;
}

function writeServerState(data: Record<string, unknown>) {
  globalThis.__CLINIC_LIVE_STATE__ = data;
  try {
    fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(data), "utf-8");
  } catch {
    // Ignore on read-only serverless filesystems
  }
}

export async function GET(req: NextRequest) {
  const sinceParam = req.nextUrl.searchParams.get("since");
  const since = sinceParam ? Number(sinceParam) : 0;
  const current = readServerState();

  if (!current) {
    return NextResponse.json({ hasState: false, version: 0 });
  }

  const currentVersion = Number(current.version || 0);
  if (since > 0 && currentVersion <= since) {
    return NextResponse.json({
      hasState: true,
      unchanged: true,
      version: currentVersion,
    });
  }

  return NextResponse.json({
    hasState: true,
    unchanged: false,
    version: currentVersion,
    state: current,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const nextVersion = Number(body.version) || Date.now();
    const stateToSave = {
      ...body,
      version: nextVersion,
      updatedAt: new Date().toISOString(),
    };
    writeServerState(stateToSave);
    return NextResponse.json({ ok: true, version: nextVersion });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save state" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  globalThis.__CLINIC_LIVE_STATE__ = undefined;
  try {
    if (fs.existsSync(STATE_FILE_PATH)) {
      fs.unlinkSync(STATE_FILE_PATH);
    }
  } catch {
    // Ignore
  }
  return NextResponse.json({ ok: true, reset: true });
}
