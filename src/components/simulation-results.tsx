"use client";

import {
  BarChart3,
  ChevronRight,
  Filter,
  Loader2,
  MousePointerClick,
  Search,
  ShoppingCart,
  Target,
  TriangleAlert,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import {
  campaignLabels,
  type AnalysisResult,
  type CampaignInput,
  type SimulatedAgent,
} from "@/lib/types";

const metricLabels = {
  impressions: "Impressions",
  reach: "Reach",
  clicks: "Clicks",
  conversions: "Conversions",
  revenue: "Revenue",
  ctr: "CTR",
  conversionRate: "CVR",
  cpc: "CPC",
  cpa: "CPA",
  roas: "ROAS",
};

const loadingAgents = [
  ["Maya Patel", "High-Intent Evaluators"],
  ["Jordan Lee", "Budget-Conscious Buyers"],
  ["Priya Nair", "Problem-Aware Researchers"],
  ["Ethan Brooks", "Passive Awareness Audience"],
  ["Nina Kapoor", "High-Intent Evaluators"],
  ["Rohan Mehta", "Problem-Aware Researchers"],
];

export type ReportTab = "report" | "agents";
export type AgentFilter = "all" | "clicked" | "purchased" | "lead" | "retarget";

export function SimulationLoader({ input }: { input: CampaignInput }) {
  return (
    <div className="simulation-loader">
      <div className="loader-head">
        <Loader2 size={26} className="spin" />
        <div>
          <span>Running Simulation</span>
          <strong>{input.agentCount} targeted user agents</strong>
        </div>
      </div>
      <div className="setup-strip">
        <div>
          <span>Models</span>
          <strong>{input.modelPreferences.length}</strong>
        </div>
      </div>
      <div className="simulating-stack">
        {loadingAgents.map(([name, group], index) => (
          <div className="simulating-agent" key={`${name}-${group}`} style={{ animationDelay: `${index * 0.12}s` }}>
            <i />
            <div>
              <strong>{name}</strong>
              <span>{group}</span>
            </div>
            <ChevronRight size={16} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReportTabView({ result }: { result: AnalysisResult }) {
  const report = result.simulationReport;
  const maxGroupTotal = Math.max(1, ...report.personaGroups.map((group) => group.total));
  const maxFunnel = Math.max(report.totalUniqueUsers, report.clicks, report.leads, report.purchases, 1);
  const funnelRows = [
    { label: "Users", value: report.totalUniqueUsers, icon: Users },
    { label: "Clicks", value: report.clicks, icon: MousePointerClick },
    { label: "Leads", value: report.leads, icon: Target },
    { label: "Purchases", value: report.purchases, icon: ShoppingCart },
  ];

  return (
    <div className="report-shell">
      <div className="simulation-kpis">
        <MetricTile label="Clicks" value={`${report.clicks} (${formatPercent(report.clicks, report.totalUniqueUsers)})`} icon={MousePointerClick} />
        <MetricTile label="Purchases" value={`${report.purchases} (${formatPercent(report.purchases, report.totalUniqueUsers)})`} icon={ShoppingCart} />
      </div>

      <div className="summary-band report-band">
        <div>
          <span>Readiness</span>
          <strong>{readinessLabel(result.recommendation.readiness)}</strong>
        </div>
        <div>
          <span>Confidence</span>
          <strong>{result.recommendation.confidence}%</strong>
        </div>
        <div>
          <span>Mode</span>
          <strong>{result.modelInfo.mode}</strong>
        </div>
        <div>
          <span>Primary Model</span>
          <strong className="model-value" title={result.modelInfo.model}>{compactModelName(result.modelInfo.model)}</strong>
        </div>
      </div>

      <p className="recommendation">{result.recommendation.summary}</p>

      <div className="model-strip">
        {report.activeModels.map((model, index) => (
          <span key={`${model}-${index}`}>Model {index + 1}: {compactModelName(model)}</span>
        ))}
      </div>

      <div className="graph-grid">
        <section className="analysis-section">
          <div className="section-title">
            <Users size={18} />
            <h3>Persona Groups</h3>
          </div>
          <div className="persona-bars">
            {report.personaGroups.map((group) => (
              <div className="persona-bar" key={group.name}>
                <div>
                  <strong>{group.name}</strong>
                  <span>{group.total} users | {group.clicks} clicks | {group.purchases} purchases</span>
                </div>
                <i style={{ width: `${Math.max(10, (group.total / maxGroupTotal) * 100)}%` }} />
                <small>{group.summary}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="analysis-section">
          <div className="section-title">
            <Workflow size={18} />
            <h3>Behavior Funnel</h3>
          </div>
          <div className="funnel-list">
            {funnelRows.map((row) => {
              const Icon = row.icon;
              return (
                <div className="funnel-row" key={row.label}>
                  <div>
                    <Icon size={16} />
                    <strong>{row.label}</strong>
                    <span>{row.value}</span>
                  </div>
                  <i style={{ width: `${Math.max(8, (row.value / maxFunnel) * 100)}%` }} />
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="workspace-grid">
        <section className="analysis-section">
          <div className="section-title">
            <BarChart3 size={18} />
            <h3>Projected Media Metrics</h3>
          </div>
          <div className="compact-metrics">
            {Object.entries(result.forecast.metrics).map(([key, band]) => (
              <article key={key} className="mini-metric">
                <span>{metricLabels[key as keyof typeof metricLabels]}</span>
                <strong>{formatMetric(key, band.base)}</strong>
              </article>
            ))}
          </div>
        </section>

        <section className="analysis-section">
          <div className="section-title">
            <TriangleAlert size={18} />
            <h3>Simulation Timeline</h3>
          </div>
          <ul className="test-list">
            {report.timeline.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="agent-stack">
        {result.agentOutputs.map((agent) => (
          <article className={`agent-card ${agent.status}`} key={agent.agent}>
            <div>
              <span>{agent.status}</span>
              <h3>{agent.agent}</h3>
            </div>
            <p>{agent.summary}</p>
          </article>
        ))}
      </section>
    </div>
  );
}

export function AgentsTabView({
  agents,
  selectedAgent,
  filter,
  search,
  onFilter,
  onSearch,
  onOpen,
}: {
  agents: SimulatedAgent[];
  selectedAgent?: SimulatedAgent;
  filter: AgentFilter;
  search: string;
  onFilter: (filter: AgentFilter) => void;
  onSearch: (value: string) => void;
  onOpen: (id: string) => void;
}) {
  const filters: Array<{ value: AgentFilter; label: string }> = [
    { value: "all", label: "All" },
    { value: "clicked", label: "Clicked" },
    { value: "purchased", label: "Purchased" },
    { value: "lead", label: "Lead" },
    { value: "retarget", label: "Retarget" },
  ];

  return (
    <div className="agents-shell">
      <div className="agents-toolbar">
        <div className="filter-row">
          <Filter size={16} />
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              className={filter === item.value ? "filter-button active" : "filter-button"}
              onClick={() => onFilter(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <label className="search-field">
          <Search size={16} />
          <input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Campaign, persona, model, channel" />
        </label>
      </div>

      <div className="agent-workspace">
        <div className="agent-list" aria-label="Virtual agents">
          {agents.map((agent) => (
            <button
              type="button"
              className={selectedAgent?.id === agent.id ? "virtual-agent-button active" : "virtual-agent-button"}
              key={agent.id}
              onClick={() => onOpen(agent.id)}
            >
              <span className={`outcome-dot ${agent.outcome}`} />
              <div>
                <strong>{agent.name}</strong>
                <small>{agent.personaGroup}</small>
              </div>
              <em>{outcomeLabel(agent.outcome)}</em>
            </button>
          ))}
          {!agents.length ? <p className="empty-list">No agents match the current filter.</p> : null}
        </div>

        <article className="agent-detail">
          {selectedAgent ? (
            <>
              <div className="agent-detail-head">
                <div>
                  <span>{selectedAgent.id}</span>
                  <h3>{selectedAgent.name}</h3>
                </div>
                <strong>{outcomeLabel(selectedAgent.outcome)}</strong>
              </div>
              <div className="detail-grid">
                <div>
                  <span>Persona Group</span>
                  <strong>{selectedAgent.personaGroup}</strong>
                </div>
                <div>
                  <span>Model</span>
                  <strong>{compactModelName(selectedAgent.model)}</strong>
                </div>
                <div>
                  <span>Channel</span>
                  <strong>{campaignLabels[selectedAgent.channel]}</strong>
                </div>
                <div>
                  <span>Intent</span>
                  <strong>{selectedAgent.intentScore}/100</strong>
                </div>
              </div>
              <div className="campaign-about">
                <span>Campaign About</span>
                <p>{selectedAgent.campaignAbout}</p>
              </div>
              <div className="event-row">
                {selectedAgent.events.map((event) => (
                  <span className="event-chip" key={event}>{event}</span>
                ))}
              </div>
              <p className="agent-behavior">{selectedAgent.behavior}</p>
            </>
          ) : (
            <p className="empty-list">No agent selected.</p>
          )}
        </article>
      </div>
    </div>
  );
}

export function MetricTile({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <article className="metric-tile">
      <Icon size={18} />
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function readinessLabel(readiness: AnalysisResult["recommendation"]["readiness"]) {
  if (readiness === "ready") return "Ready";
  if (readiness === "needs_revision") return "Needs Revision";
  return "High Risk";
}

function formatMetric(key: string, value: number) {
  if (key === "revenue" || key === "cpc" || key === "cpa") return formatMoney(value);
  if (key === "ctr" || key === "conversionRate") return `${(value * 100).toFixed(2)}%`;
  if (key === "roas") return `${value.toFixed(2)}x`;
  return Math.round(value).toLocaleString("en-US");
}

function formatMoney(value: number) {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function formatPercent(value: number, total: number) {
  if (!total) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

export function compactModelName(modelId: string) {
  if (modelId === "openrouter/free") return "Auto Free";
  const slug = modelId.split("/").pop() || modelId;
  return slug.replace(/:free$/i, "");
}

function outcomeLabel(outcome: SimulatedAgent["outcome"]) {
  if (outcome === "purchased") return "Purchased";
  if (outcome === "clicked") return "Clicked";
  if (outcome === "lead") return "Lead";
  if (outcome === "bounced") return "Bounced";
  return "Retarget";
}
