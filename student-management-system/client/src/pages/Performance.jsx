import { Link } from 'react-router-dom';
import { Award, GraduationCap, TrendingUp, TriangleAlert, Users } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import SectionCard from '../components/ui/SectionCard.jsx';
import { StatGridSkeleton, ListSkeleton, ChartSkeleton, TableSkeleton } from '../components/ui/Skeleton.jsx';
import BarList from '../components/charts/BarList.jsx';
import ColumnChart from '../components/charts/ColumnChart.jsx';
import Avatar from '../components/Avatar.jsx';
import AttendanceBadge from '../components/AttendanceBadge.jsx';
import ErrorState from '../components/ErrorState.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useAnalytics } from '../hooks/useAnalytics.jsx';
import { formatCgpa, formatPercent, getPerformanceStatus } from '../utils/format.js';

function StudentRow({ student, trailing }) {
  return (
    <tr className="transition-colors hover:bg-slate-50/70">
      <td className="td">
        <Link to={`/students/${student._id}`} className="flex items-center gap-3">
          <Avatar name={student.name} />
          <span className="min-w-0">
            <span className="block truncate font-medium text-slate-900">{student.name}</span>
            <span className="block truncate text-[11px] text-slate-400">
              {student.branch} · Semester {student.semester}
            </span>
          </span>
        </Link>
      </td>
      <td className="td font-medium text-slate-900 tabular-nums">{formatCgpa(student.cgpa)}</td>
      <td className="td">{trailing}</td>
    </tr>
  );
}

export default function Performance() {
  const { data, loading, refreshing, error, refresh } = useAnalytics();

  const header = (
    <PageHeader
      title="Academic Performance"
      description="How students are performing across branches, semesters and grade bands."
    />
  );

  if (error && !data) {
    return (
      <>
        {header}
        <div className="card">
          <ErrorState title="Could not load performance data" message={error} onRetry={refresh} />
        </div>
      </>
    );
  }

  if (loading || !data) {
    return (
      <>
        {header}
        <StatGridSkeleton />
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <SectionCard title="Performance distribution">
            <ChartSkeleton />
          </SectionCard>
          <SectionCard title="Average CGPA by branch">
            <ListSkeleton rows={4} />
          </SectionCard>
        </div>
      </>
    );
  }

  const { overview, performance } = data;

  const highAchievers = performance.bands
    .filter((band) => band.label.startsWith('8') || band.label.startsWith('9'))
    .reduce((sum, band) => sum + band.count, 0);

  const topPerformer = performance.topPerformers[0];

  const branchBars = performance.byBranch.map((item) => ({
    id: item.branch,
    label: item.branch,
    value: item.averageCgpa,
    note: `${item.students} ${item.students === 1 ? 'student' : 'students'}`,
    tooltip: `${item.branch}: ${formatCgpa(item.averageCgpa)} average CGPA across ${item.students} students`,
  }));

  const semesterBars = performance.bySemester.map((item) => ({
    id: item.semester,
    label: `Semester ${item.semester}`,
    value: item.averageCgpa,
    note: `${item.students} ${item.students === 1 ? 'student' : 'students'}`,
    tooltip: `Semester ${item.semester}: ${formatCgpa(item.averageCgpa)} average CGPA`,
  }));

  if (overview.totalStudents === 0) {
    return (
      <>
        {header}
        <div className="card">
          <EmptyState
            icon={GraduationCap}
            title="No academic data yet"
            description="Performance analytics appear once students have been added to the platform."
            action={
              <Link to="/students" className="btn btn-primary">
                Add a student
              </Link>
            }
          />
        </div>
      </>
    );
  }

  return (
    <>
      {header}

      <div className={`space-y-5 transition-opacity ${refreshing ? 'opacity-60' : ''}`}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Average CGPA"
            value={formatCgpa(overview.averageCgpa)}
            indicator={`Across ${overview.totalStudents} ${overview.totalStudents === 1 ? 'student' : 'students'}`}
            icon={TrendingUp}
          />
          <StatCard
            label="High achievers"
            value={highAchievers}
            indicator={`${formatPercent((highAchievers / overview.totalStudents) * 100, 0)} at 8.0 CGPA or above`}
            indicatorTone="good"
            icon={Award}
          />
          <StatCard
            label="Top performer"
            value={topPerformer ? formatCgpa(topPerformer.cgpa) : '—'}
            indicator={topPerformer ? topPerformer.name : 'No grades recorded'}
            icon={GraduationCap}
          />
          <StatCard
            label="Needs attention"
            value={performance.needsAttention.length}
            indicator="Low CGPA or low attendance"
            indicatorTone={performance.needsAttention.length > 0 ? 'warning' : 'good'}
            icon={TriangleAlert}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <SectionCard
            title="Performance distribution"
            subtitle="Number of students in each CGPA band"
            footer="Bands are calculated from the CGPA recorded on each student."
          >
            <ColumnChart bands={performance.bands} emptyMessage="No grades recorded yet." />
          </SectionCard>

          <SectionCard title="Average CGPA by branch" subtitle="Out of 10.00">
            <BarList
              items={branchBars}
              max={10}
              formatValue={(value) => formatCgpa(value)}
              emptyMessage="No branches recorded yet."
            />
          </SectionCard>
        </div>

        {semesterBars.length > 1 && (
          <SectionCard title="Average CGPA by semester" subtitle="Out of 10.00">
            <BarList items={semesterBars} max={10} formatValue={(value) => formatCgpa(value)} />
          </SectionCard>
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <SectionCard title="Top performers" subtitle="Highest CGPA on record" flush>
            {performance.topPerformers.length === 0 ? (
              <EmptyState title="No grades recorded yet" compact />
            ) : (
              <div className="scroll-x">
                <table className="min-w-full">
                  <thead className="bg-slate-50/60">
                    <tr>
                      <th className="th">Student</th>
                      <th className="th">CGPA</th>
                      <th className="th">Attendance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {performance.topPerformers.map((student) => (
                      <StudentRow
                        key={student.studentId}
                        student={student}
                        trailing={<AttendanceBadge percentage={student.averageAttendance} />}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Students needing attention"
            subtitle="Below 7.0 CGPA or below the attendance requirement"
            flush
          >
            {performance.needsAttention.length === 0 ? (
              <EmptyState
                title="Nobody needs follow-up"
                description="Every student is meeting both the academic and attendance requirements."
                compact
              />
            ) : (
              <div className="scroll-x">
                <table className="min-w-full">
                  <thead className="bg-slate-50/60">
                    <tr>
                      <th className="th">Student</th>
                      <th className="th">CGPA</th>
                      <th className="th">Standing</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {performance.needsAttention.map((student) => {
                      const standing = getPerformanceStatus(student.cgpa);
                      return (
                        <StudentRow
                          key={student.studentId}
                          student={student}
                          trailing={<span className={`badge ${standing.badge}`}>{standing.label}</span>}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </>
  );
}
