export {
  analyzeSqlCoaching,
  parseSchemaDdl,
  parseSqlQuery,
} from "@/lib/analysis/sql-coach";

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
