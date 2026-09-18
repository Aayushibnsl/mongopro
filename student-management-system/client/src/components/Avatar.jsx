import { getInitials } from '../utils/format.js';

const SIZES = {
  xs: 'h-7 w-7 text-[10px]',
  sm: 'h-9 w-9 text-xs',
  lg: 'h-16 w-16 text-xl',
};

export default function Avatar({ name, size = 'sm', className = '' }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-brand-50 font-semibold text-brand-700 ring-1 ring-brand-100 ring-inset ${SIZES[size]} ${className}`}
      aria-hidden="true"
    >
      {getInitials(name)}
    </span>
  );
}
