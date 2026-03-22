"use client";

import { useState } from "react";

import type { AiCommentary, Severity, ToneMode } from "@/lib/models/domain";
import { derivePerformanceMetrics } from "@/lib/analysis";
import type { SqlAnalysisResult } from "@/lib/analysis";

const severityStyles: Record<Severity, { badge: string; rail: string; label: string }> = {
  low: {
    badge: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
    rail: "from-emerald-500/70",
    label: "Low",
  },
  medium: {
    badge: "border-amber-400/40 bg-amber-500/10 text-amber-200",
    rail: "from-amber-500/70",
    label: "Medium",
  },
  high: {
    badge: "border-rose-400/50 bg-rose-500/10 text-rose-200",
    rail: "from-rose-500/80",
    label: "High",
  },
  critical: {
    badge: "border-rose-300/70 bg-rose-500/20 text-rose-100",
    rail: "from-rose-300/90",
    label: "Critical",
  },
};

interface FindingsPlaceholderProps {
  mode: ToneMode;
  isAnalyzing: boolean;
  analysis: SqlAnalysisResult | null;
  hasQuery: boolean;
  usingCustomInput: boolean;
  aiCommentaryEnabled: boolean;
  aiCommentary: AiCommentary | null;
}

export function FindingsPlaceholder({
  mode,
  isAnalyzing,
  analysis,
  hasQuery,
  usingCustomInput,
  aiCommentaryEnabled,
  aiCommentary,
}: FindingsPlaceholderProps) {
  const findings = analysis?.findings ?? [];

  return (
    <article className="panel flex h-full min-h-[520px] flex-col overflow-hidden">
      <div className="border-b border-slate-700/60 bg-slate-900/70 px-4 py-3 md:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-200">Query Review Findings</h2>
            <p className="mt-1 text-xs text-slate-400">
              {mode === "coaching"
                ? "Coach mode explains trade-offs with implementation hints."
                : "Reviewer mode emphasizes concise, production-minded fixes."}
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-300">
            <span className="rounded-md border border-slate-600/90 bg-slate-950/60 px-2 py-1">Engine: Heuristics</span>
            <span className="rounded-md border border-slate-600/90 bg-slate-950/60 px-2 py-1">
              Source: {usingCustomInput ? "Custom" : "Sample"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4 md:p-5">
        <AiCommentaryPanel
          isAnalyzing={isAnalyzing}
          hasQuery={hasQuery}
          aiCommentaryEnabled={aiCommentaryEnabled}
          aiCommentary={aiCommentary}
          mode={mode}
        />

        <PerformanceVisualizationPanel isAnalyzing={isAnalyzing} hasQuery={hasQuery} analysis={analysis} />

        {isAnalyzing ? (
          <LoadingState />
        ) : !hasQuery ? (
          <EmptyState
            title="Paste a SQL query to start analysis"
            description="Add a SELECT statement on the left panel. Findings, rewrites, and index suggestions will appear here."
          />
        ) : findings.length === 0 ? (
          <EmptyState
            title="No optimization risks detected"
            description="The current query passed this slice's heuristics. You can still inspect diagnostics for parsed rules and warnings."
          />
        ) : (
          <ul className="space-y-3">
            {findings.map((finding) => {
              const severity = severityStyles[finding.severity];

              return (
                <li key={finding.id} className="relative overflow-hidden rounded-xl border border-slate-700/70 bg-slate-950/55 p-4">
                  <div
                    className={`pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${severity.rail} to-transparent`}
                    aria-hidden
                  />

                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-slate-100">{finding.title}</p>
                      <p className="mt-1 text-xs text-slate-400">Rule: {finding.ruleId}</p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${severity.badge}`}>
                      {severity.label}
                    </span>
                  </div>

                  <p className="text-sm leading-relaxed text-slate-300">{finding.description}</p>

                  <div className="mt-3 rounded-lg border border-teal-500/20 bg-teal-500/5 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-teal-200">
                      {mode === "coaching" ? "Action plan" : "Required change"}
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-100">{finding.suggestion.summary}</p>
                    <p className="mt-1 text-sm text-slate-300">{finding.suggestion.rationale}</p>
                  </div>

                  <div className="mt-3 space-y-3">
                    {finding.suggestion.rewrittenSql ? (
                      <CodeSuggestionBlock label="Rewrite snippet" code={finding.suggestion.rewrittenSql} copyLabel="Copy SQL" />
                    ) : null}

                    {finding.suggestion.indexStatement ? (
                      <CodeSuggestionBlock
                        label="Index suggestion"
                        code={finding.suggestion.indexStatement}
                        copyLabel="Copy index SQL"
                      />
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {analysis ? <DiagnosticsSection analysis={analysis} /> : null}
      </div>
    </article>
  );
}

function AiCommentaryPanel({
  isAnalyzing,
  hasQuery,
  aiCommentaryEnabled,
  aiCommentary,
  mode,
}: {
  isAnalyzing: boolean;
  hasQuery: boolean;
  aiCommentaryEnabled: boolean;
  aiCommentary: AiCommentary | null;
  mode: ToneMode;
}) {
  return (
    <section className="rounded-xl border border-teal-500/25 bg-gradient-to-br from-teal-500/10 to-slate-900/35 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-200">AI Commentary</h3>
        <span className="rounded-md border border-slate-600/80 bg-slate-950/60 px-2 py-1 text-[10px] font-semibold text-slate-300">
          {mode === "coaching" ? "Coach Tone" : "Reviewer Tone"}
        </span>
      </div>

      {!aiCommentaryEnabled ? (
        <p className="text-sm text-slate-300">Commentary is off. Enable AI commentary in the header for a structured summary.</p>
      ) : isAnalyzing ? (
        <div className="space-y-2" aria-live="polite" aria-busy>
          <div className="h-3 w-2/3 animate-pulse rounded bg-slate-700/70" />
          <div className="h-3 w-full animate-pulse rounded bg-slate-800/80" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-slate-800/80" />
        </div>
      ) : !hasQuery ? (
        <p className="text-sm text-slate-300">Add a SQL query to generate commentary with priorities and risk callouts.</p>
      ) : !aiCommentary ? (
        <p className="text-sm text-slate-300">No commentary generated yet.</p>
      ) : (
        <div className="space-y-3 text-sm text-slate-200">
          <p className="leading-relaxed text-slate-100">{aiCommentary.overallAssessment}</p>

          <CommentaryList title="Top priorities" items={aiCommentary.topPriorities} />
          <CommentaryList title="Quick wins" items={aiCommentary.quickWins} emptyLabel="No quick wins identified yet." />
          <CommentaryList title="Risk callouts" items={aiCommentary.riskCallouts} emptyLabel="No high-risk findings detected." />
        </div>
      )}
    </section>
  );
}

function CommentaryList({ title, items, emptyLabel = "None" }: { title: string; items: string[]; emptyLabel?: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">{title}</p>
      {items.length ? (
        <ul className="mt-1 space-y-1 text-slate-200">
          {items.map((item, index) => (
            <li key={`${title}-${index}`} className="leading-relaxed text-slate-300">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-slate-400">{emptyLabel}</p>
      )}
    </div>
  );
}

function PerformanceVisualizationPanel({
  isAnalyzing,
  hasQuery,
  analysis,
}: {
  isAnalyzing: boolean;
  hasQuery: boolean;
  analysis: SqlAnalysisResult | null;
}) {
  if (isAnalyzing) {
    return (
      <section className="rounded-xl border border-slate-700/60 bg-slate-900/45 p-4" aria-live="polite" aria-busy>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Performance map</h3>
          <span className="rounded-md border border-slate-600/80 bg-slate-950/60 px-2 py-1 text-[10px] font-semibold text-slate-400">
            Profiling…
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="h-28 animate-pulse rounded-lg border border-slate-700/60 bg-slate-800/55" />
          <div className="h-28 animate-pulse rounded-lg border border-slate-700/60 bg-slate-800/55" />
        </div>
      </section>
    );
  }

  if (!hasQuery || !analysis) {
    return (
      <section className="rounded-xl border border-dashed border-slate-600/90 bg-slate-900/35 p-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Performance map</p>
        <p className="mt-2 text-sm text-slate-400">Run an analysis to see join relationships, scan risk, and complexity indicators.</p>
      </section>
    );
  }

  const metrics = derivePerformanceMetrics(analysis);
  const severitySegments = [
    { key: "critical", color: "bg-rose-400", value: metrics.severityDistribution.critical },
    { key: "high", color: "bg-rose-500/90", value: metrics.severityDistribution.high },
    { key: "medium", color: "bg-amber-400/90", value: metrics.severityDistribution.medium },
    { key: "low", color: "bg-emerald-400/90", value: metrics.severityDistribution.low },
  ] as const;
  const totalFindings = analysis.findings.length;

  return (
    <section className="rounded-xl border border-slate-700/60 bg-gradient-to-br from-slate-900/65 to-slate-950/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-200">Performance map</h3>
        <span className="rounded-md border border-slate-600/80 bg-slate-950/70 px-2 py-1 text-[10px] font-semibold text-slate-300">
          Deterministic heuristics
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-700/70 bg-slate-900/55 p-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Join relationships</p>
          <p className="mt-2 flex items-center gap-2 text-xl font-semibold text-slate-100">
            <span aria-hidden>🧩</span>
            {metrics.joinCount}
            <span className="text-sm font-medium text-slate-400">joins across {metrics.tableCount || 1} table(s)</span>
          </p>
          <div className="mt-3 flex items-center gap-1.5">
            {Array.from({ length: Math.max(1, Math.min(6, metrics.tableCount || 1)) }).map((_, index) => (
              <div key={`node-${index}`} className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-teal-400/80" />
                {index < Math.max(0, Math.min(6, metrics.tableCount || 1) - 1) ? (
                  <span className="h-px w-4 bg-slate-500/80" />
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-700/70 bg-slate-900/55 p-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Query complexity</p>
          <p className="mt-2 flex items-center gap-2 text-xl font-semibold text-slate-100">
            <span aria-hidden>⚙️</span>
            {metrics.complexityScore}
            <span className="text-sm font-medium text-slate-400">{metrics.complexityLabel}</span>
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-700/70">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-500 via-amber-400 to-rose-500"
              style={{ width: `${metrics.complexityScore}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-slate-700/70 bg-slate-900/55 p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Scan risk distribution</p>
          <p className="text-xs font-semibold text-slate-300">
            🔎 {metrics.scanRiskLevel.toUpperCase()} RISK • score {metrics.scanRiskScore}
          </p>
        </div>

        {totalFindings > 0 ? (
          <>
            <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-700/80">
              {severitySegments.map((segment) => {
                const width = (segment.value / totalFindings) * 100;
                if (width <= 0) {
                  return null;
                }

                return <div key={segment.key} className={segment.color} style={{ width: `${width}%` }} aria-hidden />;
              })}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-300 sm:grid-cols-4">
              {severitySegments.map((segment) => (
                <p key={`legend-${segment.key}`}>
                  <span className="font-semibold capitalize text-slate-200">{segment.key}:</span> {segment.value}
                </p>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-400">No findings detected, scan risk is currently minimal.</p>
        )}
      </div>
    </section>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3" aria-live="polite" aria-busy>
      {[0, 1].map((index) => (
        <div key={index} className="animate-pulse rounded-xl border border-slate-700/70 bg-slate-950/55 p-4">
          <div className="h-4 w-1/2 rounded bg-slate-700/70" />
          <div className="mt-2 h-3 w-2/3 rounded bg-slate-800/80" />
          <div className="mt-4 space-y-2">
            <div className="h-3 w-full rounded bg-slate-800/80" />
            <div className="h-3 w-5/6 rounded bg-slate-800/80" />
          </div>
          <div className="mt-4 h-20 rounded-lg border border-slate-700/80 bg-slate-900/90" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-600/90 bg-slate-900/40 px-5 py-10 text-center">
      <p className="text-base font-semibold text-slate-100">{title}</p>
      <p className="mx-auto mt-2 max-w-lg text-sm text-slate-400">{description}</p>
    </div>
  );
}

function DiagnosticsSection({ analysis }: { analysis: SqlAnalysisResult }) {
  return (
    <details className="rounded-lg border border-slate-700/60 bg-slate-900/45 p-3 text-xs text-slate-300">
      <summary className="cursor-pointer font-semibold text-slate-200">Advanced diagnostics</summary>
      <div className="mt-3 space-y-3">
        <div>
          <p className="font-semibold text-slate-100">Applied rules ({analysis.diagnostics.appliedRules.length})</p>
          <p className="mt-1 text-slate-400">{analysis.diagnostics.appliedRules.join(", ") || "None"}</p>
        </div>
        <div>
          <p className="font-semibold text-slate-100">Parse warnings ({analysis.diagnostics.parseWarnings.length})</p>
          <p className="mt-1 text-slate-400">{analysis.diagnostics.parseWarnings.join(" • ") || "None"}</p>
        </div>
      </div>
    </details>
  );
}

function CodeSuggestionBlock({ label, code, copyLabel }: { label: string; code: string; copyLabel: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-lg border border-slate-700/80 bg-slate-900/85">
      <div className="flex items-center justify-between border-b border-slate-700/80 px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">{label}</p>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-md border border-slate-600 px-2 py-1 text-[11px] font-medium text-slate-200 transition hover:border-teal-400 hover:text-teal-200"
        >
          {copied ? "Copied" : copyLabel}
        </button>
      </div>
      <pre className="overflow-x-auto px-3 py-3 font-mono text-xs leading-relaxed text-slate-200">{code}</pre>
    </section>
  );
}
