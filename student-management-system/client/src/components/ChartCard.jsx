export default function ChartCard({ title, description, footer, children }) {
  return (
    <section className="card flex flex-col p-5">
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </div>
      <div className="flex-1">{children}</div>
      {footer && <p className="mt-5 border-t border-slate-100 pt-3 text-xs text-slate-500">{footer}</p>}
    </section>
  );
}
