import type { Severity } from "@/lib/models/domain";
import type { SqlAnalysisResult } from "@/lib/analysis/sql-coach";

export interface PerformanceMetrics {
  joinCount: number;
  tableCount: number;
  severityDistribution: Record<Severity, number>;
  complexityScore: number;
  complexityLabel: "Low" | "Moderate" | "High";
  scanRiskLevel: "low" | "medium" | "high";
  scanRiskScore: number;
}

export function derivePerformanceMetrics(analysis: SqlAnalysisResult): PerformanceMetrics {
  const severityDistribution: Record<Severity, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  for (const finding of analysis.findings) {
    severityDistribution[finding.severity] += 1;
  }

  const joinCount = analysis.parsedQuery.tableRefs.filter((tableRef) => tableRef.joinType === "join").length;
  const tableCount = analysis.parsedQuery.tableRefs.length;

  const hasFunctionPredicateRisk = analysis.findings.some((finding) => finding.ruleId === "predicate.function_on_column");
  const hasLeadingWildcardRisk = analysis.findings.some((finding) => finding.ruleId === "predicate.leading_wildcard_like");

  const scanRiskScore =
    severityDistribution.critical * 4 +
    severityDistribution.high * 3 +
    severityDistribution.medium * 2 +
    severityDistribution.low +
    (hasFunctionPredicateRisk ? 1 : 0) +
    (hasLeadingWildcardRisk ? 1 : 0);

  const complexityRaw =
    joinCount * 1.4 +
    (analysis.parsedQuery.hasSubquery ? 1.5 : 0) +
    (analysis.parsedQuery.hasCorrelatedSubquery ? 2.4 : 0) +
    analysis.parsedQuery.countDistinctExpressions.length * 1.3 +
    analysis.parsedQuery.predicateFunctions.length * 0.7 +
    (analysis.parsedQuery.orderByClause ? 0.5 : 0);

  const complexityScore = clamp(Math.round(complexityRaw * 10), 0, 100);

  return {
    joinCount,
    tableCount,
    severityDistribution,
    complexityScore,
    complexityLabel: complexityScore >= 65 ? "High" : complexityScore >= 35 ? "Moderate" : "Low",
    scanRiskLevel: scanRiskScore >= 8 ? "high" : scanRiskScore >= 4 ? "medium" : "low",
    scanRiskScore,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
