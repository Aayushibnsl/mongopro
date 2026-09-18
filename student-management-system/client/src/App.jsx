import { Link, Route, Routes } from 'react-router-dom';
import { Compass } from 'lucide-react';

import AppShell from './components/layout/AppShell.jsx';
import EmptyState from './components/EmptyState.jsx';
import { AnalyticsProvider } from './hooks/useAnalytics.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Students from './pages/Students.jsx';
import StudentProfile from './pages/StudentProfile.jsx';
import Courses from './pages/Courses.jsx';
import Attendance from './pages/Attendance.jsx';
import Performance from './pages/Performance.jsx';
import Insights from './pages/Insights.jsx';
import Settings from './pages/Settings.jsx';

function NotFound() {
  return (
    <div className="card">
      <EmptyState
        icon={Compass}
        title="Page not found"
        description="The page you are looking for doesn't exist or has moved."
        action={
          <Link to="/" className="btn btn-primary">
            Back to dashboard
          </Link>
        }
      />
    </div>
  );
}

export default function App() {
  return (
    <AnalyticsProvider>
      <AppShell>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/students" element={<Students />} />
          <Route path="/students/:id" element={<StudentProfile />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/performance" element={<Performance />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppShell>
    </AnalyticsProvider>
  );
}
