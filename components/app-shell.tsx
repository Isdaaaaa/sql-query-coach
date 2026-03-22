"use client";

import { useMemo, useState } from "react";

import { FindingsPlaceholder } from "@/components/findings-placeholder";
import { QuerySchemaInputs } from "@/components/query-schema-inputs";
import { SampleScenarioPicker } from "@/components/sample-scenario-picker";
import { ScenarioMetadataCard } from "@/components/scenario-metadata-card";
import type { SampleScenario } from "@/lib/models/domain";

interface AppShellProps {
  scenarios: SampleScenario[];
}

function isDirtyComparedToSample(scenario: SampleScenario, querySql: string, schemaDdl: string): boolean {
  return querySql !== scenario.query.sql || schemaDdl !== scenario.schema.ddl;
}

export function AppShell({ scenarios }: AppShellProps) {
  const [selectedScenarioId, setSelectedScenarioId] = useState(scenarios[0]?.id ?? "");
  const selectedScenario = useMemo(
    () => scenarios.find((scenario) => scenario.id === selectedScenarioId) ?? scenarios[0],
    [scenarios, selectedScenarioId],
  );

  const [querySql, setQuerySql] = useState(selectedScenario?.query.sql ?? "");
  const [schemaDdl, setSchemaDdl] = useState(selectedScenario?.schema.ddl ?? "");

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

  const isDirty = isDirtyComparedToSample(selectedScenario, querySql, schemaDdl);

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
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col p-6 md:p-8">
      <header className="sticky top-0 z-10 mb-6 rounded-xl border border-slate-700/60 bg-base-800/80 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-teal-300">SQL Query Coach</p>
            <h1 className="text-lg font-semibold text-white">Schema + sample data inputs</h1>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-200">
            <span className="rounded-md border border-slate-600 px-2 py-1">Mode: Coaching</span>
            <span className="rounded-md border border-slate-600 px-2 py-1">AI: Off</span>
            <span className="rounded-md border border-slate-600 px-2 py-1">Data: Sample</span>
          </div>
        </div>
      </header>

      <section className="grid flex-1 gap-6 lg:grid-cols-2">
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

        <FindingsPlaceholder findings={selectedScenario.findings} />
      </section>
    </main>
  );
}
