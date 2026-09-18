import { LOW_ATTENDANCE_THRESHOLD } from './constants.js';

export function formatCgpa(value) {
  return value == null ? '—' : Number(value).toFixed(2);
}

export function formatPercent(value, digits = 1) {
  if (value == null) return '—';
  return `${Number(Number(value).toFixed(digits))}%`;
}

export function formatNumber(value) {
  return value == null ? '—' : Number(value).toLocaleString('en-IN');
}

export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// "3 days ago", "just now" — used for activity timelines
export function formatRelative(value) {
  if (!value) return '—';
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diff / 60000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;

  const days = Math.round(hours / 24);
  if (days < 30) return `${days} ${days === 1 ? 'day' : 'days'} ago`;

  return formatDate(value);
}

// "Aayushi Bansal" -> "AB"
export function getInitials(name = '') {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('') || '?'
  );
}

// Time-of-day greeting for the dashboard
export function getGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/*
 * Attendance status. The colour is always paired with the label in the UI,
 * so meaning never depends on colour alone.
 */
export function getAttendanceStatus(percentage) {
  if (percentage == null) return { key: 'none', label: 'Not tracked', badge: 'badge-neutral', fill: 'bg-slate-300' };
  if (percentage >= 85) return { key: 'good', label: 'Good', badge: 'badge-good', fill: 'bg-status-good' };
  if (percentage >= LOW_ATTENDANCE_THRESHOLD)
    return { key: 'average', label: 'Average', badge: 'badge-warning', fill: 'bg-status-warning' };
  return { key: 'low', label: 'At risk', badge: 'badge-critical', fill: 'bg-status-critical' };
}

// Academic standing derived from CGPA
export function getPerformanceStatus(cgpa) {
  if (cgpa == null) return { label: 'Not graded', badge: 'badge-neutral' };
  if (cgpa >= 9) return { label: 'Outstanding', badge: 'badge-good' };
  if (cgpa >= 8) return { label: 'Excellent', badge: 'badge-good' };
  if (cgpa >= 7) return { label: 'Good', badge: 'badge-brand' };
  if (cgpa >= 6) return { label: 'Satisfactory', badge: 'badge-warning' };
  return { label: 'Needs attention', badge: 'badge-critical' };
}
