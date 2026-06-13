import { NextResponse } from "next/server";
import { getFreeModelOptions } from "@/lib/free-models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const models = await getFreeModelOptions();
  return NextResponse.json({ ok: true, models });
}
