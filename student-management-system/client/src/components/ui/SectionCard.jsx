// A titled panel. `flush` removes body padding for tables that run edge to edge.
export default function SectionCard({ title, subtitle, action, footer, flush = false, className = '', children }) {
  return (
    // min-w-0 lets an inner scrollable table stay inside its grid track
    // instead of stretching the whole page (grid items default to min-width:auto)
    <section className={`card flex min-w-0 flex-col ${className}`}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            {title && <h2 className="section-title">{title}</h2>}
            {subtitle && <p className="section-subtitle">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}

      <div className={flush ? 'flex-1' : 'flex-1 p-5'}>{children}</div>

      {footer && <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">{footer}</div>}
    </section>
  );
}
