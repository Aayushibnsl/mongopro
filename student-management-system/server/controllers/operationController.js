import Student from '../models/Student.js';
import { formatQuery, formatInline } from '../utils/formatQuery.js';
import { readString } from '../utils/helpers.js';

/*
 * SAFE, PREDEFINED QUERIES ONLY
 * -----------------------------
 * The browser only sends the NAME of an operation (for example "gt").
 * For comparison operators it may also pick a field from a fixed list and a number.
 * It can never send its own MongoDB code, so nothing unexpected can run.
 */

// ---------------------------------------------------------------------------
// 1. Comparison operators: $lt, $gt, $lte, $gte, $eq
// ---------------------------------------------------------------------------

const COMPARISON_OPERATORS = {
  lt: {
    operator: '$lt',
    name: 'Less Than',
    symbol: '<',
    phrase: 'less than',
    description: 'Matches documents where the field value is less than the given value.',
    defaultValue: 8,
  },
  gt: {
    operator: '$gt',
    name: 'Greater Than',
    symbol: '>',
    phrase: 'greater than',
    description: 'Matches documents where the field value is greater than the given value.',
    defaultValue: 8,
  },
  lte: {
    operator: '$lte',
    name: 'Less Than or Equal To',
    symbol: '≤',
    phrase: 'less than or equal to',
    description: 'Matches documents where the field value is less than or equal to the given value.',
    defaultValue: 8,
  },
  gte: {
    operator: '$gte',
    name: 'Greater Than or Equal To',
    symbol: '≥',
    phrase: 'greater than or equal to',
    description: 'Matches documents where the field value is greater than or equal to the given value.',
    defaultValue: 9,
  },
  eq: {
    operator: '$eq',
    name: 'Equal To',
    symbol: '=',
    phrase: 'equal to',
    description: 'Matches documents where the field value is exactly equal to the given value.',
    defaultValue: 9,
  },
};

// The only numeric fields a comparison query may use.
// defaultValue null means "use the operator's default value" (the CGPA examples above).
const COMPARISON_FIELDS = {
  cgpa: { label: 'CGPA', noun: 'CGPA', min: 0, max: 10, step: 0.1, defaultValue: null },
  age: { label: 'Age', noun: 'age', min: 15, max: 60, step: 1, defaultValue: 20 },
  semester: { label: 'Semester', noun: 'semester', min: 1, max: 8, step: 1, defaultValue: 5 },
};

// ---------------------------------------------------------------------------
// 2. Logical operators: $and, $or, $nor, $not
// ---------------------------------------------------------------------------

const LOGICAL_OPERATORS = {
  and: {
    operator: '$and',
    name: 'AND',
    description: 'Matches documents that satisfy ALL of the conditions.',
    explanation: 'Find students aged 20 or above AND with a CGPA of 8 or more.',
    conditions: ['age ≥ 20', 'cgpa ≥ 8'],
    fields: ['age', 'cgpa'],
    query: { $and: [{ age: { $gte: 20 } }, { cgpa: { $gte: 8 } }] },
  },
  or: {
    operator: '$or',
    name: 'OR',
    description: 'Matches documents that satisfy AT LEAST ONE of the conditions.',
    explanation: 'Find students who live in Jaipur OR have a CGPA of 9 or more.',
    conditions: ['city = "Jaipur"', 'cgpa ≥ 9'],
    fields: ['city', 'cgpa'],
    query: { $or: [{ city: 'Jaipur' }, { cgpa: { $gte: 9 } }] },
  },
  nor: {
    operator: '$nor',
    name: 'NOR',
    description: 'Matches documents that fail ALL of the conditions – the opposite of $or.',
    explanation: 'Find students who do NOT live in Jaipur AND do NOT have a CGPA above 9.',
    conditions: ['city = "Jaipur"', 'cgpa > 9'],
    fields: ['city', 'cgpa'],
    note: '$nor also matches documents where a field is missing.',
    query: { $nor: [{ city: 'Jaipur' }, { cgpa: { $gt: 9 } }] },
  },
  not: {
    operator: '$not',
    name: 'NOT',
    description: 'Inverts a condition – matches documents that do NOT match the expression.',
    explanation: 'Find students whose CGPA is NOT greater than 8.',
    conditions: ['cgpa > 8'],
    fields: ['cgpa'],
    note: '$not also matches documents that have no cgpa field at all.',
    query: { cgpa: { $not: { $gt: 8 } } },
  },
};

// ---------------------------------------------------------------------------
// 3. Other queries: find(), findOne(), countDocuments(), sort(), limit()
// ---------------------------------------------------------------------------

const OTHER_OPERATIONS = {
  find: {
    method: 'find()',
    command: 'find',
    name: 'Find documents',
    description: 'find() returns every document that matches a filter.',
    explanation: 'Find all Cyber Security students.',
    filter: { branch: 'Cyber Security' },
    fields: ['branch'],
  },
  findOne: {
    method: 'findOne()',
    command: 'findOne',
    name: 'Find one document',
    description: 'findOne() returns only the FIRST matching document, or null when nothing matches.',
    explanation: 'Find the student whose Student ID is PCEA24CY002.',
    filter: { studentId: 'PCEA24CY002' },
    fields: ['studentId'],
  },
  countDocuments: {
    method: 'countDocuments()',
    command: 'countDocuments',
    name: 'Count documents',
    description:
      'countDocuments() returns how many documents match a filter. An empty filter {} counts all of them.',
    explanation: 'Count all students in the collection.',
    filter: {},
  },
  sort: {
    method: 'sort()',
    command: 'find',
    name: 'Sort results',
    description:
      'sort() orders the results. 1 means ascending (low → high), -1 means descending (high → low).',
    explanation: 'Show the top CGPA students first (CGPA, highest first).',
    filter: {},
    sort: { cgpa: -1 },
    fields: ['cgpa'],
  },
  limit: {
    method: 'limit()',
    command: 'find',
    name: 'Limit results',
    description: 'limit() returns at most the given number of documents.',
    explanation: 'Show only the first 5 students.',
    filter: {},
    limit: 5,
  },
};

// Builds the text shown in the UI from the same values that are executed
function buildShellQuery({ command, filter, sort, limit }) {
  const filterText = command === 'find' && Object.keys(filter).length === 0 ? '' : formatQuery(filter);
  let text = `db.students.${command}(${filterText})`;
  if (sort) text += `.sort(${formatInline(sort)})`;
  if (limit) text += `.limit(${limit})`;
  return text;
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

// GET /api/operations – everything the Operations page needs to draw itself
export function getOperationCatalog(req, res) {
  res.json({
    success: true,
    data: {
      comparison: Object.entries(COMPARISON_OPERATORS).map(([key, operation]) => ({ key, ...operation })),
      comparisonFields: Object.entries(COMPARISON_FIELDS).map(([key, field]) => ({ key, ...field })),
      logical: Object.entries(LOGICAL_OPERATORS).map(([key, { query, ...operation }]) => ({
        key,
        ...operation,
        shellQuery: `db.students.find(${formatQuery(query)})`,
      })),
      other: Object.entries(OTHER_OPERATIONS).map(([key, operation]) => ({
        key,
        method: operation.method,
        name: operation.name,
        description: operation.description,
        explanation: operation.explanation,
        fields: operation.fields ?? [],
        shellQuery: buildShellQuery(operation),
      })),
    },
  });
}

// GET /api/operations/comparison/:operator?field=cgpa&value=8
export async function runComparisonOperator(req, res) {
  const { operator } = req.params;

  // Object.hasOwn makes sure only our own keys are accepted (not things like "constructor")
  if (!Object.hasOwn(COMPARISON_OPERATORS, operator)) {
    return res.status(404).json({ success: false, message: `Unknown comparison operator "${operator}"` });
  }

  const fieldKey = readString(req.query.field) || 'cgpa';
  if (!Object.hasOwn(COMPARISON_FIELDS, fieldKey)) {
    return res.status(400).json({ success: false, message: 'Field must be one of: cgpa, age, semester' });
  }

  const definition = COMPARISON_OPERATORS[operator];
  const field = COMPARISON_FIELDS[fieldKey];
  const rawValue = readString(req.query.value).trim();
  const value = rawValue === '' ? (field.defaultValue ?? definition.defaultValue) : Number(rawValue);

  if (!Number.isFinite(value)) {
    return res.status(400).json({ success: false, message: 'Please enter a valid number' });
  }

  // e.g. { cgpa: { $gt: 8 } }
  const query = { [fieldKey]: { [definition.operator]: value } };

  const startedAt = Date.now();
  const students = await Student.find(query).lean();

  res.json({
    success: true,
    operation: {
      key: operator,
      operator: definition.operator,
      name: definition.name,
      explanation: `Find students whose ${field.noun} is ${definition.phrase} ${value}.`,
      shellQuery: `db.students.find(${formatQuery(query)})`,
    },
    resultType: 'list',
    count: students.length,
    durationMs: Date.now() - startedAt,
    data: students,
  });
}

// GET /api/operations/logical/:operator
export async function runLogicalOperator(req, res) {
  const { operator } = req.params;

  if (!Object.hasOwn(LOGICAL_OPERATORS, operator)) {
    return res.status(404).json({ success: false, message: `Unknown logical operator "${operator}"` });
  }

  const { query, ...definition } = LOGICAL_OPERATORS[operator];

  const startedAt = Date.now();
  const students = await Student.find(query).lean();

  res.json({
    success: true,
    operation: { key: operator, ...definition, shellQuery: `db.students.find(${formatQuery(query)})` },
    resultType: 'list',
    count: students.length,
    durationMs: Date.now() - startedAt,
    data: students,
  });
}

// GET /api/operations/other/:operation   (find, findOne, countDocuments, sort, limit)
export async function runOtherOperation(req, res) {
  const { operation } = req.params;

  if (!Object.hasOwn(OTHER_OPERATIONS, operation)) {
    return res.status(404).json({ success: false, message: `Unknown operation "${operation}"` });
  }

  const definition = OTHER_OPERATIONS[operation];
  const startedAt = Date.now();
  let result;

  if (definition.command === 'countDocuments') {
    const count = await Student.countDocuments(definition.filter);
    result = { resultType: 'count', count, data: [] };
  } else if (definition.command === 'findOne') {
    const student = await Student.findOne(definition.filter).lean();
    result = { resultType: 'single', count: student ? 1 : 0, data: student ? [student] : [] };
  } else {
    let query = Student.find(definition.filter);
    if (definition.sort) query = query.sort(definition.sort);
    if (definition.limit) query = query.limit(definition.limit);
    const students = await query.lean();
    result = { resultType: 'list', count: students.length, data: students };
  }

  res.json({
    success: true,
    operation: {
      key: operation,
      method: definition.method,
      name: definition.name,
      explanation: definition.explanation,
      shellQuery: buildShellQuery(definition),
    },
    ...result,
    durationMs: Date.now() - startedAt,
  });
}
