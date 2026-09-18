import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  CalendarCheck,
  Cake,
  GraduationCap,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Trash2,
  TrendingUp,
  UserRound,
} from 'lucide-react';

import SectionCard from '../components/ui/SectionCard.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import { Skeleton, StatGridSkeleton, ListSkeleton } from '../components/ui/Skeleton.jsx';
import Avatar from '../components/Avatar.jsx';
import Meter from '../components/charts/Meter.jsx';
import ErrorState from '../components/ErrorState.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import StudentFormModal from '../components/StudentFormModal.jsx';
import { useToast } from '../components/Toast.jsx';
import { useAnalytics } from '../hooks/useAnalytics.jsx';
import { deleteStudent, getStudent } from '../services/studentService.js';
import { getErrorMessage } from '../services/api.js';
import {
  formatCgpa,
  formatDate,
  formatPercent,
  formatRelative,
  getAttendanceStatus,
  getPerformanceStatus,
} from '../utils/format.js';
import { LOW_ATTENDANCE_THRESHOLD } from '../utils/constants.js';

function DetailItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-[11px] text-slate-400">{label}</p>
        <p className="text-[13px] font-medium break-words text-slate-900">{value || '—'}</p>
      </div>
    </div>
  );
}

export default function StudentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { refresh: refreshAnalytics } = useAnalytics();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getStudent(id);
      setStudent(response.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete() {
    setDeleting(true);
    try {
      const response = await deleteStudent(student._id);
      toast.success(response.message);
      toast.sync(response.sync);
      refreshAnalytics();
      navigate('/students');
    } catch (err) {
      toast.error('Could not remove student', getErrorMessage(err));
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  const backLink = (
    <Link
      to="/students"
      className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 transition-colors hover:text-slate-900"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to students
    </Link>
  );

  if (loading) {
    return (
      <>
        {backLink}
        <div className="card mb-5 p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3.5 w-64" />
            </div>
          </div>
        </div>
        <StatGridSkeleton count={3} />
        <div className="card mt-5 p-5">
          <ListSkeleton rows={3} />
        </div>
      </>
    );
  }

  if (error || !student) {
    return (
      <>
        {backLink}
        <div className="card">
          <ErrorState title="Could not load this student" message={error} onRetry={load} />
        </div>
      </>
    );
  }

  const attendance = student.attendance ?? [];
  const averageAttendance = attendance.length
    ? attendance.reduce((sum, record) => sum + record.percentage, 0) / attendance.length
    : null;
  const standing = getPerformanceStatus(student.cgpa);
  const attendanceStatus = getAttendanceStatus(averageAttendance);
  const atRiskCourses = attendance.filter((record) => record.percentage < LOW_ATTENDANCE_THRESHOLD);

  // A timeline built only from timestamps that actually exist on the records
  const activity = [
    { id: 'created', label: 'Student record created', at: student.createdAt },
    ...(student.updatedAt && student.updatedAt !== student.createdAt
      ? [{ id: 'updated', label: 'Profile details updated', at: student.updatedAt }]
      : []),
    ...attendance.map((record) => ({
      id: `att-${record._id}`,
      label: `Attendance recorded for ${record.courseName ?? record.courseId}`,
      detail: `${record.attendedClasses} of ${record.totalClasses} classes · ${formatPercent(record.percentage)}`,
      at: record.updatedAt ?? record.createdAt,
    })),
  ]
    .filter((item) => item.at)
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 6);

  return (
    <>
      {backLink}

      {/* Identity */}
      <div className="card mb-5 p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={student.name} size="lg" />
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">{student.name}</h1>
              <p className="mt-0.5 text-sm text-slate-500">
                {student.branch} · Semester {student.semester}
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <span className="badge badge-neutral font-mono">{student.studentId}</span>
                <span className={`badge ${standing.badge}`}>{standing.label}</span>
                {attendanceStatus.key === 'low' && <span className="badge badge-critical">Attendance at risk</span>}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" />
              Edit
            </button>
            <button
              type="button"
              className="btn btn-secondary text-status-critical hover:bg-red-50"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </button>
          </div>
        </div>
      </div>

      {/* Academic overview */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Attendance"
          value={formatPercent(averageAttendance)}
          indicator={
            attendance.length === 0
              ? 'No attendance recorded'
              : atRiskCourses.length > 0
                ? `${atRiskCourses.length} ${atRiskCourses.length === 1 ? 'course' : 'courses'} below ${LOW_ATTENDANCE_THRESHOLD}%`
                : 'Meets the requirement in every course'
          }
          indicatorTone={atRiskCourses.length > 0 ? 'critical' : 'good'}
          icon={CalendarCheck}
        />
        <StatCard
          label="Academic performance"
          value={formatCgpa(student.cgpa)}
          indicator={`${standing.label} · out of 10.00`}
          icon={TrendingUp}
        />
        <StatCard
          label="Courses enrolled"
          value={attendance.length}
          indicator={attendance.length === 0 ? 'Not enrolled in any course' : 'With attendance on record'}
          icon={BookOpen}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Course-wise attendance */}
        <SectionCard
          title="Course performance"
          subtitle={`Attendance per enrolled course · ${LOW_ATTENDANCE_THRESHOLD}% required`}
          className="lg:col-span-2"
        >
          {attendance.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No course records yet"
              description="Attendance recorded against a course will appear here."
              action={
                <Link to="/attendance" className="btn btn-secondary">
                  Record attendance
                </Link>
              }
              compact
            />
          ) : (
            <ul className="space-y-5">
              {attendance.map((record) => (
                <li key={record._id}>
                  <div className="mb-1 flex items-baseline justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-slate-900">
                        {record.courseName ?? record.courseId}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {record.attendedClasses} of {record.totalClasses} classes attended
                      </p>
                    </div>
                  </div>
                  <Meter value={record.percentage} threshold={LOW_ATTENDANCE_THRESHOLD} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <div className="space-y-5">
          {/* Student information */}
          <SectionCard title="Student information">
            <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-1">
              <DetailItem icon={Mail} label="Email" value={student.email} />
              <DetailItem icon={Phone} label="Phone" value={student.phone} />
              <DetailItem icon={GraduationCap} label="Branch" value={student.branch} />
              <DetailItem icon={Cake} label="Age" value={`${student.age} years`} />
              <DetailItem icon={UserRound} label="Gender" value={student.gender} />
              <DetailItem icon={MapPin} label="City" value={student.city} />
              {student.address && <DetailItem icon={MapPin} label="Address" value={student.address} />}
            </div>
          </SectionCard>

          {/* Activity */}
          <SectionCard title="Recent activity">
            <ol className="space-y-4">
              {activity.map((item) => (
                <li key={item.id} className="flex gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-300" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] leading-snug text-slate-700">{item.label}</p>
                    {item.detail && <p className="text-[11px] text-slate-400">{item.detail}</p>}
                    <p className="mt-0.5 text-[11px] text-slate-400">{formatRelative(item.at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </SectionCard>
        </div>
      </div>

      <p className="mt-5 text-center text-[11px] text-slate-400">
        Record created {formatDate(student.createdAt)} · Last updated {formatDate(student.updatedAt)}
      </p>

      {editing && (
        <StudentFormModal
          student={student}
          cities={student.city ? [student.city] : []}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            load();
            refreshAnalytics();
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Remove this student?"
          loading={deleting}
          confirmLabel="Remove student"
          loadingLabel="Removing..."
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
          message={
            <>
              <p>
                <span className="font-medium text-slate-900">{student.name}</span> and all{' '}
                {attendance.length} attendance {attendance.length === 1 ? 'record' : 'records'} will be
                permanently removed.
              </p>
              <p>This action cannot be undone.</p>
            </>
          }
        />
      )}
    </>
  );
}
