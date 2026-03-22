export {
  analyzeSqlCoaching,
  parseSchemaDdl,
  parseSqlQuery,
} from "@/lib/analysis/sql-coach";

export { generateAiCommentary } from "@/lib/analysis/commentary";
export { derivePerformanceMetrics } from "@/lib/analysis/perf-metrics";

export type {
  AnalyzeSqlInput,
  AnalysisDiagnostics,
  ParsedIndex,
  ParsedPredicateFunction,
  ParsedSchema,
  ParsedSqlQuery,
  ParsedTableRef,
  SqlAnalysisResult,
} from "@/lib/analysis/sql-coach";
