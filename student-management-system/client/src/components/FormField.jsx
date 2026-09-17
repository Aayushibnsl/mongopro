// Label + input + error message, used by every form
export default function FormField({
  label,
  htmlFor,
  error,
  hint,
  optional = false,
  className = '',
  children,
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="label">
        {label}
        {optional && <span className="ml-1 font-normal text-slate-400">(optional)</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-red-600">{error}</p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
}

// Adds the red border when a field has an error
export function inputClass(error) {
  return error ? 'input input-error' : 'input';
}
