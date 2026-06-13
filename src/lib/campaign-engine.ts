import {
  campaignLabels,
  campaignTypes,
  type AgentNote,
  type AnalysisResult,
  type CampaignInput,
  type CampaignObjective,
  type CampaignType,
  type Forecast,
  type ForecastBand,
  type Recommendation,
  type SimulatedAgent,
  type SimulationEvent,
  type SimulationReport,
} from "./types";
import { AUTO_FREE_MODEL, normalizeFreeModelId } from "./free-models";

type Bench = {
  cpm: number;
  ctr: number;
  cvr: number;
  reachFactor: number;
  objectiveFit: CampaignObjective[];
};

const benchmarks: Record<CampaignType, Bench> = {
  search_ads: { cpm: 42, ctr: 0.052, cvr: 0.041, reachFactor: 0.78, objectiveFit: ["traffic", "lead_generation", "sales"] },
  social_ads: { cpm: 18, ctr: 0.014, cvr: 0.021, reachFactor: 0.66, objectiveFit: ["awareness", "traffic", "sales"] },
  display_ads: { cpm: 9, ctr: 0.006, cvr: 0.012, reachFactor: 0.72, objectiveFit: ["awareness", "retention"] },
  video_ads: { cpm: 16, ctr: 0.009, cvr: 0.01, reachFactor: 0.7, objectiveFit: ["awareness", "traffic"] },
  email: { cpm: 3, ctr: 0.032, cvr: 0.048, reachFactor: 0.88, objectiveFit: ["retention", "sales", "lead_generation"] },
  influencer: { cpm: 24, ctr: 0.018, cvr: 0.024, reachFactor: 0.61, objectiveFit: ["awareness", "sales"] },
  seo_content: { cpm: 12, ctr: 0.025, cvr: 0.026, reachFactor: 0.5, objectiveFit: ["traffic", "lead_generation"] },
  affiliate: { cpm: 28, ctr: 0.021, cvr: 0.052, reachFactor: 0.54, objectiveFit: ["sales", "lead_generation"] },
  app_install: { cpm: 21, ctr: 0.019, cvr: 0.058, reachFactor: 0.63, objectiveFit: ["app_installs"] },
  ecommerce: { cpm: 26, ctr: 0.026, cvr: 0.035, reachFactor: 0.62, objectiveFit: ["sales", "traffic"] },
  lead_generation: { cpm: 32, ctr: 0.024, cvr: 0.044, reachFactor: 0.58, objectiveFit: ["lead_generation"] },
  local_store: { cpm: 14, ctr: 0.012, cvr: 0.03, reachFactor: 0.73, objectiveFit: ["awareness", "sales"] },
  event: { cpm: 38, ctr: 0.018, cvr: 0.034, reachFactor: 0.49, objectiveFit: ["awareness", "lead_generation"] },
  out_of_home: { cpm: 7, ctr: 0.002, cvr: 0.008, reachFactor: 0.82, objectiveFit: ["awareness"] },
  print: { cpm: 11, ctr: 0.003, cvr: 0.01, reachFactor: 0.68, objectiveFit: ["awareness", "local_store"] as CampaignObjective[] },
  radio: { cpm: 8, ctr: 0.0025, cvr: 0.009, reachFactor: 0.76, objectiveFit: ["awareness"] },
  tv: { cpm: 22, ctr: 0.0018, cvr: 0.007, reachFactor: 0.84, objectiveFit: ["awareness"] },
  sms_whatsapp: { cpm: 5, ctr: 0.071, cvr: 0.055, reachFactor: 0.92, objectiveFit: ["retention", "sales", "lead_generation"] },
  linkedin_b2b: { cpm: 58, ctr: 0.009, cvr: 0.033, reachFactor: 0.52, objectiveFit: ["lead_generation", "traffic"] },
  mixed: { cpm: 24, ctr: 0.018, cvr: 0.028, reachFactor: 0.65, objectiveFit: ["awareness", "traffic", "lead_generation", "sales"] },
};

const fallbackChannels: CampaignType[] = ["search_ads", "social_ads", "email"];
const fallbackModels = [AUTO_FREE_MODEL, AUTO_FREE_MODEL, AUTO_FREE_MODEL];
const virtualNames = [
  "Aarav Shah",
  "Maya Patel",
  "Jordan Lee",
  "Priya Nair",
  "Ethan Brooks",
  "Nina Kapoor",
  "Rohan Mehta",
  "Sofia Chen",
  "Daniel Kim",
  "Isha Rao",
  "Marcus Reed",
  "Anika Verma",
  "Leo Morgan",
  "Sara Williams",
  "Kabir Singh",
  "Mira Joshi",
  "Noah Carter",
  "Tara Desai",
  "Owen Rivera",
  "Leah Thomas",
];

const personaTemplates = [
  {
    name: "High-Intent Evaluators",
    summary: "Actively compares solutions and reacts to direct proof, clear pricing, and a low-friction CTA.",
    intentBase: 72,
    clickBias: 9,
    purchaseBias: 8,
  },
  {
    name: "Budget-Conscious Buyers",
    summary: "Needs stronger value framing and social proof before moving from interest to conversion.",
    intentBase: 58,
    clickBias: 1,
    purchaseBias: -4,
  },
  {
    name: "Problem-Aware Researchers",
    summary: "Understands the pain point but needs education, comparison content, and retargeting.",
    intentBase: 51,
    clickBias: 4,
    purchaseBias: -8,
  },
  {
    name: "Passive Awareness Audience",
    summary: "Not ready to convert yet; useful for reach but weaker for immediate purchase outcomes.",
    intentBase: 39,
    clickBias: -7,
    purchaseBias: -14,
  },
];

export function normalizeInput(raw: unknown): CampaignInput {
  const input = raw as Partial<CampaignInput>;
  const campaignType = campaignTypes.includes(input.campaignType as CampaignType)
    ? (input.campaignType as CampaignType)
    : "mixed";
  const budget = clampNumber(Number(input.budget || 0), 100, 10000000);
  const durationDays = clampNumber(Number(input.durationDays || 14), 1, 180);
  const averageOrderValue = clampNumber(Number(input.averageOrderValue || 120), 1, 10000000);
  const channels = Array.isArray(input.channels)
    ? input.channels.filter((channel): channel is CampaignType => campaignTypes.includes(channel))
    : [];
  const modelPreferences = normalizeModelPreferences(input);

  return {
    email: String(input.email || "").trim().toLowerCase(),
    campaignName: cleanText(input.campaignName, "Untitled campaign"),
    campaignType,
    objective: normalizeObjective(input.objective),
    modelPreference: modelPreferences[0],
    modelPreferences,
    agentCount: Math.round(clampNumber(Number(input.agentCount || 24), 6, 200)),
    geography: cleanText(input.geography, "United States"),
    persona: cleanText(input.persona, "Busy working professionals evaluating a practical offer"),
    budget,
    durationDays,
    channels: channels.length ? channels : campaignType === "mixed" ? fallbackChannels : [campaignType],
    offer: cleanText(input.offer, "Clear value proposition with a measurable call to action"),
    creative: cleanText(input.creative, "Benefit-led creative with concise proof and one primary action"),
    landingPage: cleanText(input.landingPage, "Landing page has the offer, proof, pricing, and conversion action"),
    averageOrderValue,
  };
}

export function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export function analyzeDeterministic(input: CampaignInput): Omit<AnalysisResult, "modelInfo" | "saved"> {
  const forecast = buildForecast(input);
  const agentOutputs = buildAgentNotes(input, forecast);
  const recommendation = buildRecommendation(input, forecast, agentOutputs);
  const simulationReport = buildSimulationReport(input, forecast);

  return {
    campaignInput: input,
    agentOutputs,
    forecast,
    recommendation,
    simulationReport,
  };
}

function buildForecast(input: CampaignInput): Forecast {
  const activeChannels = input.channels.length ? input.channels : [input.campaignType];
  const spendPerChannel = input.budget / activeChannels.length;
  const channelMix = activeChannels.map((channel) => {
    const bench = benchmarks[channel] || benchmarks.mixed;
    const objectiveMultiplier = bench.objectiveFit.includes(input.objective) ? 1.12 : 0.86;
    const personaMultiplier = scoreTextDepth(input.persona) > 0.62 ? 1.08 : 0.94;
    const creativeMultiplier = scoreTextDepth(input.creative) > 0.62 && input.offer.length > 24 ? 1.1 : 0.9;
    const geographyMultiplier = input.geography.split(",").length > 1 || input.geography.length > 12 ? 1.04 : 0.95;
    const impressions = (spendPerChannel / bench.cpm) * 1000;
    const clicks = impressions * bench.ctr * objectiveMultiplier * personaMultiplier;
    const conversions = clicks * bench.cvr * creativeMultiplier * geographyMultiplier;

    return {
      channel,
      label: campaignLabels[channel],
      spend: round(spendPerChannel),
      impressions: Math.round(impressions),
      clicks: Math.round(clicks),
      conversions: round(conversions),
    };
  });

  const impressions = sum(channelMix.map((row) => row.impressions));
  const clicks = sum(channelMix.map((row) => row.clicks));
  const conversions = sum(channelMix.map((row) => row.conversions));
  const reach = sum(
    channelMix.map((row) => row.impressions * (benchmarks[row.channel]?.reachFactor || benchmarks.mixed.reachFactor)),
  );
  const revenue = conversions * input.averageOrderValue;
  const cpc = clicks > 0 ? input.budget / clicks : input.budget;
  const cpa = conversions > 0 ? input.budget / conversions : input.budget;
  const ctr = impressions > 0 ? clicks / impressions : 0;
  const conversionRate = clicks > 0 ? conversions / clicks : 0;
  const roas = input.budget > 0 ? revenue / input.budget : 0;

  return {
    assumptions: [
      `Forecast is based on ${activeChannels.length} active channel${activeChannels.length === 1 ? "" : "s"} over ${input.durationDays} days.`,
      `Budget is allocated evenly in V1; optimizer recommendations can shift it after review.`,
      `Numbers are planning estimates, not guaranteed media outcomes.`,
    ],
    metrics: {
      impressions: band(impressions, 0.7, 1.28, true),
      reach: band(reach, 0.64, 1.22, true),
      clicks: band(clicks, 0.62, 1.32, true),
      conversions: band(conversions, 0.52, 1.42, false),
      revenue: band(revenue, 0.5, 1.48, false),
      ctr: band(ctr, 0.78, 1.2, false),
      conversionRate: band(conversionRate, 0.72, 1.25, false),
      cpc: band(cpc, 1.28, 0.76, false),
      cpa: band(cpa, 1.34, 0.7, false),
      roas: band(roas, 0.5, 1.45, false),
    },
    channelMix,
  };
}

function buildAgentNotes(input: CampaignInput, forecast: Forecast): AgentNote[] {
  const strongest = [...forecast.channelMix].sort((a, b) => b.conversions - a.conversions)[0];
  const weakCreative = input.creative.length < 80 || input.offer.length < 35;
  const broadGeo = input.geography.length < 10 || /global|anywhere|all/i.test(input.geography);
  const highCpa = forecast.metrics.cpa.base > input.averageOrderValue * 0.45;

  return [
    {
      agent: "Persona Agent",
      status: scoreTextDepth(input.persona) > 0.56 ? "pass" : "watch",
      summary: scoreTextDepth(input.persona) > 0.56
        ? "Audience definition has enough behavioral context for targeting."
        : "Audience definition is broad and should include buyer role, trigger, and urgency.",
      evidence: [input.persona, `Objective: ${input.objective}`],
    },
    {
      agent: "Geography Agent",
      status: broadGeo ? "watch" : "pass",
      summary: broadGeo
        ? "Geography is broad; forecast confidence improves when city, region, language, or market tier is specified."
        : "Geography is specific enough to adapt channel assumptions and expected reach.",
      evidence: [input.geography],
    },
    {
      agent: "Channel Agent",
      status: strongest ? "pass" : "watch",
      summary: strongest
        ? `${strongest.label} is the strongest V1 conversion driver in the current mix.`
        : "Channel mix needs at least one active campaign channel.",
      evidence: forecast.channelMix.map((row) => `${row.label}: ${row.conversions.toFixed(1)} conversions`),
    },
    {
      agent: "Creative Critic Agent",
      status: weakCreative ? "risk" : "pass",
      summary: weakCreative
        ? "Creative or offer copy is too thin for reliable conversion forecasting."
        : "Creative and offer have enough detail to support a measurable test.",
      evidence: [input.offer, input.creative],
    },
    {
      agent: "Forecast Agent",
      status: forecast.metrics.roas.base >= 1.2 || input.objective !== "sales" ? "pass" : "watch",
      summary: `Base forecast: ${Math.round(forecast.metrics.clicks.base)} clicks, ${forecast.metrics.conversions.base.toFixed(1)} conversions, ${forecast.metrics.roas.base.toFixed(2)} ROAS.`,
      evidence: forecast.assumptions,
    },
    {
      agent: "Risk Agent",
      status: highCpa || weakCreative ? "risk" : "pass",
      summary: highCpa
        ? "CPA is high relative to order value; narrow the audience or improve the offer before scaling."
        : "No blocking risk found for a controlled validation launch.",
      evidence: [`CPA: ${formatMoney(forecast.metrics.cpa.base)}`, `AOV: ${formatMoney(input.averageOrderValue)}`],
    },
    {
      agent: "Optimizer Agent",
      status: "pass",
      summary: strongest
        ? `Start with a controlled test and shift budget toward ${strongest.label} if early CPA stays inside target.`
        : "Start with a small validation budget and collect baseline response data.",
      evidence: ["Run low/base/high forecast review before increasing spend.", "Use one primary conversion event."],
    },
  ];
}

function buildRecommendation(input: CampaignInput, forecast: Forecast, notes: AgentNote[]): Recommendation {
  const risks = notes.filter((note) => note.status === "risk").length;
  const watches = notes.filter((note) => note.status === "watch").length;
  const confidence = clampNumber(86 - risks * 18 - watches * 7 + Math.min(8, input.channels.length * 2), 28, 94);
  const strongest = [...forecast.channelMix].sort((a, b) => b.conversions - a.conversions)[0];

  return {
    confidence,
    readiness: risks >= 2 ? "high_risk" : risks === 1 || watches >= 2 ? "needs_revision" : "ready",
    summary:
      risks >= 2
        ? "Campaign should be revised before launch because targeting, offer, or economics are weak."
        : risks === 1 || watches >= 2
          ? "Campaign is testable after tightening the highest-risk assumption."
          : "Campaign is ready for a limited validation launch with measurement guardrails.",
    nextTests: [
      "Run one offer-focused A/B test against the primary persona.",
      "Track one conversion event and one assist metric by channel.",
      "Review CPA and conversion quality before increasing budget.",
    ],
    budgetShift: strongest
      ? `Keep V1 even split for learning, then move 15-25% more budget toward ${strongest.label} if early CPA beats the base forecast.`
      : "Keep budget capped until channel response data is available.",
  };
}

function buildSimulationReport(input: CampaignInput, forecast: Forecast): SimulationReport {
  const activeChannels = input.channels.length ? input.channels : [input.campaignType];
  const activeModels = input.modelPreferences.length ? input.modelPreferences : fallbackModels;
  const campaignAbout = summarizeCampaign(input);
  const agents = Array.from({ length: input.agentCount }, (_, index) => {
    const persona = personaTemplates[index % personaTemplates.length];
    const channel = activeChannels[index % activeChannels.length];
    const model = activeModels[index % activeModels.length];
    const signal = seededScore(`${input.email}|${input.campaignName}|${input.persona}|${index}|${model}`);
    const channelBench = benchmarks[channel] || benchmarks.mixed;
    const objectiveFit = channelBench.objectiveFit.includes(input.objective) ? 8 : -6;
    const creativeFit = scoreTextDepth(input.creative) > 0.62 && input.offer.length > 34 ? 6 : -5;
    const geographyFit = input.geography.length > 12 ? 3 : -2;
    const intentScore = clampNumber(
      Math.round(persona.intentBase + signal * 24 + objectiveFit + creativeFit + geographyFit),
      12,
      98,
    );
    const clicked = intentScore + persona.clickBias >= 66;
    const conversionGate = input.objective === "awareness" || input.objective === "traffic" ? 90 : 80;
    const purchased = clicked && intentScore + persona.purchaseBias >= conversionGate;
    const lead = clicked && !purchased && ["lead_generation", "app_installs", "retention"].includes(input.objective) && intentScore >= 70;
    const bounced = clicked && !purchased && !lead && signal < 0.42;
    const outcome: SimulatedAgent["outcome"] = purchased
      ? "purchased"
      : lead
        ? "lead"
        : bounced
          ? "bounced"
          : clicked
            ? "clicked"
            : "retarget";
    const events = buildEvents(clicked, purchased, lead, bounced);

    return {
      id: `agent-${String(index + 1).padStart(3, "0")}`,
      name: virtualNames[index % virtualNames.length],
      personaGroup: persona.name,
      model,
      channel,
      location: pickLocation(input.geography, index),
      intentScore,
      clicked,
      purchased,
      outcome,
      campaignAbout,
      behavior: describeBehavior(outcome, campaignLabels[channel], campaignAbout),
      events,
    };
  });

  const personaGroups = personaTemplates.map((persona) => {
    const groupAgents = agents.filter((agent) => agent.personaGroup === persona.name);
    const channelCounts = countBy(groupAgents.map((agent) => campaignLabels[agent.channel]));
    return {
      name: persona.name,
      summary: persona.summary,
      total: groupAgents.length,
      clicks: groupAgents.filter((agent) => agent.clicked).length,
      purchases: groupAgents.filter((agent) => agent.purchased).length,
      leads: groupAgents.filter((agent) => agent.outcome === "lead").length,
      avgIntent: Math.round(sum(groupAgents.map((agent) => agent.intentScore)) / Math.max(1, groupAgents.length)),
      topChannel: Object.entries(channelCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Mixed",
    };
  }).filter((group) => group.total > 0);

  return {
    totalUniqueUsers: agents.length,
    totalGeneratedSimulations: agents.length * activeModels.length,
    activeModels,
    clicks: agents.filter((agent) => agent.clicked).length,
    purchases: agents.filter((agent) => agent.purchased).length,
    leads: agents.filter((agent) => agent.outcome === "lead").length,
    bounces: agents.filter((agent) => agent.outcome === "bounced").length,
    campaignAbout,
    timeline: [
      `Loaded ${agents.length} targeted user agents from persona and geography inputs.`,
      `Ran ${agents.length * activeModels.length} model-perspective simulations across ${activeModels.length} selected slots.`,
      `Grouped behavior into ${personaGroups.length} persona segments and compared click, lead, and purchase outcomes.`,
      `Aligned simulation against forecast base clicks ${Math.round(forecast.metrics.clicks.base).toLocaleString("en-US")} and conversions ${forecast.metrics.conversions.base.toFixed(1)}.`,
    ],
    personaGroups,
    agents,
  };
}

export function mergeLlmNotes(
  base: Omit<AnalysisResult, "modelInfo" | "saved">,
  llm: { notes?: Partial<AgentNote>[]; summary?: string; nextTests?: string[] } | null,
) {
  if (!llm) return base;

  const agentOutputs = base.agentOutputs.map((note, index) => {
    const candidate = llm.notes?.[index];
    return {
      ...note,
      summary: typeof candidate?.summary === "string" && candidate.summary.length > 12 ? candidate.summary : note.summary,
      evidence: Array.isArray(candidate?.evidence) && candidate.evidence.length
        ? candidate.evidence.filter((item): item is string => typeof item === "string").slice(0, 3)
        : note.evidence,
    };
  });

  return {
    ...base,
    agentOutputs,
    recommendation: {
      ...base.recommendation,
      summary: typeof llm.summary === "string" && llm.summary.length > 12 ? llm.summary : base.recommendation.summary,
      nextTests: Array.isArray(llm.nextTests) && llm.nextTests.length
        ? llm.nextTests.filter((item): item is string => typeof item === "string").slice(0, 4)
        : base.recommendation.nextTests,
    },
  };
}

function normalizeObjective(value: unknown): CampaignObjective {
  const objective = String(value || "lead_generation");
  if (["awareness", "traffic", "lead_generation", "sales", "app_installs", "retention"].includes(objective)) {
    return objective as CampaignObjective;
  }
  return "lead_generation";
}

function normalizeModelPreferences(input: Partial<CampaignInput>) {
  const rawModels = Array.isArray(input.modelPreferences) && input.modelPreferences.length
    ? input.modelPreferences
    : [input.modelPreference || AUTO_FREE_MODEL];
  const normalized = rawModels.slice(0, 3).map(normalizeFreeModelId);
  while (normalized.length < 3) normalized.push(normalized[normalized.length - 1] || AUTO_FREE_MODEL);
  return normalized;
}

function cleanText(value: unknown, fallback: string) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  return text || fallback;
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function summarizeCampaign(input: CampaignInput) {
  const offer = input.offer.replace(/\.$/, "");
  const objectiveLabel = input.objective.replace(/_/g, " ");
  return `${offer} for ${objectiveLabel} in ${campaignLabels[input.campaignType]}`;
}

function pickLocation(geography: string, index: number) {
  const parts = geography.split(",").map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return "Target market";
  return parts[index % parts.length];
}

function buildEvents(clicked: boolean, purchased: boolean, lead: boolean, bounced: boolean): SimulationEvent[] {
  const events: SimulationEvent[] = ["impression"];
  if (clicked) events.push("click");
  if (purchased) events.push("purchase");
  else if (lead) events.push("lead");
  else if (bounced) events.push("bounce");
  else events.push("retarget");
  return events;
}

function describeBehavior(outcome: SimulatedAgent["outcome"], channel: string, campaignAbout: string) {
  if (outcome === "purchased") return `Clicked from ${channel}, accepted the offer, and completed purchase intent for ${campaignAbout}.`;
  if (outcome === "lead") return `Clicked from ${channel}, showed form-level intent, and should be routed to lead follow-up.`;
  if (outcome === "clicked") return `Clicked from ${channel} but needs more proof or urgency before purchase.`;
  if (outcome === "bounced") return `Clicked from ${channel} but left after the landing page message did not match expectations.`;
  return `Saw the campaign through ${channel} and should stay in the retargeting pool.`;
}

function seededScore(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function countBy(values: string[]) {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function scoreTextDepth(text: string) {
  const words = text.split(/\s+/).filter(Boolean);
  const hasSpecifics = /because|when|who|for|with|without|from|near|age|role|income|city|team|need/i.test(text);
  return Math.min(1, words.length / 28 + (hasSpecifics ? 0.22 : 0));
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function band(base: number, lowFactor: number, highFactor: number, integer: boolean): ForecastBand {
  const low = base * lowFactor;
  const high = base * highFactor;
  return {
    low: integer ? Math.round(low) : round(low),
    base: integer ? Math.round(base) : round(base),
    high: integer ? Math.round(high) : round(high),
  };
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function formatMoney(value: number) {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}
