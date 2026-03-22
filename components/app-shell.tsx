"use client";

import { useEffect, useMemo, useState } from "react";

import { analyzeSqlCoaching, generateAiCommentary, type SqlAnalysisResult } from "@/lib/analysis";
import { FindingsPlaceholder } from "@/components/findings-placeholder";
import { QuerySchemaInputs } from "@/components/query-schema-inputs";
import { SampleScenarioPicker } from "@/components/sample-scenario-picker";
import { ScenarioMetadataCard } from "@/components/scenario-metadata-card";
import type { SampleScenario, ToneMode } from "@/lib/models/domain";

interface AppShellProps {
  scenarios: SampleScenario[];
}

function isDirtyComparedToSample(scenario: SampleScenario, querySql: string, schemaDdl: string): boolean {
  return querySql !== scenario.query.sql || schemaDdl !== scenario.schema.ddl;
}

export function AppShell({ scenarios }: AppShellProps) {
  const [selectedScenarioId, setSelectedScenarioId] = useState(scenarios[0]?.id ?? "");
  const [mode, setMode] = useState<ToneMode>("coaching");
  const [aiCommentaryEnabled, setAiCommentaryEnabled] = useState(false);

  const selectedScenario = useMemo(
    () => scenarios.find((scenario) => scenario.id === selectedScenarioId) ?? scenarios[0],
    [scenarios, selectedScenarioId],
  );

  const [querySql, setQuerySql] = useState(selectedScenario?.query.sql ?? "");
  const [schemaDdl, setSchemaDdl] = useState(selectedScenario?.schema.ddl ?? "");
  const [analysis, setAnalysis] = useState<SqlAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    const sql = querySql.trim();
    if (!sql) {
      setAnalysis(null);
      setIsAnalyzing(false);
      return;
    }

    setIsAnalyzing(true);
    const timer = window.setTimeout(() => {
      const result = analyzeSqlCoaching({
        sql: querySql,
        schemaDdl,
        dialect: selectedScenario?.query.dialect,
      });
      setAnalysis(result);
      setIsAnalyzing(false);
    }, 220);

    return () => window.clearTimeout(timer);
  }, [querySql, schemaDdl, selectedScenario?.query.dialect]);

  const isDirty = selectedScenario
    ? isDirtyComparedToSample(selectedScenario, querySql, schemaDdl)
    : false;
  const aiCommentary = generateAiCommentary({
    analysis,
    mode,
    enabled: aiCommentaryEnabled,
  });

  if (!selectedScenario) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-7xl p-6 md:p-8">
        <section className="panel w-full p-6">
          <h1 className="text-xl font-semibold text-white">SQL Query Coach</h1>
          <p className="mt-2 text-slate-300">No sample scenarios are available yet.</p>
        </section>
      </main>
    );
  }

  const handleSelectScenario = (scenarioId: string) => {
    const nextScenario = scenarios.find((scenario) => scenario.id === scenarioId);
    if (!nextScenario) {
      return;
    }

    setSelectedScenarioId(nextScenario.id);
    setQuerySql(nextScenario.query.sql);
    setSchemaDdl(nextScenario.schema.ddl);
  };

  const handleResetToSample = () => {
    setQuerySql(selectedScenario.query.sql);
    setSchemaDdl(selectedScenario.schema.ddl);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col p-4 sm:p-6 md:p-8">
      <header className="sticky top-0 z-20 mb-5 rounded-xl border border-slate-700/60 bg-base-800/85 px-4 py-3 shadow-panel backdrop-blur md:px-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-300">SQL Query Coach</p>
            <h1 className="text-lg font-semibold text-white">Heuristic performance review workspace</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-lg border border-slate-600/80 bg-slate-950/60 p-1 text-xs">
              <button
                type="button"
                onClick={() => setMode("coaching")}
                aria-pressed={mode === "coaching"}
                className={`rounded-md px-2.5 py-1.5 font-semibold transition ${
                  mode === "coaching"
                    ? "bg-teal-500/20 text-teal-100"
                    : "text-slate-300 hover:text-slate-100"
                }`}
              >
                Coaching
              </button>
              <button
                type="button"
                onClick={() => setMode("reviewer")}
                aria-pressed={mode === "reviewer"}
                className={`rounded-md px-2.5 py-1.5 font-semibold transition ${
                  mode === "reviewer"
                    ? "bg-teal-500/20 text-teal-100"
                    : "text-slate-300 hover:text-slate-100"
                }`}
              >
                Reviewer
              </button>
            </div>

            <button
              type="button"
              onClick={() => setAiCommentaryEnabled((current) => !current)}
              aria-pressed={aiCommentaryEnabled}
              className={`rounded-md border px-2 py-1 text-xs font-medium transition ${
                aiCommentaryEnabled
                  ? "border-teal-400/60 bg-teal-500/15 text-teal-100"
                  : "border-slate-600/90 bg-slate-950/60 text-slate-200 hover:border-slate-500"
              }`}
            >
              AI commentary: {aiCommentaryEnabled ? "On" : "Off"}
            </button>
            <span className="rounded-md border border-slate-600/90 bg-slate-950/60 px-2 py-1 text-xs font-medium text-slate-200">
              Data: {isDirty ? "Custom" : "Sample"}
            </span>
          </div>
        </div>
      </header>

      <section className="grid flex-1 gap-5 lg:grid-cols-2">
        <article className="panel p-4 md:p-5">
          <div className="space-y-4">
            <SampleScenarioPicker
              scenarios={scenarios}
              selectedScenarioId={selectedScenario.id}
              onSelect={handleSelectScenario}
            />
            <ScenarioMetadataCard scenario={selectedScenario} />
            <QuerySchemaInputs
              querySql={querySql}
              schemaDdl={schemaDdl}
              onChangeQuerySql={setQuerySql}
              onChangeSchemaDdl={setSchemaDdl}
              onResetToSample={handleResetToSample}
              isDirty={isDirty}
            />
          </div>
        </article>

        <FindingsPlaceholder
          mode={mode}
          isAnalyzing={isAnalyzing}
          analysis={analysis}
          hasQuery={Boolean(querySql.trim())}
          usingCustomInput={isDirty}
          aiCommentaryEnabled={aiCommentaryEnabled}
          aiCommentary={aiCommentary}
        />
      </section>
    </main>
  );
}
