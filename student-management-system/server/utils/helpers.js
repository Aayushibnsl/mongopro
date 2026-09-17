// Copy only the allowed fields from the request body.
// This stops the browser from setting fields like _id, createdAt or source.
export function pickFields(body, allowedFields) {
  const source = body || {};
  const result = {};

  for (const field of allowedFields) {
    if (source[field] !== undefined) result[field] = source[field];
  }
  return result;
}

// Escape special characters so a search like "C++" is treated as plain text in a RegExp.
export function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Query string values should be plain strings (not arrays or objects).
export function readString(value) {
  return typeof value === 'string' ? value : '';
}

export function readPositiveInt(value, fallback) {
  const number = Number.parseInt(value, 10);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

export function roundTo2(value) {
  return Math.round(value * 100) / 100;
}
