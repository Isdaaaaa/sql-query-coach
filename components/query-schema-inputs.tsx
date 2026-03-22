interface QuerySchemaInputsProps {
  querySql: string;
  schemaDdl: string;
  onChangeQuerySql: (value: string) => void;
  onChangeSchemaDdl: (value: string) => void;
  onResetToSample: () => void;
  isDirty: boolean;
}

export function QuerySchemaInputs({
  querySql,
  schemaDdl,
  onChangeQuerySql,
  onChangeSchemaDdl,
  onResetToSample,
  isDirty,
}: QuerySchemaInputsProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Input</h2>
        <button
          type="button"
          onClick={onResetToSample}
          disabled={!isDirty}
          className="rounded-md border border-slate-600 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:border-teal-400 hover:text-teal-200 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Reset to sample defaults
        </button>
      </div>

      <div>
        <label htmlFor="query-sql" className="mb-2 block text-xs font-medium text-slate-400">
          Query SQL
        </label>
        <textarea
          id="query-sql"
          value={querySql}
          onChange={(event) => onChangeQuerySql(event.target.value)}
          spellCheck={false}
          className="editor-area min-h-[240px]"
        />
      </div>

      <div>
        <label htmlFor="schema-ddl" className="mb-2 block text-xs font-medium text-slate-400">
          Schema DDL
        </label>
        <textarea
          id="schema-ddl"
          value={schemaDdl}
          onChange={(event) => onChangeSchemaDdl(event.target.value)}
          spellCheck={false}
          className="editor-area min-h-[220px]"
        />
      </div>
    </section>
  );
}
