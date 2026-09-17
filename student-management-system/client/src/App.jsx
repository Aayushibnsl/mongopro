import { Link, Route, Routes } from 'react-router-dom';
import { Compass } from 'lucide-react';

import Navbar from './components/Navbar.jsx';
import EmptyState from './components/EmptyState.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Students from './pages/Students.jsx';
import Courses from './pages/Courses.jsx';
import Attendance from './pages/Attendance.jsx';
import Operations from './pages/Operations.jsx';

function NotFound() {
  return (
    <div className="card">
      <EmptyState
        icon={Compass}
        title="Page not found"
        description="The page you are looking for doesn't exist."
        action={
          <Link to="/" className="btn btn-primary">
            Go to dashboard
          </Link>
        }
      />
    </div>
  );
}

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/students" element={<Students />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/operations" element={<Operations />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <p>Student Management System · MongoDB Practical</p>
          <p>React · Express · Mongoose · MongoDB Atlas</p>
        </div>
      </footer>
    </div>
  );
}
