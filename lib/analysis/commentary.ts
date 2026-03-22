import type { SqlAnalysisResult } from "@/lib/analysis/sql-coach";
import type { AiCommentary, Finding, Severity, ToneMode } from "@/lib/models/domain";

interface GenerateAiCommentaryInput {
  analysis: SqlAnalysisResult | null;
  mode: ToneMode;
  enabled: boolean;
}

const severityRank: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const severityLabel: Record<Severity, string> = {
  critical: "critical",
  high: "high",
  medium: "moderate",
  low: "low",
};

export function generateAiCommentary({ analysis, mode, enabled }: GenerateAiCommentaryInput): AiCommentary | null {
  if (!enabled || !analysis) {
    return null;
  }

  const ordered = [...analysis.findings].sort((a, b) => severityRank[b.severity] - severityRank[a.severity]);
  const topPriorities = ordered.slice(0, 3);
  const quickWins = ordered.filter((finding) => finding.severity === "low" || finding.severity === "medium").slice(0, 2);
  const riskCallouts = ordered.filter((finding) => finding.severity === "high" || finding.severity === "critical").slice(0, 3);

  return {
    overallAssessment: buildOverallAssessment(analysis.findings, mode),
    topPriorities: topPriorities.map((finding) => toPriorityLine(finding, mode)),
    quickWins: quickWins.map((finding) => toQuickWinLine(finding, mode)),
    riskCallouts: riskCallouts.map((finding) => toRiskCallout(finding, mode)),
  };
}

function buildOverallAssessment(findings: Finding[], mode: ToneMode): string {
  if (findings.length === 0) {
    return mode === "coaching"
      ? "Nice work—this query currently looks healthy under the active heuristics."
      : "No material issues detected by the current heuristic rule set.";
  }

  const highest = findings.reduce((current, next) =>
    severityRank[next.severity] > severityRank[current.severity] ? next : current,
  );

  if (mode === "coaching") {
    return `The biggest trade-off right now is ${severityLabel[highest.severity]} risk around ${highest.title.toLowerCase()}. Tightening the first fixes should noticeably improve reliability.`;
  }

  return `Assessment: ${severityLabel[highest.severity]} performance risk present. Address the top items before production rollout.`;
}

function toPriorityLine(finding: Finding, mode: ToneMode): string {
  if (mode === "coaching") {
    return `${finding.suggestion.summary} (${severityLabel[finding.severity]} impact)`;
  }

  return `${finding.title} — ${finding.suggestion.summary}`;
}

function toQuickWinLine(finding: Finding, mode: ToneMode): string {
  if (mode === "coaching") {
    return `${finding.suggestion.summary} This is a practical change with a favorable effort-to-gain ratio.`;
  }

  return `${finding.suggestion.summary} (quick to implement)`;
}

function toRiskCallout(finding: Finding, mode: ToneMode): string {
  if (mode === "coaching") {
    return `${finding.title}: ${finding.description} Prioritize this early to reduce downstream tuning time.`;
  }

  return `${finding.title}: ${finding.description}`;
}
