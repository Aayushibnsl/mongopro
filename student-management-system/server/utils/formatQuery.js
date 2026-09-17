// Turns a JavaScript query object into the mongosh-style text shown on the
// MongoDB Operations page, e.g. { cgpa: { $gt: 8 } } -> "{ cgpa: { $gt: 8 } }".
// Because the text is generated from the same object that is executed,
// the query you see is always exactly the query that runs.

const MAX_INLINE_LENGTH = 40;

export function formatInline(value) {
  if (Array.isArray(value)) {
    return `[ ${value.map(formatInline).join(', ')} ]`;
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value).map(([key, item]) => `${key}: ${formatInline(item)}`);
    return entries.length ? `{ ${entries.join(', ')} }` : '{}';
  }
  return typeof value === 'string' ? `"${value}"` : String(value);
}

function formatMultiline(value, depth) {
  const indent = '  '.repeat(depth + 1);
  const closingIndent = '  '.repeat(depth);

  const lines = Array.isArray(value)
    ? value.map((item) => `${indent}${formatValue(item, depth + 1)}`)
    : Object.entries(value).map(([key, item]) => `${indent}${key}: ${formatValue(item, depth + 1)}`);

  const [open, close] = Array.isArray(value) ? ['[', ']'] : ['{', '}'];
  return `${open}\n${lines.join(',\n')}\n${closingIndent}${close}`;
}

function formatValue(value, depth) {
  const inline = formatInline(value);
  const isObject = value !== null && typeof value === 'object';
  return !isObject || inline.length <= MAX_INLINE_LENGTH ? inline : formatMultiline(value, depth);
}

export function formatQuery(query) {
  // An empty filter {} matches every document
  if (Object.keys(query).length === 0) return '{}';
  return formatMultiline(query, 0);
}
