const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

function loadAnalysisModule() {
  const filePath = path.resolve(__dirname, "../lib/analysis/sql-coach.ts");
  const source = fs.readFileSync(filePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: filePath,
  });

  const module = { exports: {} };
  const runner = new Function("require", "module", "exports", transpiled.outputText);
  runner(require, module, module.exports);

  return module.exports;
}

const { analyzeSqlCoaching, parseSchemaDdl } = loadAnalysisModule();

const commerceSchema = `CREATE TABLE customers (
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
CREATE INDEX idx_orders_created_at ON orders (created_at DESC);`;

test("parseSchemaDdl extracts table/index metadata", () => {
  const parsed = parseSchemaDdl(commerceSchema);

  assert.deepEqual(parsed.tableColumns.orders, ["id", "customer_id", "total_cents", "status", "created_at"]);
  assert.equal(parsed.indexes.length, 2);
  assert.deepEqual(parsed.indexes[1], {
    name: "idx_orders_created_at",
    tableName: "orders",
    columns: ["created_at"],
  });
});

test("analyzeSqlCoaching detects select-star and function-on-indexed-column", () => {
  const sql = `SELECT *
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE DATE(o.created_at) >= '2026-01-01'
ORDER BY o.created_at DESC;`;

  const result = analyzeSqlCoaching({ sql, schemaDdl: commerceSchema });

  const ruleIds = result.findings.map((finding) => finding.ruleId);
  assert.ok(ruleIds.includes("projection.select_star"));
  assert.ok(ruleIds.includes("predicate.function_on_column"));

  const functionFinding = result.findings.find((finding) => finding.ruleId === "predicate.function_on_column");
  assert.equal(functionFinding?.severity, "high");
});

test("analyzeSqlCoaching detects correlated subquery and count distinct", () => {
  const sql = `SELECT i.id, COUNT(DISTINCT p.id) AS payment_count
FROM invoices i
LEFT JOIN payments p ON p.invoice_id = i.id
WHERE p.created_at = (
  SELECT MAX(p2.created_at)
  FROM payments p2
  WHERE p2.invoice_id = i.id
)
GROUP BY i.id;`;

  const result = analyzeSqlCoaching({ sql });

  const ruleIds = result.findings.map((finding) => finding.ruleId);
  assert.ok(ruleIds.includes("join.correlated_subquery"));
  assert.ok(ruleIds.includes("aggregation.distinct_high_cardinality"));
  assert.ok(result.parsedQuery.hasCorrelatedSubquery);
});

test("analyzeSqlCoaching detects leading wildcard LIKE", () => {
  const sql = `SELECT id
FROM customers
WHERE email LIKE '%@gmail.com';`;

  const result = analyzeSqlCoaching({ sql });
  const finding = result.findings.find((entry) => entry.ruleId === "predicate.leading_wildcard_like");

  assert.ok(finding);
  assert.equal(finding.severity, "high");
});
