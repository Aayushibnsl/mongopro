import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu } from 'lucide-react';

import GlobalSearch from './GlobalSearch.jsx';
import { Brand } from './Sidebar.jsx';
import { getSystemStatus } from '../../services/systemService.js';

/*
 * A live, honest system indicator: it reflects the real state of the platform's
 * data services rather than a decorative badge. It links to Settings, where the
 * detail lives.
 */
function SystemStatusPill() {
  const [state, setState] = useState('checking');

  useEffect(() => {
    let ignore = false;

    getSystemStatus()
      .then((response) => {
        if (ignore) return;
        const { primary, sir } = response.data;
        if (primary.status !== 'connected') setState('offline');
        else if (sir.status !== 'connected') setState('degraded');
        else setState('operational');
      })
      .catch(() => {
        if (!ignore) setState('offline');
      });

    return () => {
      ignore = true;
    };
  }, []);

  const config = {
    checking: { dot: 'bg-slate-300', label: 'Checking' },
    operational: { dot: 'bg-status-good', label: 'All systems normal' },
    degraded: { dot: 'bg-status-warning', label: 'Partially degraded' },
    offline: { dot: 'bg-status-critical', label: 'Service issue' },
  }[state];

  return (
    <Link
      to="/settings"
      className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
      title="Open system status"
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${config.dot}`} aria-hidden="true" />
      <span className="hidden whitespace-nowrap sm:inline">{config.label}</span>
      <span className="sr-only sm:hidden">System status: {config.label}</span>
    </Link>
  );
}

export default function Topbar({ onOpenMenu }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur-md">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onOpenMenu}
          className="icon-btn h-9 w-9 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="lg:hidden">
          <Brand />
        </div>

        {/* Search lives in the bar on desktop and in its own row on small screens */}
        <GlobalSearch className="hidden max-w-md flex-1 lg:block" />

        <div className="ml-auto flex items-center gap-1">
          <SystemStatusPill />
        </div>
      </div>

      <div className="border-t border-slate-100 px-4 py-2.5 sm:px-6 lg:hidden">
        <GlobalSearch />
      </div>
    </header>
  );
}
