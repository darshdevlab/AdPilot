import { NextResponse } from "next/server";
import { analyzeDeterministic, mergeLlmNotes, normalizeInput, validateEmail } from "@/lib/campaign-engine";
import { askOpenRouter } from "@/lib/openrouter";
import { saveAnalysis } from "@/lib/persist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const raw = await request.json();
    const campaignInput = normalizeInput(raw);

    if (!validateEmail(campaignInput.email)) {
      return NextResponse.json({ ok: false, error: "A valid email is required." }, { status: 400 });
    }

    const deterministic = analyzeDeterministic(campaignInput);
    const llm = await askOpenRouter(deterministic);
    const merged = mergeLlmNotes(deterministic, llm.payload);
    const modelInfo = {
      mode: llm.payload ? "openrouter" as const : "deterministic" as const,
      model: llm.model,
      models: campaignInput.modelPreferences,
      error: llm.error,
    };
    const unsaved = { ...merged, modelInfo };
    const saved = await saveAnalysis(unsaved);

    return NextResponse.json({ ok: true, result: { ...unsaved, saved } });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Analysis failed." },
      { status: 500 },
    );
  }
}
