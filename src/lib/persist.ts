import type { AnalysisResult } from "./types";

const DEFAULT_INGEST_URL = "https://peluzzqoihjvkdtedsiz.supabase.co/functions/v1/adpilot-ingest";

export async function saveAnalysis(result: Omit<AnalysisResult, "saved">) {
  const ingestUrl = process.env.ADPILOT_INGEST_URL || DEFAULT_INGEST_URL;
  const simulationSummary = {
    totalUniqueUsers: result.simulationReport.totalUniqueUsers,
    totalGeneratedSimulations: result.simulationReport.totalGeneratedSimulations,
    activeModels: result.simulationReport.activeModels,
    clicks: result.simulationReport.clicks,
    purchases: result.simulationReport.purchases,
    leads: result.simulationReport.leads,
    bounces: result.simulationReport.bounces,
    campaignAbout: result.simulationReport.campaignAbout,
    timeline: result.simulationReport.timeline,
    personaGroups: result.simulationReport.personaGroups,
    agents: result.simulationReport.agents,
  };

  try {
    const response = await fetch(ingestUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: result.campaignInput.email,
        campaignType: result.campaignInput.campaignType,
        campaignInput: result.campaignInput,
        agentOutputs: result.agentOutputs,
        forecast: result.forecast,
        recommendation: result.recommendation,
        simulationReport: simulationSummary,
        modelInfo: result.modelInfo,
        metadata: {
          app: "AdPilot",
          runtime: "vercel-nextjs",
          simulationReport: simulationSummary,
        },
      }),
      cache: "no-store",
    });

    const body = await response.json();
    if (!response.ok || !body?.ok) {
      return {
        ok: false,
        error: typeof body?.error === "string" ? body.error : `Save failed with status ${response.status}`,
      };
    }

    return {
      ok: true,
      analysisId: typeof body.analysisId === "string" ? body.analysisId : undefined,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Save request failed.",
    };
  }
}
