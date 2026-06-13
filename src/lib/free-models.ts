import type { FreeModelOption } from "./types";

const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";
const MODEL_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._:-]*$/i;

export const AUTO_FREE_MODEL = "openrouter/free";

export const fallbackFreeModelOptions: FreeModelOption[] = [
  { id: AUTO_FREE_MODEL, name: "Auto Free Router", contextLength: 200000 },
  { id: "openai/gpt-oss-120b:free", name: "OpenAI: gpt-oss-120b", contextLength: 131072 },
  { id: "openai/gpt-oss-20b:free", name: "OpenAI: gpt-oss-20b", contextLength: 131072 },
  { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Meta: Llama 3.3 70B Instruct", contextLength: 131072 },
  { id: "qwen/qwen3-next-80b-a3b-instruct:free", name: "Qwen: Qwen3 Next 80B A3B Instruct", contextLength: 262144 },
  { id: "qwen/qwen3-coder:free", name: "Qwen: Qwen3 Coder", contextLength: 1048576 },
  { id: "google/gemma-4-31b-it:free", name: "Google: Gemma 4 31B", contextLength: 262144 },
  { id: "liquid/lfm-2.5-1.2b-instruct:free", name: "LiquidAI: LFM2.5 1.2B Instruct", contextLength: 32768 },
];

type OpenRouterModel = {
  id?: unknown;
  name?: unknown;
  context_length?: unknown;
  architecture?: {
    input_modalities?: unknown;
    output_modalities?: unknown;
  };
  pricing?: {
    prompt?: unknown;
    completion?: unknown;
  };
};

export function normalizeFreeModelId(value: unknown) {
  const model = String(value || "").trim();
  if (model === AUTO_FREE_MODEL) return AUTO_FREE_MODEL;
  if (model.length <= 160 && model.endsWith(":free") && MODEL_ID_PATTERN.test(model)) return model;
  return AUTO_FREE_MODEL;
}

export async function getFreeModelOptions() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);

  try {
    const response = await fetch(OPENROUTER_MODELS_URL, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
      next: { revalidate: 3600 },
    });

    if (!response.ok) throw new Error(`OpenRouter models request failed with ${response.status}`);

    const body = (await response.json()) as { data?: OpenRouterModel[] };
    const liveOptions = Array.isArray(body.data)
      ? body.data.filter(isUsableFreeTextModel).map(toOption)
      : [];

    return mergeOptions(liveOptions);
  } catch {
    return fallbackFreeModelOptions;
  } finally {
    clearTimeout(timeout);
  }
}

function isUsableFreeTextModel(model: OpenRouterModel) {
  const id = typeof model.id === "string" ? model.id : "";
  const name = typeof model.name === "string" ? model.name : "";
  const input = Array.isArray(model.architecture?.input_modalities) ? model.architecture.input_modalities : [];
  const output = Array.isArray(model.architecture?.output_modalities) ? model.architecture.output_modalities : [];
  const hasFreePricing = model.pricing?.prompt === "0" && model.pricing?.completion === "0";
  const isFreeModel = id === AUTO_FREE_MODEL || id.endsWith(":free");
  const isTextModel = input.includes("text") && output.includes("text");
  const unsuitable = /(safety|moderation|guard|rerank|embedding|lyria|clip|uncensored)/i.test(`${id} ${name}`);

  return hasFreePricing && isFreeModel && isTextModel && !unsuitable;
}

function toOption(model: OpenRouterModel): FreeModelOption {
  return {
    id: String(model.id),
    name: cleanModelName(String(model.name || model.id)),
    contextLength: Number(model.context_length || 0),
  };
}

function mergeOptions(liveOptions: FreeModelOption[]) {
  const byId = new Map<string, FreeModelOption>();
  for (const option of [...fallbackFreeModelOptions, ...liveOptions]) {
    byId.set(option.id, option);
  }

  const preferredOrder = new Map(fallbackFreeModelOptions.map((option, index) => [option.id, index]));
  return [...byId.values()]
    .sort((a, b) => {
      const rankA = preferredOrder.get(a.id) ?? 999;
      const rankB = preferredOrder.get(b.id) ?? 999;
      if (rankA !== rankB) return rankA - rankB;
      return a.name.localeCompare(b.name);
    })
    .slice(0, 18);
}

function cleanModelName(name: string) {
  return name.replace(/\s*\(free\)\s*$/i, "").trim();
}
