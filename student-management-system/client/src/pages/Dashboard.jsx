import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, CalendarCheck, RefreshCw, Sparkles, TrendingUp, Users } from 'lucide-react';

import StatCard from '../components/ui/StatCard.jsx';
import SectionCard from '../components/ui/SectionCard.jsx';
import { StatGridSkeleton, TableSkeleton, ListSkeleton, ChartSkeleton } from '../components/ui/Skeleton.jsx';
import BarList from '../components/charts/BarList.jsx';
import ColumnChart from '../components/charts/ColumnChart.jsx';
import InsightCard from '../components/InsightCard.jsx';
import Avatar from '../components/Avatar.jsx';
import AttendanceBadge from '../components/AttendanceBadge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import { useAnalytics } from '../hooks/useAnalytics.jsx';
import { formatCgpa, formatPercent, getGreeting } from '../utils/format.js';
import { LOW_ATTENDANCE_THRESHOLD } from '../utils/constants.js';

function RecentStudents({ students }) {
  if (students.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No students yet"
        description="Student records will appear here as they are added to the platform."
        action={
          <Link to="/students" className="btn btn-primary">
            Add a student
          </Link>
        }
        compact
      />
    );
  }

  return (
    <div className="scroll-x">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="th">Student</th>
            <th className="th">Programme</th>
            <th className="th">CGPA</th>
            <th className="th">Attendance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {students.map((student) => (
            <tr key={student._id} className="transition-colors hover:bg-slate-50/70">
              <td className="td">
                <Link to={`/students/${student._id}`} className="flex items-center gap-3">
                  <Avatar name={student.name} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-slate-900">{student.name}</span>
                    <span className="block font-mono text-[11px] text-slate-400">{student.studentId}</span>
                  </span>
                </Link>
              </td>
              <td className="td">
                <span className="block text-slate-700">{student.branch}</span>
                <span className="block text-[11px] text-slate-400">Semester {student.semester}</span>
              </td>
              <td className="td font-medium text-slate-900 tabular-nums">{formatCgpa(student.cgpa)}</td>
              <td className="td">
                <AttendanceBadge percentage={student.averageAttendance} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Dashboard() {
  const { data, loading, refreshing, error, refresh } = useAnalytics();

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const header = (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{getGreeting()}</h1>
        <p className="mt-1 text-sm text-slate-500">Here's an overview of your academic environment.</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden text-xs text-slate-400 sm:inline">{today}</span>
        <button type="button" className="btn btn-secondary" onClick={refresh} disabled={refreshing || loading}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
    </div>
  );

  if (error && !data) {
    return (
      <>
        {header}
        <div className="card">
          <ErrorState title="Could not load your dashboard" message={error} onRetry={refresh} />
        </div>
      </>
    );
  }

  if (loading || !data) {
    return (
      <>
        {header}
        <div className="space-y-5">
          <StatGridSkeleton />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <SectionCard title="Attendance by course" className="lg:col-span-2">
              <ListSkeleton rows={4} />
            </SectionCard>
            <SectionCard title="Academic performance">
              <ChartSkeleton />
            </SectionCard>
          </div>
          <div className="card">
            <TableSkeleton rows={5} columns={5} />
          </div>
        </div>
      </>
    );
  }

  const { overview, attendance, performance, insights, recentStudents } = data;

  const highAchievers = performance.bands
    .filter((band) => band.label.startsWith('8') || band.label.startsWith('9'))
    .reduce((sum, band) => sum + band.count, 0);

  const courseBars = attendance.byCourse
    .filter((course) => course.averageAttendance != null)
    .slice(0, 6)
    .map((course) => ({
      id: course.courseId,
      label: course.courseName,
      value: course.averageAttendance,
      note: `${course.enrolled} enrolled`,
      fill: course.averageAttendance < LOW_ATTENDANCE_THRESHOLD ? 'bg-status-critical' : 'bg-brand-600',
      tooltip: `${course.courseName}: ${formatPercent(course.averageAttendance)} average attendance across ${course.enrolled} students`,
    }));

  return (
    <>
      {header}

      <div className={`space-y-5 transition-opacity ${refreshing ? 'opacity-60' : ''}`}>
        {/* Headline figures */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total students"
            value={overview.totalStudents}
            indicator={
              overview.branches > 0
                ? `Across ${overview.branches} ${overview.branches === 1 ? 'branch' : 'branches'}`
                : 'No branches recorded'
            }
            icon={Users}
          />
          <StatCard
            label="Active courses"
            value={overview.totalCourses}
            indicator={`${overview.coursesWithAttendance} with attendance recorded`}
            icon={BookOpen}
          />
          <StatCard
            label="Average attendance"
            value={formatPercent(overview.averageAttendance)}
            indicator={
              overview.studentsAtRisk > 0
                ? `${overview.studentsAtRisk} below the ${LOW_ATTENDANCE_THRESHOLD}% requirement`
                : overview.studentsTracked > 0
                  ? 'All tracked students meet the requirement'
                  : 'No attendance recorded yet'
            }
            indicatorTone={overview.studentsAtRisk > 0 ? 'critical' : 'good'}
            icon={CalendarCheck}
          />
          <StatCard
            label="Academic performance"
            value={overview.averageCgpa == null ? '—' : `${formatCgpa(overview.averageCgpa)}`}
            indicator={
              overview.totalStudents > 0
                ? `${highAchievers} of ${overview.totalStudents} at 8.0 CGPA or above`
                : 'No grades recorded'
            }
            icon={TrendingUp}
          />
        </div>

        {/* Analytics */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <SectionCard
            title="Attendance by course"
            subtitle={`Average attendance per course · ${LOW_ATTENDANCE_THRESHOLD}% required`}
            className="lg:col-span-2"
            action={
              <Link
                to="/attendance"
                className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                View all
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          >
            <BarList
              items={courseBars}
              max={100}
              formatValue={(value) => formatPercent(value)}
              emptyMessage="No attendance has been recorded against any course yet."
            />
          </SectionCard>

          <SectionCard
            title="Academic performance"
            subtitle="Students by CGPA band"
            action={
              <Link
                to="/performance"
                className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                Details
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          >
            <ColumnChart bands={performance.bands} emptyMessage="No student grades recorded yet." />
          </SectionCard>
        </div>

        {/* Recent activity and derived alerts */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <SectionCard
            title="Recently added students"
            subtitle="The newest records on the platform"
            className="lg:col-span-2"
            flush
            action={
              <Link
                to="/students"
                className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                All students
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          >
            <RecentStudents students={recentStudents} />
          </SectionCard>

          <SectionCard
            title="Academic alerts"
            subtitle="Derived from your current records"
            action={
              <Link
                to="/insights"
                className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                All insights
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          >
            {insights.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="Nothing needs attention"
                description="Insights appear here as students, courses and attendance build up."
                compact
              />
            ) : (
              <div className="space-y-5">
                {insights.slice(0, 4).map((insight) => (
                  <InsightCard key={insight.id} insight={insight} compact />
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </>
  );
}
