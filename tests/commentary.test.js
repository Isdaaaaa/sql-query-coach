const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

function loadCommentaryModule() {
  const filePath = path.resolve(__dirname, "../lib/analysis/commentary.ts");
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

const { generateAiCommentary } = loadCommentaryModule();

const sampleAnalysis = {
  dialect: "postgres",
  parsedQuery: {},
  findings: [
    {
      id: "f1",
      ruleId: "join.correlated_subquery",
      title: "Correlated subquery detected",
      description: "Correlated subqueries can execute repeatedly.",
      severity: "high",
      suggestion: {
        id: "s1",
        summary: "Refactor to a pre-aggregated CTE.",
        rationale: "Set-based rewrites reduce repeated scans.",
      },
    },
    {
      id: "f2",
      ruleId: "projection.select_star",
      title: "Avoid SELECT *",
      description: "Selecting all columns increases payload size.",
      severity: "medium",
      suggestion: {
        id: "s2",
        summary: "Project only required columns.",
        rationale: "Narrow projection reduces I/O.",
      },
    },
  ],
  diagnostics: {
    parseWarnings: [],
    appliedRules: [],
  },
};

test("generateAiCommentary returns null when disabled", () => {
  const commentary = generateAiCommentary({ analysis: sampleAnalysis, mode: "coaching", enabled: false });
  assert.equal(commentary, null);
});

test("generateAiCommentary produces mode-distinct output", () => {
  const coaching = generateAiCommentary({ analysis: sampleAnalysis, mode: "coaching", enabled: true });
  const reviewer = generateAiCommentary({ analysis: sampleAnalysis, mode: "reviewer", enabled: true });

  assert.ok(coaching);
  assert.ok(reviewer);
  assert.notEqual(coaching.overallAssessment, reviewer.overallAssessment);
  assert.equal(coaching.topPriorities.length, 2);
  assert.equal(reviewer.riskCallouts.length, 1);
});
