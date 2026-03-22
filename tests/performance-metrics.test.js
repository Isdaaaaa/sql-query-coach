const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

function loadTsModule(relativePath) {
  const filePath = path.resolve(__dirname, relativePath);
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

const { analyzeSqlCoaching } = loadTsModule("../lib/analysis/sql-coach.ts");
const { derivePerformanceMetrics } = loadTsModule("../lib/analysis/perf-metrics.ts");

test("derivePerformanceMetrics computes joins, severities, and complexity consistently", () => {
  const sql = `SELECT *
FROM invoices i
LEFT JOIN payments p ON p.invoice_id = i.id
WHERE LOWER(i.account_id::text) = 'acc_123'
  AND p.status LIKE '%fail%'
ORDER BY i.created_at DESC;`;

  const analysis = analyzeSqlCoaching({ sql });
  const metrics = derivePerformanceMetrics(analysis);

  assert.equal(metrics.joinCount, 1);
  assert.equal(metrics.tableCount, 2);
  assert.equal(metrics.severityDistribution.high >= 1, true);
  assert.equal(metrics.severityDistribution.medium >= 1, true);
  assert.equal(metrics.complexityScore > 0, true);
  assert.equal(["Low", "Moderate", "High"].includes(metrics.complexityLabel), true);
  assert.equal(["low", "medium", "high"].includes(metrics.scanRiskLevel), true);
});

test("derivePerformanceMetrics returns low risk for clean query", () => {
  const sql = `SELECT id, created_at
FROM invoices
WHERE created_at >= NOW() - INTERVAL '7 days'
LIMIT 100;`;

  const analysis = analyzeSqlCoaching({ sql });
  const metrics = derivePerformanceMetrics(analysis);

  assert.deepEqual(metrics.severityDistribution, {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  });
  assert.equal(metrics.scanRiskLevel, "low");
  assert.equal(metrics.scanRiskScore, 0);
});
