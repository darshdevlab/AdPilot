"use client";

import { useEffect, useMemo, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import {
  Check,
  Loader2,
  Play,
} from "lucide-react";
import {
  LATEST_ANALYSIS_RESULT_KEY,
  PENDING_CAMPAIGN_INPUT_KEY,
} from "@/lib/client-storage";
import { ProjectLinks } from "@/components/project-links";
import {
  campaignLabels,
  campaignTypes,
  type CampaignInput,
  type CampaignType,
  type FreeModelOption,
  type StoredCampaignHistory,
  type StoredCampaignRecord,
} from "@/lib/types";

const defaultModelOptions: FreeModelOption[] = [
  { id: "openrouter/free", name: "Auto Free Router", contextLength: 200000 },
  { id: "openai/gpt-oss-120b:free", name: "OpenAI: gpt-oss-120b", contextLength: 131072 },
  { id: "openai/gpt-oss-20b:free", name: "OpenAI: gpt-oss-20b", contextLength: 131072 },
  { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Meta: Llama 3.3 70B Instruct", contextLength: 131072 },
];

const initialModels = ["openrouter/free", "openai/gpt-oss-120b:free", "openai/gpt-oss-20b:free"];

const initialInput: CampaignInput = {
  email: "",
  campaignName: "",
  campaignType: "mixed",
  objective: "lead_generation",
  modelPreference: initialModels[0],
  modelPreferences: initialModels,
  agentCount: 12,
  geography: "",
  persona: "",
  budget: 1000,
  durationDays: 14,
  channels: ["search_ads", "social_ads", "email", "linkedin_b2b"],
  offer: "",
  creative: "",
  landingPage: "",
  averageOrderValue: 100,
};

const objectiveLabels = {
  awareness: "Awareness",
  traffic: "Traffic",
  lead_generation: "Lead Generation",
  sales: "Sales",
  app_installs: "App Installs",
  retention: "Retention",
};

type SubmitState = "idle" | "running" | "done" | "error";
export default function Home() {
  const router = useRouter();
  const [input, setInput] = useState<CampaignInput>(initialInput);
  const [state, setState] = useState<SubmitState>("idle");
  const [error, setError] = useState("");
  const [modelOptions, setModelOptions] = useState<FreeModelOption[]>(defaultModelOptions);

  const selectedChannels = useMemo(() => new Set(input.channels), [input.channels]);
  const visibleModelOptions = useMemo(() => {
    const byId = new Map(modelOptions.map((model) => [model.id, model]));
    for (const modelId of input.modelPreferences) {
      if (!byId.has(modelId)) byId.set(modelId, { id: modelId, name: compactModelName(modelId), contextLength: 0 });
    }
    return [...byId.values()];
  }, [input.modelPreferences, modelOptions]);

  useEffect(() => {
    let active = true;
    fetch("/api/models")
      .then((response) => response.json())
      .then((body) => {
        if (active && body?.ok && Array.isArray(body.models) && body.models.length) {
          setModelOptions(body.models);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/history", { cache: "no-store" })
      .then((response) => response.json())
      .then((body: StoredCampaignHistory) => {
        const records = body.records || [];
        if (active && body.ok && records[0]) {
          setInput(storedRecordToInput(records[0]));
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  function analyze() {
    setState("running");
    setError("");

    try {
      if (!isValidEmail(input.email)) {
        throw new Error("Enter a valid email before running the simulation.");
      }
      sessionStorage.setItem(PENDING_CAMPAIGN_INPUT_KEY, JSON.stringify(input));
      sessionStorage.removeItem(LATEST_ANALYSIS_RESULT_KEY);
      router.push("/results" as Route);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open the results page.");
      setState("error");
    }
  }

  function update<K extends keyof CampaignInput>(key: K, value: CampaignInput[K]) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  function updateModelPreference(index: number, value: string) {
    setInput((current) => {
      const modelPreferences = [...current.modelPreferences];
      modelPreferences[index] = value;
      return {
        ...current,
        modelPreference: modelPreferences[0],
        modelPreferences,
      };
    });
  }

  function toggleChannel(channel: CampaignType) {
    setInput((current) => {
      const exists = current.channels.includes(channel);
      const channels = exists
        ? current.channels.filter((item) => item !== channel)
        : [...current.channels, channel];
      return { ...current, channels: channels.length ? channels : [current.campaignType] };
    });
  }

  return (
    <main className="app-shell form-only">
      <section className="control-panel" aria-label="Campaign input">
        <div className="workspace-header">
          <div>
            <h1 className="brand-title">
              <span className="brand-title-accent">AdPilot :</span>
              {" "}
              <span>Campaign Simulator</span>
            </h1>
          </div>
          <ProjectLinks />
        </div>

        <div className="setup-layout">
          <div className="setup-main">
            <section className="form-section">
              <div className="form-section-head">
                <div>
                  <p className="section-kicker">New Simulation</p>
                  <h2>Campaign Setup</h2>
                </div>
              </div>

              <div className="form-grid">
                <label>
                  <span>Email</span>
                  <input
                    value={input.email}
                    onChange={(event) => update("email", event.target.value)}
                    placeholder="your email for this run"
                    type="email"
                  />
                </label>

                <label>
                  <span>Campaign</span>
                  <input
                    value={input.campaignName}
                    onChange={(event) => update("campaignName", event.target.value)}
                    placeholder="Campaign name"
                  />
                </label>

                <label>
                  <span>Type</span>
                  <select
                    value={input.campaignType}
                    onChange={(event) => {
                      const campaignType = event.target.value as CampaignType;
                      update("campaignType", campaignType);
                      if (campaignType !== "mixed") update("channels", [campaignType]);
                    }}
                  >
                    {campaignTypes.map((type) => (
                      <option key={type} value={type}>
                        {campaignLabels[type]}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Objective</span>
                  <select
                    value={input.objective}
                    onChange={(event) => update("objective", event.target.value as CampaignInput["objective"])}
                  >
                    {Object.entries(objectiveLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Agents</span>
                  <input
                    value={input.agentCount}
                    min={6}
                    max={200}
                    onChange={(event) => update("agentCount", Number(event.target.value))}
                    type="number"
                  />
                </label>

                <label>
                  <span>Budget</span>
                  <input
                    value={input.budget}
                    min={100}
                    onChange={(event) => update("budget", Number(event.target.value))}
                    type="number"
                  />
                </label>

                <label>
                  <span>Days</span>
                  <input
                    value={input.durationDays}
                    min={1}
                    max={180}
                    onChange={(event) => update("durationDays", Number(event.target.value))}
                    type="number"
                  />
                </label>

                <label>
                  <span>AOV / Lead Value</span>
                  <input
                    value={input.averageOrderValue}
                    min={1}
                    onChange={(event) => update("averageOrderValue", Number(event.target.value))}
                    type="number"
                  />
                </label>
              </div>
            </section>

            <section className="form-section">
              <div className="form-section-head">
                <div>
                  <p className="section-kicker">Models</p>
                  <h2>Simulation Ensemble</h2>
                </div>
              </div>

              <div className="model-slot-grid">
                {[0, 1, 2].map((index) => (
                  <label key={index} className="model-field">
                    <span>Model {index + 1}</span>
                    <select
                      value={input.modelPreferences[index] || input.modelPreferences[0]}
                      onChange={(event) => updateModelPreference(index, event.target.value)}
                    >
                      {visibleModelOptions.map((model) => (
                        <option key={model.id} value={model.id}>
                          {formatModelOption(model)}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </section>

            <section className="form-section">
              <div className="form-section-head">
                <div>
                  <p className="section-kicker">Audience</p>
                  <h2>Targeting</h2>
                </div>
              </div>

              <label>
                <span>Geography</span>
                <input
                  value={input.geography}
                  onChange={(event) => update("geography", event.target.value)}
                  placeholder="Country, region, city, or market segment"
                />
              </label>

              <label className="wide-field">
                <span>Persona</span>
                <textarea
                  value={input.persona}
                  onChange={(event) => update("persona", event.target.value)}
                  placeholder="Who are you targeting and what behavior should agents simulate?"
                  rows={2}
                />
              </label>

              <div className="channel-grid" aria-label="Channels">
                {campaignTypes.filter((type) => type !== "mixed").map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={selectedChannels.has(type) ? "channel-chip active" : "channel-chip"}
                    onClick={() => toggleChannel(type)}
                  >
                    {selectedChannels.has(type) ? <Check size={14} /> : null}
                    <span>{campaignLabels[type]}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="form-section">
              <div className="form-section-head">
                <div>
                  <p className="section-kicker">Message</p>
                  <h2>Offer & Creative</h2>
                </div>
              </div>

              <label>
                <span>Offer</span>
                <textarea
                  value={input.offer}
                  onChange={(event) => update("offer", event.target.value)}
                  placeholder="What is the campaign offer?"
                  rows={1}
                />
              </label>

              <label className="wide-field">
                <span>Creative</span>
                <textarea
                  value={input.creative}
                  onChange={(event) => update("creative", event.target.value)}
                  placeholder="Describe the message, angle, hook, or ad copy."
                  rows={2}
                />
              </label>

              <label className="wide-field">
                <span>Landing Page</span>
                <textarea
                  value={input.landingPage}
                  onChange={(event) => update("landingPage", event.target.value)}
                  placeholder="Describe the conversion path or page."
                  rows={1}
                />
              </label>
            </section>

          </div>

          <footer className="submit-footer action-only-panel" aria-label="Campaign simulation action">
            <div className="analytics-action-card">
              <button type="button" className="primary-button wide-action" onClick={analyze} disabled={state === "running"}>
                {state === "running" ? <Loader2 size={18} className="spin" /> : <Play size={18} />}
                <span>{state === "running" ? "Opening Results" : "Simulate Campaign Report"}</span>
              </button>
              {error ? <p className="error-line">{error}</p> : null}
            </div>
          </footer>
        </div>
      </section>
    </main>
  );
}

function storedRecordToInput(record: StoredCampaignRecord): CampaignInput {
  const stored = record.input || {};
  const campaignType = safeCampaignType(stored.campaignType || record.campaignType);
  const modelPreferences = safeModels(stored.modelPreferences || record.models);
  const channels = safeChannels(stored.channels || record.channels, campaignType);

  return {
    email: "",
    campaignName: safeText(stored.campaignName, record.campaignName),
    campaignType,
    objective: safeObjective(stored.objective || record.objective),
    modelPreference: modelPreferences[0],
    modelPreferences,
    agentCount: safeNumber(stored.agentCount, record.metrics.users || initialInput.agentCount, 6, 200),
    geography: safeText(stored.geography, record.geography),
    persona: safeText(stored.persona, initialInput.persona),
    budget: safeNumber(stored.budget, initialInput.budget, 100, 100000000),
    durationDays: safeNumber(stored.durationDays, initialInput.durationDays, 1, 180),
    channels,
    offer: safeText(stored.offer, initialInput.offer),
    creative: safeText(stored.creative, initialInput.creative),
    landingPage: safeText(stored.landingPage, initialInput.landingPage),
    averageOrderValue: safeNumber(stored.averageOrderValue, initialInput.averageOrderValue, 1, 100000000),
  };
}

function safeText(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function safeNumber(value: unknown, fallback: number, min: number, max: number) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function safeCampaignType(value: unknown): CampaignType {
  return typeof value === "string" && campaignTypes.includes(value as CampaignType)
    ? value as CampaignType
    : initialInput.campaignType;
}

function safeObjective(value: unknown): CampaignInput["objective"] {
  return typeof value === "string" && value in objectiveLabels
    ? value as CampaignInput["objective"]
    : initialInput.objective;
}

function safeChannels(value: unknown, campaignType: CampaignType): CampaignType[] {
  if (!Array.isArray(value)) return campaignType === "mixed" ? initialInput.channels : [campaignType];
  const channels = value.filter((item): item is CampaignType =>
    typeof item === "string" && campaignTypes.includes(item as CampaignType) && item !== "mixed",
  );
  return channels.length ? channels : campaignType === "mixed" ? initialInput.channels : [campaignType];
}

function safeModels(value: unknown): string[] {
  const models = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
  return [...new Set([...models, ...initialModels])].slice(0, 3);
}

function formatModelOption(model: FreeModelOption) {
  const context = model.contextLength ? ` - ${Math.round(model.contextLength / 1000)}k` : "";
  return `${model.name}${context}`;
}

function compactModelName(modelId: string) {
  if (modelId === "openrouter/free") return "Auto Free";
  const slug = modelId.split("/").pop() || modelId;
  return slug.replace(/:free$/i, "");
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
