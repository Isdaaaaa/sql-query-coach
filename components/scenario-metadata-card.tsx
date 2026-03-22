import type { SampleScenario } from "@/lib/models/domain";

interface ScenarioMetadataCardProps {
  scenario: SampleScenario;
}

export function ScenarioMetadataCard({ scenario }: ScenarioMetadataCardProps) {
  const { metadata, query, schema } = scenario;

  return (
    <section className="rounded-lg border border-slate-700/80 bg-slate-950/45 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-teal-500/60 bg-teal-500/10 px-2 py-0.5 text-xs font-medium text-teal-200">
          {metadata.domain}
        </span>
        <span className="rounded-full border border-slate-600/80 px-2 py-0.5 text-xs text-slate-300">
          {metadata.difficulty}
        </span>
        <span className="rounded-full border border-slate-600/80 px-2 py-0.5 text-xs text-slate-300">
          {query.dialect}
        </span>
      </div>

      <p className="text-sm text-slate-200">{metadata.summary}</p>
      <p className="mt-2 text-sm text-slate-300">
        <span className="font-medium text-slate-200">Goal:</span> {metadata.objective}
      </p>
      <p className="mt-1 text-xs text-slate-400">Dataset: {metadata.estimatedRows}</p>
      <p className="mt-1 text-xs text-slate-400">Schema: {schema.name}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {metadata.tags.map((tag) => (
          <span key={tag} className="rounded-md border border-slate-700/90 bg-slate-900/70 px-2 py-0.5 text-xs text-slate-300">
            #{tag}
          </span>
        ))}
      </div>
    </section>
  );
}
