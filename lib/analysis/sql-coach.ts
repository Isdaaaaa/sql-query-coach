import type { Finding, RewriteSuggestion, Severity, SqlDialect } from "@/lib/models/domain";

export interface AnalyzeSqlInput {
  sql: string;
  schemaDdl?: string;
  dialect?: SqlDialect;
}

export interface ParsedTableRef {
  tableName: string;
  alias?: string;
  joinType: "from" | "join";
}

export interface ParsedPredicateFunction {
  functionName: string;
  referencedColumns: string[];
  rawExpression: string;
}

export interface ParsedSqlQuery {
  statementType: "select" | "unknown";
  selectExpressions: string[];
  hasSelectStar: boolean;
  tableRefs: ParsedTableRef[];
  whereClause?: string;
  orderByClause?: string;
  hasLimit: boolean;
  limitValue?: number;
  hasSubquery: boolean;
  hasCorrelatedSubquery: boolean;
  countDistinctExpressions: string[];
  predicateFunctions: ParsedPredicateFunction[];
  likePatterns: string[];
}

export interface ParsedIndex {
  name: string;
  tableName: string;
  columns: string[];
}

export interface ParsedSchema {
  tableColumns: Record<string, string[]>;
  indexes: ParsedIndex[];
}

export interface AnalysisDiagnostics {
  parseWarnings: string[];
  appliedRules: string[];
}

export interface SqlAnalysisResult {
  dialect: SqlDialect;
  parsedQuery: ParsedSqlQuery;
  parsedSchema?: ParsedSchema;
  findings: Finding[];
  diagnostics: AnalysisDiagnostics;
}

const KNOWN_FUNCTIONS = new Set([
  "DATE",
  "DATE_TRUNC",
  "LOWER",
  "UPPER",
  "COALESCE",
  "CAST",
  "EXTRACT",
  "TO_CHAR",
  "SUBSTRING",
]);

const SQL_KEYWORDS = new Set([
  "SELECT",
  "FROM",
  "WHERE",
  "JOIN",
  "LEFT",
  "RIGHT",
  "FULL",
  "INNER",
  "OUTER",
  "ON",
  "AS",
  "AND",
  "OR",
  "NOT",
  "NULL",
  "TRUE",
  "FALSE",
  "ORDER",
  "BY",
  "GROUP",
  "HAVING",
  "LIMIT",
  "OFFSET",
  "COUNT",
  "DISTINCT",
  "MAX",
  "MIN",
  "SUM",
  "AVG",
  "CASE",
  "WHEN",
  "THEN",
  "ELSE",
  "END",
  "NOW",
  "INTERVAL",
  "IN",
]);

export function analyzeSqlCoaching(input: AnalyzeSqlInput): SqlAnalysisResult {
  const dialect: SqlDialect = input.dialect ?? "postgres";
  const parseWarnings: string[] = [];

  const parsedQuery = parseSqlQuery(input.sql, parseWarnings);
  const parsedSchema = input.schemaDdl?.trim() ? parseSchemaDdl(input.schemaDdl, parseWarnings) : undefined;

  const findings: Finding[] = [];
  const appliedRules = new Set<string>();

  pushSelectStarFinding(parsedQuery, findings, appliedRules);
  pushPredicateFunctionFindings(parsedQuery, parsedSchema, findings, appliedRules);
  pushCorrelatedSubqueryFinding(parsedQuery, findings, appliedRules);
  pushDistinctAggregationFinding(parsedQuery, findings, appliedRules);
  pushOrderedWithoutLimitFinding(parsedQuery, findings, appliedRules);
  pushLeadingWildcardFinding(parsedQuery, findings, appliedRules);

  return {
    dialect,
    parsedQuery,
    parsedSchema,
    findings,
    diagnostics: {
      parseWarnings,
      appliedRules: [...appliedRules],
    },
  };
}

export function parseSqlQuery(sql: string, parseWarnings: string[] = []): ParsedSqlQuery {
  const normalized = normalizeSql(sql);
  const upper = normalized.toUpperCase();

  const statementType: ParsedSqlQuery["statementType"] = upper.startsWith("SELECT ") ? "select" : "unknown";
  if (statementType === "unknown") {
    parseWarnings.push("Only SELECT statements are analyzed in this slice.");
  }

  const selectClause = extractTopLevelClause(normalized, "SELECT", ["FROM"]);
  const fromClause = extractTopLevelClause(normalized, "FROM", ["WHERE", "GROUP BY", "ORDER BY", "LIMIT", "OFFSET"]);
  const whereClause = extractTopLevelClause(normalized, "WHERE", ["GROUP BY", "ORDER BY", "LIMIT", "OFFSET"]);
  const orderByClause = extractTopLevelClause(normalized, "ORDER BY", ["LIMIT", "OFFSET"]);
  const limitClause = extractTopLevelClause(normalized, "LIMIT", ["OFFSET"]);

  const selectExpressions = splitTopLevel(selectClause ?? "", ",").map((part) => part.trim()).filter(Boolean);
  const hasSelectStar = selectExpressions.some((expr) => /(^|\s|,)\*($|\s|,)/.test(expr) || /\b\w+\.\*/.test(expr));

  const tableRefs = extractTableRefs(fromClause ?? "");
  const aliases = tableRefs.map((t) => t.alias).filter((alias): alias is string => Boolean(alias));

  const hasSubquery = /\(\s*select\b/i.test(normalized);
  const hasCorrelatedSubquery = detectCorrelatedSubquery(normalized, aliases);

  const countDistinctExpressions = extractCountDistinctExpressions(normalized);
  const predicateFunctions = whereClause ? extractPredicateFunctions(whereClause) : [];
  const likePatterns = whereClause ? extractLikePatterns(whereClause) : [];

  const limitValue = limitClause ? Number.parseInt(limitClause.trim().split(/\s+/)[0] ?? "", 10) : Number.NaN;

  return {
    statementType,
    selectExpressions,
    hasSelectStar,
    tableRefs,
    whereClause: whereClause?.trim() || undefined,
    orderByClause: orderByClause?.trim() || undefined,
    hasLimit: Number.isFinite(limitValue),
    limitValue: Number.isFinite(limitValue) ? limitValue : undefined,
    hasSubquery,
    hasCorrelatedSubquery,
    countDistinctExpressions,
    predicateFunctions,
    likePatterns,
  };
}

export function parseSchemaDdl(ddl: string, parseWarnings: string[] = []): ParsedSchema {
  const tableColumns: Record<string, string[]> = {};
  const indexes: ParsedIndex[] = [];

  const tableRegex = /CREATE\s+TABLE\s+([\w."\-]+)\s*\(([^;]+?)\);/gim;
  for (const match of ddl.matchAll(tableRegex)) {
    const tableName = normalizeIdentifier(match[1] ?? "");
    const body = match[2] ?? "";
    const rawRows = splitTopLevel(body, ",").map((line) => line.trim());
    const columns: string[] = [];

    for (const row of rawRows) {
      if (!row) {
        continue;
      }

      const rowUpper = row.toUpperCase();
      if (
        rowUpper.startsWith("PRIMARY KEY") ||
        rowUpper.startsWith("FOREIGN KEY") ||
        rowUpper.startsWith("CONSTRAINT") ||
        rowUpper.startsWith("UNIQUE") ||
        rowUpper.startsWith("CHECK")
      ) {
        continue;
      }

      const colName = normalizeIdentifier(row.split(/\s+/)[0] ?? "");
      if (colName) {
        columns.push(colName);
      }
    }

    if (tableName) {
      tableColumns[tableName] = columns;
    }
  }

  const indexRegex = /CREATE\s+(?:UNIQUE\s+)?INDEX\s+([\w."\-]+)\s+ON\s+([\w."\-]+)\s*\(([^\)]+)\)/gim;
  for (const match of ddl.matchAll(indexRegex)) {
    const indexName = normalizeIdentifier(match[1] ?? "");
    const tableName = normalizeIdentifier(match[2] ?? "");
    const rawColumns = splitTopLevel(match[3] ?? "", ",");
    const columns = rawColumns
      .map((col) => normalizeIdentifier(col.replace(/\bASC\b|\bDESC\b/gi, "").trim().split(/\s+/)[0] ?? ""))
      .filter(Boolean);

    if (indexName && tableName && columns.length > 0) {
      indexes.push({
        name: indexName,
        tableName,
        columns,
      });
    }
  }

  if (Object.keys(tableColumns).length === 0) {
    parseWarnings.push("No CREATE TABLE statements were parsed from the schema input.");
  }

  return {
    tableColumns,
    indexes,
  };
}

function pushSelectStarFinding(parsed: ParsedSqlQuery, findings: Finding[], appliedRules: Set<string>) {
  if (!parsed.hasSelectStar) {
    return;
  }

  appliedRules.add("projection.select_star");
  findings.push(
    buildFinding("projection.select_star", findings.length, {
      title: "Avoid SELECT * in production-facing queries",
      description: "Selecting all columns increases payload size and can block index-only execution plans.",
      severity: "medium",
      suggestion: {
        summary: "Project only the columns needed by the consumer.",
        rationale: "A narrower projection reduces I/O and makes query intent clearer during review.",
      },
    }),
  );
}

function pushPredicateFunctionFindings(
  parsed: ParsedSqlQuery,
  schema: ParsedSchema | undefined,
  findings: Finding[],
  appliedRules: Set<string>,
) {
  for (const fn of parsed.predicateFunctions) {
    const isKnownFunction = KNOWN_FUNCTIONS.has(fn.functionName.toUpperCase());
    if (!isKnownFunction || fn.referencedColumns.length === 0) {
      continue;
    }

    const indexedColumns = fn.referencedColumns.filter((column) => isColumnIndexed(column, parsed.tableRefs, schema));
    const severity: Severity = indexedColumns.length > 0 ? "high" : "medium";

    appliedRules.add("predicate.function_on_column");
    findings.push(
      buildFinding("predicate.function_on_column", findings.length, {
        title: `Function ${fn.functionName} on predicate column may reduce index usage`,
        description:
          "Applying functions to filter columns can prevent planners from using efficient index/range scans.",
        severity,
        suggestion: {
          summary: "Rewrite predicate using range boundaries or precomputed normalized columns.",
          rationale:
            severity === "high"
              ? `Detected indexed column(s): ${indexedColumns.join(", ")}. Preserve raw column comparisons to keep those indexes usable.`
              : "Raw column comparisons generally provide more stable access paths than function-wrapped predicates.",
        },
      }),
    );
  }
}

function pushCorrelatedSubqueryFinding(parsed: ParsedSqlQuery, findings: Finding[], appliedRules: Set<string>) {
  if (!parsed.hasCorrelatedSubquery) {
    return;
  }

  appliedRules.add("join.correlated_subquery");
  findings.push(
    buildFinding("join.correlated_subquery", findings.length, {
      title: "Correlated subquery detected",
      description: "Correlated subqueries can execute repeatedly per outer row and degrade predictability at scale.",
      severity: "high",
      suggestion: {
        summary: "Refactor to window functions or pre-aggregated CTEs before joining.",
        rationale: "Set-based rewrites usually reduce repeated scans and produce more stable execution time.",
      },
    }),
  );
}

function pushDistinctAggregationFinding(parsed: ParsedSqlQuery, findings: Finding[], appliedRules: Set<string>) {
  if (parsed.countDistinctExpressions.length === 0) {
    return;
  }

  appliedRules.add("aggregation.distinct_high_cardinality");
  findings.push(
    buildFinding("aggregation.distinct_high_cardinality", findings.length, {
      title: "COUNT(DISTINCT ...) may be memory intensive",
      description:
        "Distinct aggregations can require large hash/sort structures, especially on high-cardinality identifiers.",
      severity: "medium",
      suggestion: {
        summary: "Consider two-stage aggregation (dedupe first, then aggregate).",
        rationale: "Pre-aggregating unique keys can lower memory pressure and improve plan stability.",
      },
    }),
  );
}

function pushOrderedWithoutLimitFinding(parsed: ParsedSqlQuery, findings: Finding[], appliedRules: Set<string>) {
  if (!parsed.orderByClause || parsed.hasLimit) {
    return;
  }

  appliedRules.add("pagination.order_without_limit");
  findings.push(
    buildFinding("pagination.order_without_limit", findings.length, {
      title: "ORDER BY without LIMIT can sort large result sets",
      description: "Sorting the full qualifying dataset increases work memory and response latency.",
      severity: "low",
      suggestion: {
        summary: "Apply LIMIT for interactive views, or paginate with keyset/cursor strategy.",
        rationale: "Limiting sorted rows is usually sufficient for dashboards and first-page UX.",
      },
    }),
  );
}

function pushLeadingWildcardFinding(parsed: ParsedSqlQuery, findings: Finding[], appliedRules: Set<string>) {
  if (!parsed.likePatterns.some((pattern) => /^%/.test(pattern))) {
    return;
  }

  appliedRules.add("predicate.leading_wildcard_like");
  findings.push(
    buildFinding("predicate.leading_wildcard_like", findings.length, {
      title: "Leading wildcard LIKE pattern may trigger full scans",
      description: "Patterns like '%term' are not btree-friendly and often require sequential scans.",
      severity: "high",
      suggestion: {
        summary: "Use trigram/full-text indexes or avoid leading wildcard patterns when possible.",
        rationale: "Specialized indexes are better suited for contains-style text search.",
      },
    }),
  );
}

function buildFinding(
  ruleId: string,
  position: number,
  payload: {
    title: string;
    description: string;
    severity: Severity;
    suggestion: Pick<RewriteSuggestion, "summary" | "rationale">;
  },
): Finding {
  return {
    id: `finding-${ruleId.replace(/[^a-z0-9]+/gi, "-")}-${position + 1}`,
    ruleId,
    title: payload.title,
    description: payload.description,
    severity: payload.severity,
    suggestion: {
      id: `suggestion-${ruleId.replace(/[^a-z0-9]+/gi, "-")}-${position + 1}`,
      summary: payload.suggestion.summary,
      rationale: payload.suggestion.rationale,
    },
  };
}

function extractCountDistinctExpressions(sql: string): string[] {
  const matches = sql.matchAll(/COUNT\s*\(\s*DISTINCT\s+([^\)]+)\)/gi);
  return [...matches].map((match) => (match[1] ?? "").trim()).filter(Boolean);
}

function extractLikePatterns(whereClause: string): string[] {
  const result: string[] = [];
  const regex = /\bLIKE\s+'([^']+)'/gi;
  for (const match of whereClause.matchAll(regex)) {
    if (match[1]) {
      result.push(match[1]);
    }
  }
  return result;
}

function extractPredicateFunctions(whereClause: string): ParsedPredicateFunction[] {
  const stripped = stripSqlStrings(whereClause);
  const result: ParsedPredicateFunction[] = [];
  const fnRegex = /\b([A-Za-z_][A-Za-z0-9_]*)\s*\(([^\(\)]*)\)/g;

  for (const match of stripped.matchAll(fnRegex)) {
    const functionName = (match[1] ?? "").toUpperCase();
    const args = match[2] ?? "";

    const referencedColumns = [...args.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*\.[A-Za-z_][A-Za-z0-9_]*|[A-Za-z_][A-Za-z0-9_]*)\b/g)]
      .map((columnMatch) => columnMatch[1] ?? "")
      .filter((identifier) => {
        const upper = identifier.toUpperCase();
        return !SQL_KEYWORDS.has(upper) && !/^\d+$/.test(identifier);
      })
      .map((identifier) => normalizeIdentifier(identifier));

    if (referencedColumns.length === 0) {
      continue;
    }

    result.push({
      functionName,
      referencedColumns: unique(referencedColumns),
      rawExpression: (match[0] ?? "").trim(),
    });
  }

  return result;
}

function detectCorrelatedSubquery(sql: string, aliases: string[]): boolean {
  if (!/\(\s*SELECT\b/i.test(sql)) {
    return false;
  }

  if (aliases.length === 0) {
    return /\bWHERE\b[\s\S]*\(\s*SELECT[\s\S]*\bWHERE\b[\s\S]*\b\w+\.\w+/i.test(sql);
  }

  const pattern = new RegExp(
    `\\(\\s*SELECT[\\s\\S]*?\\bWHERE\\b[\\s\\S]*?\\b(?:${aliases.map(escapeRegExp).join("|")})\\.[A-Za-z_][A-Za-z0-9_]*`,
    "i",
  );
  return pattern.test(sql);
}

function extractTableRefs(fromClause: string): ParsedTableRef[] {
  const refs: ParsedTableRef[] = [];
  const clause = stripSqlStrings(fromClause);

  const fromMatch = clause.match(/^\s*([A-Za-z_][A-Za-z0-9_."]*)(?:\s+(?:AS\s+)?([A-Za-z_][A-Za-z0-9_]*))?/i);
  if (fromMatch?.[1]) {
    refs.push({
      joinType: "from",
      tableName: normalizeIdentifier(fromMatch[1]),
      alias: normalizeIdentifier(fromMatch[2] ?? "") || undefined,
    });
  }

  const joinRegex = /\bJOIN\s+([A-Za-z_][A-Za-z0-9_."]*)(?:\s+(?:AS\s+)?([A-Za-z_][A-Za-z0-9_]*))?/gi;
  for (const match of clause.matchAll(joinRegex)) {
    refs.push({
      joinType: "join",
      tableName: normalizeIdentifier(match[1] ?? ""),
      alias: normalizeIdentifier(match[2] ?? "") || undefined,
    });
  }

  return refs;
}

function isColumnIndexed(columnRef: string, tableRefs: ParsedTableRef[], schema?: ParsedSchema): boolean {
  if (!schema) {
    return false;
  }

  const parts = columnRef.split(".").map((part) => normalizeIdentifier(part));
  const column = parts.at(-1);
  if (!column) {
    return false;
  }

  const tableOrAlias = parts.length > 1 ? parts[0] : undefined;

  const resolvedTable = tableOrAlias
    ? tableRefs.find((ref) => ref.alias === tableOrAlias || ref.tableName === tableOrAlias)?.tableName
    : undefined;

  return schema.indexes.some((index) => {
    const tableMatches = resolvedTable ? index.tableName === resolvedTable : true;
    return tableMatches && index.columns.includes(column);
  });
}

function normalizeSql(sql: string): string {
  return stripComments(sql).replace(/\s+/g, " ").trim();
}

function stripComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\n\r]*/g, " ");
}

function stripSqlStrings(sql: string): string {
  return sql.replace(/'([^']|'')*'/g, "''");
}

function extractTopLevelClause(sql: string, startKeyword: string, stopKeywords: string[]): string | undefined {
  const start = indexOfKeyword(sql, startKeyword);
  if (start === -1) {
    return undefined;
  }

  const from = start + startKeyword.length;
  let to = sql.length;

  for (const keyword of stopKeywords) {
    const idx = indexOfKeyword(sql, keyword, from);
    if (idx !== -1) {
      to = Math.min(to, idx);
    }
  }

  if (to <= from) {
    return undefined;
  }

  return sql.slice(from, to).trim();
}

function indexOfKeyword(sql: string, keyword: string, fromIndex = 0): number {
  const upper = sql.toUpperCase();
  const target = keyword.toUpperCase();

  let depth = 0;
  let inString = false;

  for (let i = fromIndex; i < upper.length; i += 1) {
    const char = upper[i];

    if (char === "'" && upper[i - 1] !== "\\") {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === "(") {
      depth += 1;
      continue;
    }

    if (char === ")") {
      depth = Math.max(0, depth - 1);
      continue;
    }

    if (depth > 0) {
      continue;
    }

    if (upper.startsWith(target, i)) {
      const prev = upper[i - 1] ?? " ";
      const next = upper[i + target.length] ?? " ";
      const boundaryPrev = /\W/.test(prev);
      const boundaryNext = /\W/.test(next);

      if (boundaryPrev && boundaryNext) {
        return i;
      }
    }
  }

  return -1;
}

function splitTopLevel(input: string, delimiter: string): string[] {
  const result: string[] = [];
  let depth = 0;
  let inString = false;
  let segment = "";

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (char === "'" && input[i - 1] !== "\\") {
      inString = !inString;
      segment += char;
      continue;
    }

    if (!inString) {
      if (char === "(") {
        depth += 1;
      } else if (char === ")") {
        depth = Math.max(0, depth - 1);
      }
    }

    if (!inString && depth === 0 && char === delimiter) {
      result.push(segment);
      segment = "";
      continue;
    }

    segment += char;
  }

  if (segment.trim()) {
    result.push(segment);
  }

  return result;
}

function normalizeIdentifier(token: string): string {
  return token.replace(/"/g, "").split(".").pop()?.trim().toLowerCase() ?? "";
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
