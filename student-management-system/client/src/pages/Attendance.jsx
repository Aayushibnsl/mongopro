import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CalendarCheck, Pencil, Plus, Search, TriangleAlert, Trash2, Users } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import SectionCard from '../components/ui/SectionCard.jsx';
import { StatGridSkeleton, TableSkeleton, ListSkeleton } from '../components/ui/Skeleton.jsx';
import BarList from '../components/charts/BarList.jsx';
import DistributionBar from '../components/charts/DistributionBar.jsx';
import AttendanceBadge from '../components/AttendanceBadge.jsx';
import Avatar from '../components/Avatar.jsx';
import ErrorState from '../components/ErrorState.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import AttendanceFormModal from '../components/AttendanceFormModal.jsx';
import { useToast } from '../components/Toast.jsx';
import { useAnalytics } from '../hooks/useAnalytics.jsx';
import { deleteAttendance, getAttendance } from '../services/attendanceService.js';
import { getCourses } from '../services/courseService.js';
import { getStudents } from '../services/studentService.js';
import { getErrorMessage } from '../services/api.js';
import { formatPercent } from '../utils/format.js';
import { LOW_ATTENDANCE_THRESHOLD } from '../utils/constants.js';

export default function Attendance() {
  const toast = useToast();
  const { data: analytics, loading: analyticsLoading, refresh: refreshAnalytics } = useAnalytics();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [courseId, setCourseId] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [search, setSearch] = useState('');

  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);

  const [formRecord, setFormRecord] = useState(null);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getStudents({ sortBy: 'name', order: 'asc', limit: 100 })
      .then((response) => setStudents(response.data))
      .catch(() => {});
    getCourses()
      .then((response) => setCourses(response.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let ignore = false;

    setLoading(true);
    setError('');
    getAttendance({ courseId: courseId || undefined, low: lowOnly || undefined })
      .then((response) => {
        if (!ignore) setRecords(response.data);
      })
      .catch((err) => {
        if (!ignore) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [courseId, lowOnly, reloadKey]);

  function reload() {
    setReloadKey((key) => key + 1);
    refreshAnalytics();
  }

  const visibleRecords = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return records;
    return records.filter(
      (record) =>
        record.studentName.toLowerCase().includes(term) || record.studentId.toLowerCase().includes(term)
    );
  }, [records, search]);

  const hasFilters = Boolean(courseId || lowOnly || search);

  function handleSaved() {
    setFormRecord(null);
    reload();
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const response = await deleteAttendance(recordToDelete._id);
      toast.success(response.message);
      toast.sync(response.sync);
      setRecordToDelete(null);
      reload();
    } catch (err) {
      toast.error('Could not remove record', getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  const overview = analytics?.overview;
  const attendanceData = analytics?.attendance;

  const courseBars = (attendanceData?.byCourse ?? [])
    .filter((course) => course.averageAttendance != null)
    .map((course) => ({
      id: course.courseId,
      label: course.courseName,
      value: course.averageAttendance,
      note: `${course.enrolled} enrolled`,
      fill: course.averageAttendance < LOW_ATTENDANCE_THRESHOLD ? 'bg-status-critical' : 'bg-brand-600',
      tooltip: `${course.courseName}: ${formatPercent(course.averageAttendance)} across ${course.enrolled} students`,
    }));

  return (
    <>
      <PageHeader
        title="Attendance"
        description={`Attendance across every course. Students below ${LOW_ATTENDANCE_THRESHOLD}% are flagged for follow-up.`}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setFormRecord({})}>
            <Plus className="h-4 w-4" />
            Record attendance
          </button>
        }
      />

      {/* Headline figures */}
      {analyticsLoading || !overview ? (
        <StatGridSkeleton />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Average attendance"
            value={formatPercent(overview.averageAttendance)}
            indicator={`Across ${overview.totalRecords} enrolment ${overview.totalRecords === 1 ? 'record' : 'records'}`}
            icon={CalendarCheck}
          />
          <StatCard
            label="Students at risk"
            value={overview.studentsAtRisk}
            indicator={
              overview.studentsAtRisk > 0
                ? `Below the ${LOW_ATTENDANCE_THRESHOLD}% requirement`
                : 'Everyone meets the requirement'
            }
            indicatorTone={overview.studentsAtRisk > 0 ? 'critical' : 'good'}
            icon={TriangleAlert}
          />
          <StatCard
            label="Students tracked"
            value={overview.studentsTracked}
            indicator={`Of ${overview.totalStudents} on the platform`}
            icon={Users}
          />
          <StatCard
            label="Courses tracked"
            value={overview.coursesWithAttendance}
            indicator={`Of ${overview.totalCourses} offered`}
            icon={BookOpen}
          />
        </div>
      )}

      {/* Analytics */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <SectionCard
          title="Attendance by course"
          subtitle="Average attendance per course"
          className="lg:col-span-2"
        >
          {analyticsLoading ? (
            <ListSkeleton rows={5} />
          ) : (
            <BarList
              items={courseBars}
              max={100}
              formatValue={(value) => formatPercent(value)}
              emptyMessage="No attendance has been recorded against any course yet."
            />
          )}
        </SectionCard>

        <SectionCard title="Attendance distribution" subtitle="How enrolment records are spread">
          {analyticsLoading ? (
            <ListSkeleton rows={3} />
          ) : (
            <DistributionBar bands={attendanceData?.bands ?? []} total={overview?.totalRecords ?? 0} />
          )}
        </SectionCard>
      </div>

      {/* Students needing follow-up */}
      {!analyticsLoading && (attendanceData?.atRisk?.length ?? 0) > 0 && (
        <SectionCard
          className="mt-5"
          title="Students requiring attention"
          subtitle={`Averaging below the ${LOW_ATTENDANCE_THRESHOLD}% requirement across their courses`}
          flush
        >
          <div className="scroll-x">
            <table className="min-w-full">
              <tbody className="divide-y divide-slate-50">
                {attendanceData.atRisk.map((student) => (
                  <tr key={student.studentId} className="transition-colors hover:bg-slate-50/70">
                    <td className="td">
                      <Link to={`/students/${student._id}`} className="flex items-center gap-3">
                        <Avatar name={student.name} />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-slate-900">{student.name}</span>
                          <span className="block font-mono text-[11px] text-slate-400">{student.studentId}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="td">{student.branch}</td>
                    <td className="td text-slate-400">
                      {student.coursesTracked} {student.coursesTracked === 1 ? 'course' : 'courses'}
                    </td>
                    <td className="td">
                      <AttendanceBadge percentage={student.averageAttendance} barWidth="w-24" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Records */}
      <div className="card mt-5">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center">
          <div className="min-w-0 lg:mr-auto">
            <h2 className="section-title">Attendance records</h2>
            <p className="section-subtitle">
              {visibleRecords.length} {visibleRecords.length === 1 ? 'record' : 'records'} shown
            </p>
          </div>

          <div className="relative w-full lg:max-w-xs">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="input pl-9"
              placeholder="Search by student..."
              aria-label="Search attendance by student"
            />
          </div>

          <select
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
            className="input lg:w-60"
            aria-label="Filter by course"
          >
            <option value="">All courses</option>
            {courses.map((course) => (
              <option key={course._id} value={course.courseId}>
                {course.courseCode} · {course.courseName}
              </option>
            ))}
          </select>

          <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm whitespace-nowrap text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] select-none">
            <input
              type="checkbox"
              checked={lowOnly}
              onChange={(event) => setLowOnly(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-brand-600"
            />
            At risk only
          </label>
        </div>

        {loading && records.length === 0 && !error ? (
          <TableSkeleton rows={6} columns={5} />
        ) : error ? (
          <ErrorState title="Could not load attendance" message={error} onRetry={reload} />
        ) : visibleRecords.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title="No attendance records found"
            description={
              hasFilters
                ? 'No record matches the current search and filters.'
                : 'Record attendance against a course to start tracking it.'
            }
            action={
              !hasFilters && (
                <button type="button" className="btn btn-primary" onClick={() => setFormRecord({})}>
                  <Plus className="h-4 w-4" />
                  Record attendance
                </button>
              )
            }
          />
        ) : (
          <div className={`scroll-x transition-opacity ${loading ? 'opacity-60' : ''}`}>
            <table className="min-w-full">
              <thead className="bg-slate-50/60">
                <tr>
                  <th scope="col" className="th">
                    Student
                  </th>
                  <th scope="col" className="th">
                    Course
                  </th>
                  <th scope="col" className="th">
                    Classes attended
                  </th>
                  <th scope="col" className="th">
                    Attendance
                  </th>
                  <th scope="col" className="th text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {visibleRecords.map((record) => (
                  <tr key={record._id} className="transition-colors hover:bg-slate-50/70">
                    <td className="td">
                      <p className="font-medium text-slate-900">{record.studentName}</p>
                      <p className="font-mono text-[11px] text-slate-400">{record.studentId}</p>
                    </td>
                    <td className="td">
                      <p className="text-slate-700">{record.courseName}</p>
                      <p className="font-mono text-[11px] text-slate-400">{record.courseId}</p>
                    </td>
                    <td className="td tabular-nums">
                      {record.attendedClasses} <span className="text-slate-400">of {record.totalClasses}</span>
                    </td>
                    <td className="td">
                      <AttendanceBadge percentage={record.percentage} barWidth="w-24" />
                    </td>
                    <td className="td">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => setFormRecord(record)}
                          title="Edit record"
                          aria-label={`Edit attendance for ${record.studentName}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="icon-btn hover:bg-red-50 hover:text-status-critical"
                          onClick={() => setRecordToDelete(record)}
                          title="Remove record"
                          aria-label={`Remove attendance for ${record.studentName}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formRecord && (
        <AttendanceFormModal
          record={formRecord._id ? formRecord : null}
          students={students}
          courses={courses}
          onClose={() => setFormRecord(null)}
          onSaved={handleSaved}
        />
      )}

      {recordToDelete && (
        <ConfirmDialog
          title="Remove this attendance record?"
          loading={deleting}
          confirmLabel="Remove record"
          loadingLabel="Removing..."
          onConfirm={handleDelete}
          onCancel={() => setRecordToDelete(null)}
          message={
            <p>
              The attendance record for{' '}
              <span className="font-medium text-slate-900">{recordToDelete.studentName}</span> in{' '}
              <span className="font-medium text-slate-900">{recordToDelete.courseName}</span> will be
              permanently removed.
            </p>
          }
        />
      )}
    </>
  );
}
