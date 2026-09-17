import { useCallback, useEffect, useRef, useState } from 'react';
import { GitCompareArrows, Info, ListFilter, Play, SearchCode, ShieldCheck } from 'lucide-react';

import PageHeader from '../components/PageHeader.jsx';
import QueryCode from '../components/QueryCode.jsx';
import ResultTable from '../components/ResultTable.jsx';
import LoadingState, { Spinner } from '../components/LoadingState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import { getOperationCatalog, runComparison, runLogical, runOther } from '../services/operationService.js';
import { getErrorMessage } from '../services/api.js';

const TABS = [
  { key: 'comparison', label: 'Comparison Operators', icon: GitCompareArrows },
  { key: 'logical', label: 'Logical Operators', icon: ListFilter },
  { key: 'other', label: 'Other Queries', icon: SearchCode },
];

const DEFAULT_SELECTION = { comparison: 'gt', logical: 'and', other: 'find' };

// e.g. ('cgpa', '$gt', 8) -> db.students.find({ cgpa: { $gt: 8 } })  (same format the server uses)
function buildComparisonQuery(field, operator, value) {
  return `db.students.find({\n  ${field}: { ${operator}: ${value} }\n})`;
}

function SectionTitle({ children }) {
  return <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">{children}</h3>;
}

// Draws a logical query as blocks, e.g. [age ≥ 20] AND [cgpa ≥ 8]
function ConditionVisual({ operation }) {
  const [first, second] = operation.conditions;

  const condition = (text) => (
    <span
      key={text}
      className="rounded-md border border-slate-200 bg-white px-2.5 py-1 font-mono text-xs text-slate-800 shadow-sm"
    >
      {text}
    </span>
  );
  const keyword = (text) => (
    <span
      key={text}
      className="rounded-md bg-brand-700 px-2 py-1 text-xs font-semibold tracking-wide text-white"
    >
      {text}
    </span>
  );

  const parts = {
    and: [condition(first), keyword('AND'), condition(second)],
    or: [condition(first), keyword('OR'), condition(second)],
    nor: [keyword('NEITHER'), condition(first), keyword('NOR'), condition(second)],
    not: [keyword('NOT'), condition(first)],
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-3">{parts[operation.key]}</div>
  );
}

function QueryResult({ result, highlightFields }) {
  const noun = result.count === 1 ? 'student' : 'students';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          Results:
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-sm font-semibold text-brand-800 ring-1 ring-brand-600/20 ring-inset">
            {result.count} {noun}
          </span>
        </h3>
        <p className="text-xs text-slate-500">MongoDB answered in {result.durationMs} ms</p>
      </div>

      {result.resultType === 'count' ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-8 text-center">
          <p className="text-5xl font-semibold tracking-tight text-slate-900">{result.count}</p>
          <p className="mt-2 text-sm text-slate-500">
            {result.count === 1 ? 'document' : 'documents'} in the <span className="font-mono">students</span>{' '}
            collection
          </p>
        </div>
      ) : (
        <>
          {result.resultType === 'single' && (
            <p className="text-sm text-slate-500">findOne() returns a single document instead of a list.</p>
          )}
          <ResultTable students={result.data} highlightFields={highlightFields} />
        </>
      )}
    </div>
  );
}

export default function Operations() {
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState('comparison');
  const [selected, setSelected] = useState(DEFAULT_SELECTION);

  // Inputs for comparison operators
  const [field, setField] = useState('cgpa');
  const [value, setValue] = useState('8');

  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState('');
  const latestRequest = useRef(0); // ignore results from queries that were replaced

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getOperationCatalog();
      setCatalog(response.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  function clearResult() {
    latestRequest.current += 1;
    setResult(null);
    setRunError('');
    setRunning(false);
  }

  if (loading) {
    return (
      <>
        <PageHeader title="MongoDB Operations" />
        <div className="card">
          <LoadingState message="Loading MongoDB operations..." />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="MongoDB Operations" />
        <div className="card">
          <ErrorState title="Could not load MongoDB operations" message={error} onRetry={loadCatalog} />
        </div>
      </>
    );
  }

  const operations = catalog[activeTab];
  const operation = operations.find((item) => item.key === selected[activeTab]);
  const fieldDefinition = catalog.comparisonFields.find((item) => item.key === field);
  const isComparison = activeTab === 'comparison';

  const numericValue = value.trim() === '' ? NaN : Number(value);
  const valueIsValid = Number.isFinite(numericValue);

  const shellQuery = isComparison
    ? buildComparisonQuery(field, operation.operator, valueIsValid ? numericValue : '?')
    : operation.shellQuery;
  const explanation = isComparison
    ? `Find students whose ${fieldDefinition.noun} is ${operation.phrase} ${valueIsValid ? numericValue : '…'}.`
    : operation.explanation;
  const highlightFields = isComparison ? [field] : operation.fields;

  function selectTab(tabKey) {
    setActiveTab(tabKey);
    clearResult();
  }

  function selectOperation(key) {
    setSelected((current) => ({ ...current, [activeTab]: key }));
    if (isComparison && field === 'cgpa') {
      const next = operations.find((item) => item.key === key);
      setValue(String(next.defaultValue));
    }
    clearResult();
  }

  function handleFieldChange(event) {
    const nextField = catalog.comparisonFields.find((item) => item.key === event.target.value);
    setField(nextField.key);
    setValue(String(nextField.defaultValue ?? operation.defaultValue));
    clearResult();
  }

  async function executeQuery() {
    if (isComparison && !valueIsValid) {
      setRunError('Please enter a number to compare with.');
      return;
    }

    const requestNumber = ++latestRequest.current;
    setRunning(true);
    setRunError('');
    setResult(null);

    try {
      let response;
      if (activeTab === 'comparison')
        response = await runComparison(operation.key, { field, value: numericValue });
      else if (activeTab === 'logical') response = await runLogical(operation.key);
      else response = await runOther(operation.key);

      if (requestNumber === latestRequest.current) setResult(response);
    } catch (err) {
      if (requestNumber === latestRequest.current) setRunError(getErrorMessage(err));
    } finally {
      if (requestNumber === latestRequest.current) setRunning(false);
    }
  }

  return (
    <>
      <PageHeader
        title="MongoDB Operations"
        description="Run safe, predefined queries on the students collection and see exactly what MongoDB returns."
      />

      {/* Tabs */}
      <div className="mb-6 overflow-x-auto">
        <div
          className="inline-flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
          role="tablist"
        >
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={activeTab === key}
              onClick={() => selectTab(key)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === key
                  ? 'bg-brand-700 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        {/* Operator list */}
        <div className="grid grid-cols-2 content-start gap-2 sm:grid-cols-3 lg:grid-cols-1">
          {operations.map((item) => {
            const isActive = item.key === operation.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => selectOperation(item.key)}
                aria-pressed={isActive}
                className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                  isActive
                    ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span
                  className={`block font-mono text-sm font-semibold ${isActive ? 'text-brand-800' : 'text-slate-900'}`}
                >
                  {item.operator ?? item.method}
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">{item.name}</span>
              </button>
            );
          })}
        </div>

        {/* Selected operation */}
        <section className="card min-w-0">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-6 sm:flex-row sm:items-center">
            <span className="self-start rounded-lg bg-slate-900 px-3 py-2 font-mono text-lg font-semibold text-emerald-300">
              {operation.operator ?? operation.method}
            </span>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{operation.name}</h2>
              <p className="text-sm text-slate-500">{operation.description}</p>
            </div>
          </div>

          <div className="space-y-6 p-6">
            <div>
              <SectionTitle>Example</SectionTitle>
              <p className="text-sm text-slate-800">{explanation}</p>
            </div>

            {isComparison && (
              <div>
                <SectionTitle>Try your own value</SectionTitle>
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label htmlFor="operation-field" className="label">
                      Field
                    </label>
                    <select
                      id="operation-field"
                      value={field}
                      onChange={handleFieldChange}
                      className="input w-36"
                    >
                      {catalog.comparisonFields.map((item) => (
                        <option key={item.key} value={item.key}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <span
                    className="flex h-[38px] w-10 items-center justify-center rounded-lg bg-slate-100 font-mono text-lg text-slate-700"
                    aria-label={operation.name}
                  >
                    {operation.symbol}
                  </span>
                  <div>
                    <label htmlFor="operation-value" className="label">
                      Value
                    </label>
                    <input
                      id="operation-value"
                      type="number"
                      value={value}
                      min={fieldDefinition.min}
                      max={fieldDefinition.max}
                      step={fieldDefinition.step}
                      onChange={(event) => {
                        setValue(event.target.value);
                        clearResult();
                      }}
                      className="input w-28"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'logical' && (
              <div>
                <SectionTitle>Conditions</SectionTitle>
                <ConditionVisual operation={operation} />
              </div>
            )}

            <div>
              <SectionTitle>MongoDB query</SectionTitle>
              <QueryCode code={shellQuery} />
              {operation.note && (
                <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-500">
                  <Info className="mt-px h-3.5 w-3.5 shrink-0" />
                  {operation.note}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className="btn btn-primary" onClick={executeQuery} disabled={running}>
                {running ? <Spinner /> : <Play className="h-4 w-4" />}
                {running ? 'Running...' : 'Execute Query'}
              </button>
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <ShieldCheck className="h-4 w-4 text-brand-600" />
                Read-only query, predefined on the server
              </span>
            </div>
          </div>

          {(running || result || runError) && (
            <div className="border-t border-slate-100 p-6">
              {running && <LoadingState message="Running MongoDB query..." />}
              {runError && (
                <div
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  role="alert"
                >
                  {runError}
                </div>
              )}
              {result && <QueryResult result={result} highlightFields={highlightFields} />}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
