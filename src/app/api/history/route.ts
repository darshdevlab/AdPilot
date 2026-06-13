import { NextResponse } from "next/server";

const DEFAULT_HISTORY_URL = "https://peluzzqoihjvkdtedsiz.supabase.co/functions/v1/adpilot-history";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const historyUrl = process.env.ADPILOT_HISTORY_URL || DEFAULT_HISTORY_URL;

  try {
    const response = await fetch(`${historyUrl}?limit=12`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    const text = await response.text();
    const body = parseJson(text);

    if (!response.ok || !body?.ok) {
      return NextResponse.json(
        { ok: false, error: body?.error || `History read failed with status ${response.status}` },
        { status: response.ok ? 502 : response.status },
      );
    }

    return NextResponse.json(body, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "History read failed." },
      { status: 500 },
    );
  }
}

function parseJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
