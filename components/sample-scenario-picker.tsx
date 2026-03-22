import type { SampleScenario } from "@/lib/models/domain";

interface SampleScenarioPickerProps {
  scenarios: SampleScenario[];
  selectedScenarioId: string;
  onSelect: (scenarioId: string) => void;
}

export function SampleScenarioPicker({
  scenarios,
  selectedScenarioId,
  onSelect,
}: SampleScenarioPickerProps) {
  return (
    <div>
      <label htmlFor="scenario-picker" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-300">
        Sample scenario
      </label>
      <select
        id="scenario-picker"
        value={selectedScenarioId}
        onChange={(event) => onSelect(event.target.value)}
        className="w-full rounded-lg border border-slate-600/80 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30"
      >
        {scenarios.map((scenario) => (
          <option key={scenario.id} value={scenario.id}>
            {scenario.label}
          </option>
        ))}
      </select>
    </div>
  );
}
