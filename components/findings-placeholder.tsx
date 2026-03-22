import type { Finding } from "@/lib/models/domain";

const severityStyles: Record<Finding["severity"], string> = {
  low: "border-emerald-500/40 text-emerald-200",
  medium: "border-amber-500/40 text-amber-200",
  high: "border-rose-500/50 text-rose-200",
  critical: "border-rose-500/70 text-rose-100",
};

interface FindingsPlaceholderProps {
  findings: Finding[];
}

export function FindingsPlaceholder({ findings }: FindingsPlaceholderProps) {
  return (
    <article className="panel p-4 md:p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">Findings (placeholder)</h2>
      <p className="mb-4 text-sm text-slate-400">
        Heuristic analysis pipeline lands in slice-002. For now this panel confirms scenario metadata + edited inputs are wired.
      </p>

      <ul className="space-y-3">
        {findings.map((finding) => (
          <li key={finding.id} className="rounded-lg border border-slate-700/70 bg-slate-950/50 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="font-medium text-slate-100">{finding.title}</p>
              <span className={`rounded-full border px-2 py-0.5 text-xs capitalize ${severityStyles[finding.severity]}`}>
                {finding.severity}
              </span>
            </div>
            <p className="text-sm text-slate-300">{finding.description}</p>
            <p className="mt-2 text-sm text-teal-200">Suggestion: {finding.suggestion.summary}</p>
          </li>
        ))}
      </ul>
    </article>
  );
}
