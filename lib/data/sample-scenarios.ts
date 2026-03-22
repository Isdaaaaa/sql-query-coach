import type { SampleScenario } from "@/lib/models/domain";

export const sampleScenarios: SampleScenario[] = [
  {
    id: "orders-scan-risk",
    label: "Orders dashboard query",
    metadata: {
      summary: "Recent orders feed for internal operations dashboard.",
      objective: "Speed up date filtering and trim over-fetching.",
      domain: "Commerce",
      difficulty: "intro",
      tags: ["joins", "filtering", "projection"],
      estimatedRows: "orders: 4.2M, customers: 210k",
    },
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
);

CREATE INDEX idx_orders_customer_id ON orders (customer_id);
CREATE INDEX idx_orders_created_at ON orders (created_at DESC);`,
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
          rewrittenSql:
            "SELECT o.id, o.total_cents, o.status, o.created_at, c.email FROM orders o JOIN customers c ON c.id = o.customer_id ...",
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
  {
    id: "payments-latest-status",
    label: "Payment status timeline",
    metadata: {
      summary: "Support report showing latest payment state per invoice.",
      objective: "Remove expensive correlated subqueries.",
      domain: "Fintech",
      difficulty: "intermediate",
      tags: ["window-functions", "subqueries", "reporting"],
      estimatedRows: "payments: 18M, invoices: 2.8M",
    },
    query: {
      id: "query-payment-state",
      title: "Latest payment status per invoice",
      dialect: "postgres",
      sql: `SELECT i.id, i.account_id, p.status, p.created_at
FROM invoices i
LEFT JOIN payments p ON p.invoice_id = i.id
WHERE p.created_at = (
  SELECT MAX(p2.created_at)
  FROM payments p2
  WHERE p2.invoice_id = i.id
)
AND i.created_at >= NOW() - INTERVAL '90 days';`,
    },
    schema: {
      id: "schema-fintech-core",
      name: "fintech-core",
      ddl: `CREATE TABLE invoices (
  id BIGINT PRIMARY KEY,
  account_id BIGINT NOT NULL,
  amount_cents BIGINT NOT NULL,
  currency TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE payments (
  id BIGINT PRIMARY KEY,
  invoice_id BIGINT NOT NULL REFERENCES invoices(id),
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_invoices_created_at ON invoices (created_at DESC);
CREATE INDEX idx_payments_invoice_created ON payments (invoice_id, created_at DESC);`,
    },
    findings: [
      {
        id: "finding-correlated-max",
        ruleId: "join.correlated_subquery",
        title: "Correlated MAX() can become row-by-row work",
        description: "Subquery executes per invoice and scales poorly with high cardinality.",
        severity: "high",
        suggestion: {
          id: "suggestion-window-rank",
          summary: "Use ROW_NUMBER() partitioned by invoice_id.",
          rationale: "Window ranking computes latest rows in one pass and simplifies joins.",
          rewrittenSql:
            "WITH ranked AS (SELECT p.*, ROW_NUMBER() OVER (PARTITION BY invoice_id ORDER BY created_at DESC) AS rn FROM payments p) ...",
        },
      },
    ],
  },
  {
    id: "events-distinct-users",
    label: "Weekly active users",
    metadata: {
      summary: "Product analytics query for WAU by workspace tier.",
      objective: "Reduce sort/hash load and improve date partition pruning.",
      domain: "SaaS analytics",
      difficulty: "advanced",
      tags: ["distinct", "aggregations", "partitions"],
      estimatedRows: "events: 220M/month, workspaces: 95k",
    },
    query: {
      id: "query-wau-by-tier",
      title: "WAU grouped by plan tier",
      dialect: "postgres",
      sql: `SELECT w.plan_tier, COUNT(DISTINCT e.user_id) AS weekly_active_users
FROM analytics_events e
JOIN workspaces w ON w.id = e.workspace_id
WHERE DATE_TRUNC('week', e.occurred_at) = DATE_TRUNC('week', NOW())
  AND e.event_name IN ('session_started', 'dashboard_opened', 'report_exported')
GROUP BY w.plan_tier
ORDER BY weekly_active_users DESC;`,
    },
    schema: {
      id: "schema-analytics",
      name: "analytics",
      ddl: `CREATE TABLE workspaces (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  plan_tier TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE analytics_events (
  id BIGINT PRIMARY KEY,
  workspace_id BIGINT NOT NULL REFERENCES workspaces(id),
  user_id BIGINT NOT NULL,
  event_name TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL
) PARTITION BY RANGE (occurred_at);

CREATE INDEX idx_events_workspace_time ON analytics_events (workspace_id, occurred_at DESC);
CREATE INDEX idx_events_event_time ON analytics_events (event_name, occurred_at DESC);`,
    },
    findings: [
      {
        id: "finding-trunc-week",
        ruleId: "predicate.function_on_column",
        title: "DATE_TRUNC on occurred_at may weaken partition pruning",
        description: "Applying function to column can prevent efficient time-bound scans.",
        severity: "medium",
        suggestion: {
          id: "suggestion-week-range",
          summary: "Filter with explicit week start/end timestamps.",
          rationale: "Range boundaries on raw column align better with partition pruning.",
          rewrittenSql:
            "WHERE e.occurred_at >= date_trunc('week', now()) AND e.occurred_at < date_trunc('week', now()) + interval '7 days'",
        },
      },
      {
        id: "finding-distinct-heavy",
        ruleId: "aggregation.distinct_high_cardinality",
        title: "COUNT(DISTINCT) may trigger heavy memory usage",
        description: "High-cardinality distinct aggregation can create large hash sets.",
        severity: "medium",
        suggestion: {
          id: "suggestion-pre-aggregate",
          summary: "Pre-aggregate to unique workspace-user keys before final grouping.",
          rationale: "Two-stage aggregation reduces memory pressure in peak windows.",
        },
      },
    ],
  },
];
