import { getInitials } from '../utils/format.js';

const SIZES = {
  sm: 'h-8 w-8 text-xs',
  lg: 'h-14 w-14 text-lg',
};

export default function Avatar({ name, size = 'sm' }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-brand-50 font-semibold text-brand-700 ${SIZES[size]}`}
      aria-hidden="true"
    >
      {getInitials(name)}
    </span>
  );
}
