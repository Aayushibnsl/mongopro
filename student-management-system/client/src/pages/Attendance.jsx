import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, Pencil, Plus, Search, Trash2 } from 'lucide-react';

import PageHeader from '../components/PageHeader.jsx';
import AttendanceBadge from '../components/AttendanceBadge.jsx';
import LoadingState from '../components/LoadingState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import AttendanceFormModal from '../components/AttendanceFormModal.jsx';
import { useToast } from '../components/Toast.jsx';
import { deleteAttendance, getAttendance } from '../services/attendanceService.js';
import { getCourses } from '../services/courseService.js';
import { getStudents } from '../services/studentService.js';
import { getErrorMessage } from '../services/api.js';
import { formatPercent } from '../utils/format.js';
import { LOW_ATTENDANCE_THRESHOLD } from '../utils/constants.js';

function SummaryItem({ label, value, tone = 'default' }) {
  return (
    <div className="card px-5 py-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone === 'low' ? 'text-red-700' : 'text-slate-900'}`}>
        {value}
      </p>
    </div>
  );
}

export default function Attendance() {
  const toast = useToast();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  // Filters: course and "low only" are MongoDB queries on the server, search runs in the browser
  const [courseId, setCourseId] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [search, setSearch] = useState('');

  // Lists for the dropdowns in the form
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);

  const [formRecord, setFormRecord] = useState(null); // null = closed, {} = add, record = edit
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

  const reload = () => setReloadKey((key) => key + 1);

  const visibleRecords = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return records;
    return records.filter(
      (record) =>
        record.studentName.toLowerCase().includes(term) || record.studentId.toLowerCase().includes(term)
    );
  }, [records, search]);

  const averagePercentage = visibleRecords.length
    ? visibleRecords.reduce((sum, record) => sum + record.percentage, 0) / visibleRecords.length
    : null;
  const lowCount = visibleRecords.filter((record) => record.percentage < LOW_ATTENDANCE_THRESHOLD).length;
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
      toast.error('Could not delete attendance', getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Attendance"
        description={`Track classes attended per course. Below ${LOW_ATTENDANCE_THRESHOLD}% is marked as low attendance.`}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setFormRecord({})}>
            <Plus className="h-4 w-4" />
            Add Attendance
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryItem
          label="Records shown"
          value={loading && records.length === 0 ? '—' : visibleRecords.length}
        />
        <SummaryItem label="Average attendance" value={formatPercent(averagePercentage)} />
        <SummaryItem
          label={`Low attendance (below ${LOW_ATTENDANCE_THRESHOLD}%)`}
          value={lowCount}
          tone={lowCount ? 'low' : 'default'}
        />
      </div>

      <div className="card">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="input pl-9"
              placeholder="Search by student name or ID..."
              aria-label="Search attendance by student"
            />
          </div>

          <select
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
            className="input lg:w-72"
            aria-label="Filter by course"
          >
            <option value="">All courses</option>
            {courses.map((course) => (
              <option key={course._id} value={course.courseId}>
                {course.courseId} · {course.courseName}
              </option>
            ))}
          </select>

          <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm select-none">
            <input
              type="checkbox"
              checked={lowOnly}
              onChange={(event) => setLowOnly(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-brand-700"
            />
            Low attendance only
          </label>
        </div>

        {loading && records.length === 0 && !error ? (
          <LoadingState message="Loading attendance..." />
        ) : error ? (
          <ErrorState title="Could not load attendance" message={error} onRetry={reload} />
        ) : visibleRecords.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title="No attendance records found."
            description={
              hasFilters ? 'Try changing the search or filters.' : 'Add an attendance record to get started.'
            }
          />
        ) : (
          <div className={`overflow-x-auto transition-opacity ${loading ? 'opacity-60' : ''}`}>
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50/80">
                <tr>
                  <th scope="col" className="table-head">
                    Student
                  </th>
                  <th scope="col" className="table-head">
                    Course
                  </th>
                  <th scope="col" className="table-head">
                    Total Classes
                  </th>
                  <th scope="col" className="table-head">
                    Attended
                  </th>
                  <th scope="col" className="table-head">
                    Percentage
                  </th>
                  <th scope="col" className="table-head text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleRecords.map((record) => (
                  <tr key={record._id} className="transition-colors hover:bg-slate-50/70">
                    <td className="table-cell">
                      <p className="font-medium text-slate-900">{record.studentName}</p>
                      <p className="font-mono text-xs text-slate-500">{record.studentId}</p>
                    </td>
                    <td className="table-cell">
                      <p className="text-slate-900">{record.courseName}</p>
                      <p className="font-mono text-xs text-slate-500">{record.courseId}</p>
                    </td>
                    <td className="table-cell tabular-nums">{record.totalClasses}</td>
                    <td className="table-cell tabular-nums">{record.attendedClasses}</td>
                    <td className="table-cell">
                      <AttendanceBadge percentage={record.percentage} barWidth="w-24" />
                    </td>
                    <td className="table-cell">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => setFormRecord(record)}
                          title="Edit"
                          aria-label={`Edit attendance for ${record.studentName}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="icon-btn hover:bg-red-50 hover:text-red-600"
                          onClick={() => setRecordToDelete(record)}
                          title="Delete"
                          aria-label={`Delete attendance for ${record.studentName}`}
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
          title="Are you sure you want to delete this attendance record?"
          loading={deleting}
          confirmLabel="Delete record"
          onConfirm={handleDelete}
          onCancel={() => setRecordToDelete(null)}
          message={
            <p>
              Attendance for <span className="font-medium text-slate-900">{recordToDelete.studentName}</span>{' '}
              in <span className="font-medium text-slate-900">{recordToDelete.courseName}</span> will be
              deleted from your database and from the professor database.
            </p>
          }
        />
      )}
    </>
  );
}
