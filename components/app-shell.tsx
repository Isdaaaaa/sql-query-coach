import type { SampleScenario } from "@/lib/models/domain";

interface AppShellProps {
  scenarios: SampleScenario[];
}

export function AppShell({ scenarios }: AppShellProps) {
  const scenario = scenarios[0];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col p-6 md:p-8">
      <header className="sticky top-0 z-10 mb-6 rounded-xl border border-slate-700/60 bg-base-800/80 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-teal-300">SQL Query Coach</p>
            <h1 className="text-lg font-semibold text-white">Bootstrap Shell (Slice 000)</h1>
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
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">Input</h2>
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-medium text-slate-400">Query</p>
              <pre className="code-block whitespace-pre-wrap">{scenario.query.sql}</pre>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-slate-400">Schema</p>
              <pre className="code-block whitespace-pre-wrap">{scenario.schema.ddl}</pre>
            </div>
          </div>
        </article>

        <article className="panel p-4 md:p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">Findings (placeholder)</h2>
          <ul className="space-y-3">
            {scenario.findings.map((finding) => (
              <li key={finding.id} className="rounded-lg border border-slate-700/70 bg-slate-950/50 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="font-medium text-slate-100">{finding.title}</p>
                  <span className="rounded-full border border-slate-600 px-2 py-0.5 text-xs text-slate-300">
                    {finding.severity}
                  </span>
                </div>
                <p className="text-sm text-slate-300">{finding.description}</p>
                <p className="mt-2 text-sm text-teal-200">Suggestion: {finding.suggestion.summary}</p>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </main>
  );
}
