import { NavLink, Link } from 'react-router-dom';
import {
  BookOpen,
  CalendarCheck,
  GraduationCap,
  LayoutDashboard,
  Settings,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';

import { APP_NAME, APP_TAGLINE } from '../../utils/constants.js';

export const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/students', label: 'Students', icon: Users },
  { to: '/courses', label: 'Courses', icon: BookOpen },
  { to: '/attendance', label: 'Attendance', icon: CalendarCheck },
  { to: '/performance', label: 'Academic Performance', icon: TrendingUp },
  { to: '/insights', label: 'Insights', icon: Sparkles },
];

const SECONDARY_ITEMS = [{ to: '/settings', label: 'Settings', icon: Settings }];

function itemClass({ isActive }) {
  const base =
    'group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors duration-150';
  return isActive
    ? `${base} bg-brand-50 text-brand-700`
    : `${base} text-slate-600 hover:bg-slate-100 hover:text-slate-900`;
}

export function Brand({ onClick }) {
  return (
    <Link to="/" className="flex items-center gap-2.5" onClick={onClick}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-brand-600 text-white shadow-[0_2px_6px_rgba(79,70,229,0.35)]">
        <GraduationCap className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="leading-tight">
        <span className="block text-[15px] font-semibold tracking-tight text-slate-900">{APP_NAME}</span>
        <span className="block text-[11px] text-slate-500">{APP_TAGLINE}</span>
      </span>
    </Link>
  );
}

function NavSection({ items, onNavigate }) {
  return (
    <nav className="space-y-0.5">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={itemClass} onClick={onNavigate}>
          {({ isActive }) => (
            <>
              <Icon
                className={`h-[18px] w-[18px] shrink-0 transition-colors ${isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600'}`}
                aria-hidden="true"
              />
              <span className="truncate">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function SidebarContent({ onNavigate }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center px-5">
        <Brand onClick={onNavigate} />
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        <NavSection items={NAV_ITEMS} onNavigate={onNavigate} />
      </div>

      <div className="shrink-0 border-t border-slate-100 px-3 py-3">
        <NavSection items={SECONDARY_ITEMS} onNavigate={onNavigate} />
      </div>
    </div>
  );
}

/**
 * Fixed navigation rail on large screens; a slide-over drawer below that.
 */
export default function Sidebar({ open, onClose }) {
  return (
    <>
      {/* Desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-slate-900/40" onClick={onClose} aria-hidden="true" />
          <aside className="absolute inset-y-0 left-0 w-[17rem] animate-rise border-r border-slate-200 bg-white shadow-xl">
            <button
              type="button"
              onClick={onClose}
              className="icon-btn absolute top-3.5 right-3"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={onClose} />
          </aside>
        </div>
      )}
    </>
  );
}
