import type { AgentNote, CampaignInput, Forecast, Recommendation } from "./types";
import { AUTO_FREE_MODEL, normalizeFreeModelId } from "./free-models";

type LlmPayload = {
  notes?: Partial<AgentNote>[];
  summary?: string;
  nextTests?: string[];
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export async function askOpenRouter(input: {
  campaignInput: CampaignInput;
  agentOutputs: AgentNote[];
  forecast: Forecast;
  recommendation: Recommendation;
}): Promise<{ payload: LlmPayload | null; model: string; error?: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = normalizeFreeModelId(input.campaignInput.modelPreference || process.env.OPENROUTER_MODEL || AUTO_FREE_MODEL);

  if (!apiKey) {
    return { payload: null, model, error: "OPENROUTER_API_KEY is not configured." };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1000);

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://adpilot.vercel.app",
        "X-Title": "AdPilot",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are AdPilot's campaign validation editor. Improve concise agent summaries using only the provided campaign input and deterministic forecast. Return strict JSON only.",
          },
          {
            role: "user",
            content: JSON.stringify({
              schema: {
                notes: [{ summary: "string", evidence: ["string"] }],
                summary: "string",
                nextTests: ["string"],
              },
              campaignInput: input.campaignInput,
              agentOutputs: input.agentOutputs,
              forecast: input.forecast,
              recommendation: input.recommendation,
            }),
          },
        ],
        temperature: 0.2,
        max_tokens: 900,
      }),
      cache: "no-store",
    });
    clearTimeout(timeout);

    const body = await response.json();
    if (!response.ok) {
      return {
        payload: null,
        model,
        error: typeof body?.error?.message === "string" ? body.error.message : `OpenRouter error ${response.status}`,
      };
    }

    const content = body?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      return { payload: null, model, error: "OpenRouter returned no content." };
    }

    return { payload: parseJson(content), model };
  } catch (error) {
    clearTimeout(timeout);
    return {
      payload: null,
      model,
      error: error instanceof Error ? error.message : "OpenRouter request failed.",
    };
  }
}

function parseJson(content: string): LlmPayload | null {
  try {
    return JSON.parse(content) as LlmPayload;
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as LlmPayload;
    } catch {
      return null;
    }
  }
}
