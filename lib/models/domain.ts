export type ToneMode = "coaching" | "reviewer";

export type Severity = "low" | "medium" | "high" | "critical";

export interface QueryInput {
  id: string;
  title: string;
  sql: string;
  dialect: "postgres";
}

export interface SchemaInput {
  id: string;
  name: string;
  ddl: string;
}

export interface RewriteSuggestion {
  id: string;
  summary: string;
  rewrittenSql?: string;
  indexStatement?: string;
  rationale: string;
}

export interface Finding {
  id: string;
  ruleId: string;
  title: string;
  description: string;
  severity: Severity;
  suggestion: RewriteSuggestion;
}

export interface SampleScenario {
  id: string;
  label: string;
  query: QueryInput;
  schema: SchemaInput;
  findings: Finding[];
}
