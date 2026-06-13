export const campaignTypes = [
  "search_ads",
  "social_ads",
  "display_ads",
  "video_ads",
  "email",
  "influencer",
  "seo_content",
  "affiliate",
  "app_install",
  "ecommerce",
  "lead_generation",
  "local_store",
  "event",
  "out_of_home",
  "print",
  "radio",
  "tv",
  "sms_whatsapp",
  "linkedin_b2b",
  "mixed",
] as const;

export type CampaignType = (typeof campaignTypes)[number];

export const campaignLabels: Record<CampaignType, string> = {
  search_ads: "Search Ads",
  social_ads: "Social Ads",
  display_ads: "Display Ads",
  video_ads: "Video Ads",
  email: "Email",
  influencer: "Influencer",
  seo_content: "SEO Content",
  affiliate: "Affiliate",
  app_install: "App Install",
  ecommerce: "Ecommerce",
  lead_generation: "Lead Generation",
  local_store: "Local Store",
  event: "Event",
  out_of_home: "Out Of Home",
  print: "Print",
  radio: "Radio",
  tv: "TV",
  sms_whatsapp: "SMS / WhatsApp",
  linkedin_b2b: "LinkedIn B2B",
  mixed: "Mixed Campaign",
};

export const objectives = [
  "awareness",
  "traffic",
  "lead_generation",
  "sales",
  "app_installs",
  "retention",
] as const;

export type CampaignObjective = (typeof objectives)[number];

export type CampaignInput = {
  email: string;
  campaignName: string;
  campaignType: CampaignType;
  objective: CampaignObjective;
  modelPreference: string;
  modelPreferences: string[];
  agentCount: number;
  geography: string;
  persona: string;
  budget: number;
  durationDays: number;
  channels: CampaignType[];
  offer: string;
  creative: string;
  landingPage: string;
  averageOrderValue: number;
};

export type FreeModelOption = {
  id: string;
  name: string;
  contextLength: number;
};

export type AgentNote = {
  agent: string;
  status: "pass" | "watch" | "risk";
  summary: string;
  evidence: string[];
};

export type ForecastBand = {
  low: number;
  base: number;
  high: number;
};

export type Forecast = {
  assumptions: string[];
  metrics: {
    impressions: ForecastBand;
    reach: ForecastBand;
    clicks: ForecastBand;
    conversions: ForecastBand;
    revenue: ForecastBand;
    ctr: ForecastBand;
    conversionRate: ForecastBand;
    cpc: ForecastBand;
    cpa: ForecastBand;
    roas: ForecastBand;
  };
  channelMix: Array<{
    channel: CampaignType;
    label: string;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
  }>;
};

export type Recommendation = {
  confidence: number;
  readiness: "ready" | "needs_revision" | "high_risk";
  summary: string;
  nextTests: string[];
  budgetShift: string;
};

export type SimulationEvent = "impression" | "click" | "purchase" | "lead" | "bounce" | "retarget";

export type SimulatedAgent = {
  id: string;
  name: string;
  personaGroup: string;
  model: string;
  channel: CampaignType;
  location: string;
  intentScore: number;
  clicked: boolean;
  purchased: boolean;
  outcome: "purchased" | "clicked" | "lead" | "bounced" | "retarget";
  campaignAbout: string;
  behavior: string;
  events: SimulationEvent[];
};

export type PersonaSimulationGroup = {
  name: string;
  summary: string;
  total: number;
  clicks: number;
  purchases: number;
  leads: number;
  avgIntent: number;
  topChannel: string;
};

export type SimulationReport = {
  totalUniqueUsers: number;
  totalGeneratedSimulations: number;
  activeModels: string[];
  clicks: number;
  purchases: number;
  leads: number;
  bounces: number;
  campaignAbout: string;
  timeline: string[];
  personaGroups: PersonaSimulationGroup[];
  agents: SimulatedAgent[];
};

export type AnalysisResult = {
  id?: string;
  campaignInput: CampaignInput;
  agentOutputs: AgentNote[];
  forecast: Forecast;
  recommendation: Recommendation;
  simulationReport: SimulationReport;
  modelInfo: {
    mode: "openrouter" | "deterministic";
    model: string;
    models: string[];
    error?: string;
  };
  saved: {
    ok: boolean;
    analysisId?: string;
    error?: string;
  };
};

export type StoredCampaignRecord = {
  id: string;
  createdAt: string;
  maskedEmail: string;
  campaignType: string;
  campaignName: string;
  objective: string;
  geography: string;
  channels: string[];
  models: string[];
  input: Partial<CampaignInput>;
  metrics: {
    users: number;
    generated: number;
    clicks: number;
    conversions: number;
    revenue: number;
  };
  recommendation: {
    readiness: string;
    confidence: number;
    summary: string;
  };
  hasSimulationReport: boolean;
};

export type StoredCampaignHistory = {
  ok: boolean;
  source?: "supabase";
  tables?: string[];
  totals?: {
    analyses: number;
    simulationsCompleted?: number;
    subscribers: number;
    uniqueEmails?: number;
    latestAt: string | null;
  };
  records?: StoredCampaignRecord[];
  error?: string;
};
