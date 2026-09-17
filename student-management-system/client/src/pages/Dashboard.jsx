import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Award, BookOpen, CalendarCheck, CloudUpload, Users } from 'lucide-react';

import PageHeader from '../components/PageHeader.jsx';
import StatCard from '../components/StatCard.jsx';
import ChartCard from '../components/ChartCard.jsx';
import BranchChart from '../components/BranchChart.jsx';
import CgpaChart from '../components/CgpaChart.jsx';
import AttendanceOverview from '../components/AttendanceOverview.jsx';
import DatabaseStatus from '../components/DatabaseStatus.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Avatar from '../components/Avatar.jsx';
import LoadingState from '../components/LoadingState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useToast } from '../components/Toast.jsx';
import { getDashboard, getDatabaseStatus, syncAllRecords } from '../services/dashboardService.js';
import { getErrorMessage } from '../services/api.js';
import { formatCgpa, formatDate, formatPercent } from '../utils/format.js';

function RecentStudents({ students }) {
  if (students.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No students found."
        description="Run npm run seed in the server folder, or add a student."
        action={
          <Link to="/students" className="btn btn-primary">
            Go to students
          </Link>
        }
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead>
          <tr>
            <th className="table-head">Name</th>
            <th className="table-head">Student ID</th>
            <th className="table-head">Branch</th>
            <th className="table-head">Semester</th>
            <th className="table-head">CGPA</th>
            <th className="table-head">City</th>
            <th className="table-head">Added</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {students.map((student) => (
            <tr key={student._id}>
              <td className="table-cell">
                <div className="flex items-center gap-3">
                  <Avatar name={student.name} />
                  <span className="font-medium text-slate-900">{student.name}</span>
                </div>
              </td>
              <td className="table-cell font-mono text-xs">{student.studentId}</td>
              <td className="table-cell">{student.branch}</td>
              <td className="table-cell">{student.semester}</td>
              <td className="table-cell font-medium text-slate-900 tabular-nums">
                {formatCgpa(student.cgpa)}
              </td>
              <td className="table-cell">{student.city}</td>
              <td className="table-cell text-slate-500">{formatDate(student.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Dashboard() {
  const toast = useToast();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [dbStatus, setDbStatus] = useState(null);
  const [dbStatusError, setDbStatusError] = useState('');
  const [refreshingStatus, setRefreshingStatus] = useState(false);

  const [confirmSyncAll, setConfirmSyncAll] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getDashboard();
      setStats(response.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStatus = useCallback(async () => {
    setRefreshingStatus(true);
    try {
      const response = await getDatabaseStatus();
      setDbStatus(response.data);
      setDbStatusError('');
    } catch (err) {
      setDbStatus(null);
      setDbStatusError(getErrorMessage(err));
    } finally {
      setRefreshingStatus(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadStatus();
  }, [loadStats, loadStatus]);

  function refreshAll() {
    loadStats();
    loadStatus();
  }

  async function handleSyncAll() {
    setSyncingAll(true);
    try {
      const response = await syncAllRecords();
      toast.success('Synced with professor database', response.message);
    } catch (err) {
      toast.error('Professor database synchronization failed', getErrorMessage(err));
    } finally {
      setSyncingAll(false);
      setConfirmSyncAll(false);
      loadStatus();
    }
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="An overview of the students, courses and attendance stored in MongoDB Atlas."
      />

      <div className="space-y-6">
        <DatabaseStatus
          status={dbStatus}
          error={dbStatusError}
          refreshing={refreshingStatus}
          syncing={syncingAll}
          onRefresh={refreshAll}
          onSyncAll={() => setConfirmSyncAll(true)}
        />

        {loading && !stats && (
          <div className="card">
            <LoadingState message="Loading dashboard..." />
          </div>
        )}

        {!loading && error && (
          <div className="card">
            <ErrorState title="Could not load the dashboard" message={error} onRetry={refreshAll} />
          </div>
        )}

        {stats && !error && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Total Students"
                value={stats.totalStudents}
                hint="Documents in students"
                icon={Users}
              />
              <StatCard
                label="Total Courses"
                value={stats.totalCourses}
                hint="Documents in courses"
                icon={BookOpen}
              />
              <StatCard
                label="Average CGPA"
                value={formatCgpa(stats.averageCgpa)}
                hint="Calculated with $avg"
                icon={Award}
              />
              <StatCard
                label="Average Attendance"
                value={formatPercent(stats.averageAttendance)}
                hint={`Across ${stats.totalAttendanceRecords} attendance records`}
                icon={CalendarCheck}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <ChartCard
                title="Branch distribution"
                description="Students per branch"
                footer="Grouped with the aggregation stage $group."
              >
                <BranchChart branches={stats.branchDistribution} totalStudents={stats.totalStudents} />
              </ChartCard>
              <ChartCard
                title="CGPA overview"
                description="Number of students in each CGPA range"
                footer="Counted with countDocuments() and the $gte / $lt operators."
              >
                <CgpaChart bands={stats.cgpaOverview} />
              </ChartCard>
              <ChartCard
                title="Attendance overview"
                description="Attendance records grouped by percentage"
                footer="Each record is one student's attendance in one course."
              >
                <AttendanceOverview
                  bands={stats.attendanceOverview}
                  totalRecords={stats.totalAttendanceRecords}
                />
              </ChartCard>
            </div>

            <section className="card">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Recent students</h2>
                  <p className="mt-0.5 text-xs text-slate-500">The 5 newest documents, sorted by createdAt</p>
                </div>
                <Link
                  to="/students"
                  className="flex shrink-0 items-center gap-1 text-sm font-medium whitespace-nowrap text-brand-700 hover:text-brand-800"
                >
                  View all
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <RecentStudents students={stats.recentStudents} />
            </section>
          </>
        )}
      </div>

      {confirmSyncAll && (
        <ConfirmDialog
          title="Sync all records to the professor database?"
          variant="primary"
          icon={CloudUpload}
          confirmLabel="Sync all records"
          loadingLabel="Syncing..."
          loading={syncingAll}
          onConfirm={handleSyncAll}
          onCancel={() => setConfirmSyncAll(false)}
          message={
            <>
              <p>
                Every student, course and attendance record in{' '}
                <span className="font-mono">student_management</span> will be copied to{' '}
                <span className="font-mono">PCEA24CY002</span>.
              </p>
              <p>Existing copies are updated, no duplicates are created, and nothing is deleted.</p>
            </>
          }
        />
      )}
    </>
  );
}
