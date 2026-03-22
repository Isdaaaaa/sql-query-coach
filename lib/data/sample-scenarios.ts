import type { SampleScenario } from "@/lib/models/domain";

export const sampleScenarios: SampleScenario[] = [
  {
    id: "orders-scan-risk",
    label: "Orders dashboard query",
    query: {
      id: "query-orders-dashboard",
      title: "Orders + customers dashboard",
      dialect: "postgres",
      sql: `SELECT *
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE DATE(o.created_at) >= '2026-01-01'
ORDER BY o.created_at DESC;`,
    },
    schema: {
      id: "schema-commerce-lite",
      name: "commerce-lite",
      ddl: `CREATE TABLE customers (
  id BIGINT PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE orders (
  id BIGINT PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id),
  total_cents BIGINT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);`,
    },
    findings: [
      {
        id: "finding-select-star",
        ruleId: "projection.select_star",
        title: "Avoid SELECT * in reviewer-facing queries",
        description: "Returning all columns inflates transfer and can block index-only strategies.",
        severity: "medium",
        suggestion: {
          id: "suggestion-select-explicit",
          summary: "Project only required columns.",
          rationale: "Narrow projection improves readability and lowers unnecessary IO.",
          rewrittenSql: "SELECT o.id, o.total_cents, o.status, o.created_at, c.email FROM ...",
        },
      },
      {
        id: "finding-function-on-filter",
        ruleId: "predicate.function_on_column",
        title: "Function on indexed timestamp may disable index usage",
        description: "Wrapping created_at with DATE() can force full scans on larger tables.",
        severity: "high",
        suggestion: {
          id: "suggestion-range-predicate",
          summary: "Use range predicates on raw timestamp column.",
          rationale: "Range comparison preserves index access paths and scales better.",
          rewrittenSql:
            "WHERE o.created_at >= TIMESTAMPTZ '2026-01-01 00:00:00+00'",
          indexStatement: "CREATE INDEX idx_orders_created_at ON orders (created_at DESC);",
        },
      },
    ],
  },
];
