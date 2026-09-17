import { useState } from 'react';
import { Braces, ChevronDown, SearchX } from 'lucide-react';

import EmptyState from './EmptyState.jsx';
import { formatCgpa } from '../utils/format.js';

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'studentId', label: 'Student ID' },
  { key: 'branch', label: 'Branch' },
  { key: 'cgpa', label: 'CGPA' },
  { key: 'city', label: 'City' },
  { key: 'age', label: 'Age' },
];

function renderCell(student, key) {
  if (key === 'cgpa') return formatCgpa(student.cgpa);
  return student[key];
}

/**
 * Shows the documents returned by a MongoDB query.
 * `highlightFields` marks the columns the query filtered or sorted on, e.g. ['cgpa'].
 */
export default function ResultTable({ students, highlightFields = [] }) {
  const [showJson, setShowJson] = useState(false);

  if (students.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200">
        <EmptyState
          icon={SearchX}
          title="No matching documents"
          description="The query ran successfully but no student matched it."
        />
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {COLUMNS.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`table-head ${highlightFields.includes(column.key) ? 'bg-brand-50 text-brand-800' : ''}`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {students.map((student) => (
              <tr key={student._id} className="hover:bg-slate-50/70">
                {COLUMNS.map((column) => {
                  const highlighted = highlightFields.includes(column.key);
                  const base = column.key === 'name' ? 'font-medium text-slate-900' : '';
                  const mono = column.key === 'studentId' ? 'font-mono text-xs' : '';
                  const numeric = column.key === 'cgpa' || column.key === 'age' ? 'tabular-nums' : '';
                  return (
                    <td
                      key={column.key}
                      className={`table-cell ${base} ${mono} ${numeric} ${highlighted ? 'bg-brand-50/60 font-semibold text-brand-900' : ''}`}
                    >
                      {renderCell(student, column.key)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Optional raw documents, for learning what MongoDB actually returns */}
      <div className="mt-3">
        <button
          type="button"
          onClick={() => setShowJson((open) => !open)}
          className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-slate-600 hover:text-slate-900"
          aria-expanded={showJson}
        >
          <Braces className="h-4 w-4" />
          {showJson ? 'Hide JSON' : 'View JSON'}
          <ChevronDown className={`h-4 w-4 transition-transform ${showJson ? 'rotate-180' : ''}`} />
        </button>
        {showJson && (
          <pre className="mt-2 max-h-80 overflow-auto rounded-lg bg-slate-900 p-4 font-mono text-xs leading-relaxed text-slate-100">
            {JSON.stringify(students, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
