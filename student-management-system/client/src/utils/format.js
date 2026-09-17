import { LOW_ATTENDANCE_THRESHOLD } from './constants.js';

export function formatCgpa(value) {
  return value == null ? '—' : Number(value).toFixed(2);
}

export function formatPercent(value) {
  return value == null ? '—' : `${Number(Number(value).toFixed(1))}%`;
}

export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// "Aayushi Bansal" -> "AB"
export function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

// Good (85%+), Average (75–84%), Low (below 75%)
export function getAttendanceStatus(percentage) {
  if (percentage >= 85) return { key: 'good', label: 'Good', barClass: 'bg-status-good' };
  if (percentage >= LOW_ATTENDANCE_THRESHOLD)
    return { key: 'average', label: 'Average', barClass: 'bg-status-warning' };
  return { key: 'low', label: 'Low', barClass: 'bg-status-critical' };
}
