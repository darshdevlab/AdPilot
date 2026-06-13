"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { ArrowLeft, BarChart3, Layers3, Loader2, RotateCcw, Users } from "lucide-react";
import {
  AgentsTabView,
  ReportTabView,
  SimulationLoader,
  type AgentFilter,
  type ReportTab,
} from "@/components/simulation-results";
import {
  LATEST_ANALYSIS_RESULT_KEY,
  PENDING_CAMPAIGN_INPUT_KEY,
} from "@/lib/client-storage";
import {
  campaignLabels,
  type AnalysisResult,
  type CampaignInput,
} from "@/lib/types";

type ResultState = "loading" | "running" | "done" | "error" | "empty";

export default function ResultsPage() {
  const router = useRouter();
  const startedRef = useRef(false);
  const [input, setInput] = useState<CampaignInput | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [state, setState] = useState<ResultState>("loading");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<ReportTab>("report");
  const [agentFilter, setAgentFilter] = useState<AgentFilter>("all");
  const [agentSearch, setAgentSearch] = useState("");
  const [openAgentId, setOpenAgentId] = useState("");

  const filteredAgents = useMemo(() => {
    const agents = result?.simulationReport.agents || [];
    const search = agentSearch.trim().toLowerCase();
    return agents.filter((agent) => {
      const filterMatch =
        agentFilter === "all" ||
        (agentFilter === "clicked" && agent.clicked) ||
        (agentFilter === "purchased" && agent.purchased) ||
        (agentFilter === "lead" && agent.outcome === "lead") ||
        (agentFilter === "retarget" && agent.outcome === "retarget");
      const searchMatch = !search || [
        agent.name,
        agent.personaGroup,
        agent.campaignAbout,
        campaignLabels[agent.channel],
        agent.model,
        agent.outcome,
      ].some((value) => value.toLowerCase().includes(search));
      return filterMatch && searchMatch;
    });
  }, [agentFilter, agentSearch, result]);

  const selectedAgent = filteredAgents.find((agent) => agent.id === openAgentId) || filteredAgents[0];

  const runSimulation = useCallback(async (campaignInput: CampaignInput) => {
    setState("running");
    setError("");
    setResult(null);
    setActiveTab("report");
    setOpenAgentId("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(campaignInput),
      });
      const text = await response.text();
      const body = parseApiJson(text);
      if (!response.ok || !body?.ok) {
        throw new Error(body?.error || readableApiError(text, response.status));
      }

      const nextResult = body.result as AnalysisResult;
      setResult(nextResult);
      setState("done");
      sessionStorage.setItem(LATEST_ANALYSIS_RESULT_KEY, JSON.stringify(nextResult));
      sessionStorage.removeItem(PENDING_CAMPAIGN_INPUT_KEY);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Campaign simulation failed.");
      setState("error");
    }
  }, []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const pendingInput = readSessionJson<CampaignInput>(PENDING_CAMPAIGN_INPUT_KEY);
    const cachedResult = readSessionJson<AnalysisResult>(LATEST_ANALYSIS_RESULT_KEY);

    queueMicrotask(() => {
      if (pendingInput) {
        setInput(pendingInput);
        void runSimulation(pendingInput);
        return;
      }

      if (cachedResult) {
        setInput(cachedResult.campaignInput);
        setResult(cachedResult);
        setState("done");
        return;
      }

      setState("empty");
    });
  }, [runSimulation]);

  function goBackToSetup() {
    router.push("/" as Route);
  }

  function startNewDraft() {
    sessionStorage.removeItem(PENDING_CAMPAIGN_INPUT_KEY);
    sessionStorage.removeItem(LATEST_ANALYSIS_RESULT_KEY);
    router.push("/" as Route);
  }

  return (
    <main className="results-page">
      <section className="result-panel results-full" aria-label="Campaign simulation results">
        <div className="result-head results-head">
          <div>
            <p className="eyebrow">Step 2</p>
            <h2>{result?.campaignInput.campaignName || input?.campaignName || "Simulation Results"}</h2>
          </div>
          <div className="results-actions">
            <button type="button" className="secondary-action" onClick={goBackToSetup}>
              <ArrowLeft size={16} />
              <span>Setup</span>
            </button>
          </div>
        </div>

        {state === "loading" ? (
          <div className="empty-state">
            <Loader2 size={42} className="spin" />
            <p>Loading simulation workspace.</p>
          </div>
        ) : state === "running" && input ? (
          <SimulationLoader input={input} />
        ) : state === "done" && result ? (
          <>
            <div className="tab-row">
              <button
                type="button"
                className={activeTab === "report" ? "tab-button active" : "tab-button"}
                onClick={() => setActiveTab("report")}
              >
                <BarChart3 size={17} />
                <span>Report</span>
              </button>
              <button
                type="button"
                className={activeTab === "agents" ? "tab-button active" : "tab-button"}
                onClick={() => setActiveTab("agents")}
              >
                <Users size={17} />
                <span>Agents</span>
              </button>
            </div>

            {activeTab === "report" ? (
              <ReportTabView result={result} />
            ) : (
              <AgentsTabView
                agents={filteredAgents}
                selectedAgent={selectedAgent}
                filter={agentFilter}
                search={agentSearch}
                onFilter={setAgentFilter}
                onSearch={setAgentSearch}
                onOpen={setOpenAgentId}
              />
            )}
          </>
        ) : state === "error" ? (
          <div className="empty-state">
            <Layers3 size={44} />
            <p>{error}</p>
            <div className="action-row">
              {input ? (
                <button type="button" className="primary-button" onClick={() => void runSimulation(input)}>
                  <RotateCcw size={17} />
                  <span>Retry Simulation</span>
                </button>
              ) : null}
              <button type="button" className="secondary-action" onClick={goBackToSetup}>
                <ArrowLeft size={16} />
                <span>Setup</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <Layers3 size={44} />
            <p>No simulation result loaded.</p>
            <button type="button" className="primary-button" onClick={startNewDraft}>
              <ArrowLeft size={16} />
              <span>Start From Setup</span>
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

function readSessionJson<T>(key: string): T | null {
  try {
    const value = sessionStorage.getItem(key);
    return value ? JSON.parse(value) as T : null;
  } catch {
    return null;
  }
}

function parseApiJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function readableApiError(text: string, status: number) {
  if (status === 504 || /timeout/i.test(text)) return "Simulation timed out. Reduce agents or retry.";
  const compact = text.replace(/\s+/g, " ").trim().slice(0, 140);
  return compact || "Campaign simulation failed.";
}
