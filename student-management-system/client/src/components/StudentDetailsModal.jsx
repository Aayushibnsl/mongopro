import { useCallback, useEffect, useState } from 'react';
import { BookOpen, Cake, GraduationCap, Hash, Mail, MapPin, Pencil, Phone, UserRound } from 'lucide-react';

import Modal from './Modal.jsx';
import Avatar from './Avatar.jsx';
import AttendanceBadge from './AttendanceBadge.jsx';
import LoadingState from './LoadingState.jsx';
import ErrorState from './ErrorState.jsx';
import { getStudent } from '../services/studentService.js';
import { getErrorMessage } from '../services/api.js';
import { formatCgpa, formatDate, formatPercent } from '../utils/format.js';

function DetailItem({ icon: Icon, label, value, className = '' }) {
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-medium break-words text-slate-900">{value || '—'}</p>
      </div>
    </div>
  );
}

export default function StudentDetailsModal({ studentId, onClose, onEdit }) {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStudent = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getStudent(studentId);
      setStudent(response.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadStudent();
  }, [loadStudent]);

  const attendance = student?.attendance ?? [];
  const averageAttendance = attendance.length
    ? attendance.reduce((sum, record) => sum + record.percentage, 0) / attendance.length
    : null;

  return (
    <Modal
      title="Student details"
      size="lg"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          {student && (
            <button type="button" className="btn btn-primary" onClick={() => onEdit(student)}>
              <Pencil className="h-4 w-4" />
              Edit student
            </button>
          )}
        </>
      }
    >
      {loading && <LoadingState message="Loading student details..." />}
      {!loading && error && <ErrorState message={error} onRetry={loadStudent} />}

      {!loading && student && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar name={student.name} size="lg" />
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{student.name}</h3>
                <p className="font-mono text-sm text-slate-500">{student.studentId}</p>
                <p className="mt-0.5 text-sm text-slate-600">
                  {student.branch} · Semester {student.semester}
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 px-5 py-3 text-center">
              <p className="text-xs font-medium text-slate-500 uppercase">CGPA</p>
              <p className="text-2xl font-semibold text-slate-900">{formatCgpa(student.cgpa)}</p>
            </div>
          </div>

          {/* Personal and academic details */}
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 rounded-xl bg-slate-50 p-5 sm:grid-cols-2">
            <DetailItem icon={Mail} label="Email" value={student.email} />
            <DetailItem icon={Phone} label="Phone" value={student.phone} />
            <DetailItem icon={Cake} label="Age" value={`${student.age} years`} />
            <DetailItem icon={UserRound} label="Gender" value={student.gender} />
            <DetailItem icon={GraduationCap} label="Branch" value={student.branch} />
            <DetailItem icon={Hash} label="Semester" value={`Semester ${student.semester}`} />
            <DetailItem icon={MapPin} label="City" value={student.city} />
            <DetailItem icon={MapPin} label="Address" value={student.address} />
          </div>

          {/* Attendance */}
          <div>
            <div className="mb-3 flex items-baseline justify-between">
              <h4 className="text-sm font-semibold text-slate-900">Attendance</h4>
              {averageAttendance != null && (
                <p className="text-sm text-slate-500">
                  Average:{' '}
                  <span className="font-medium text-slate-900">{formatPercent(averageAttendance)}</span>
                </p>
              )}
            </div>

            {attendance.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                No attendance records yet.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {attendance.map((record) => (
                  <li
                    key={record._id}
                    className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{record.courseName}</p>
                        <p className="text-xs text-slate-500">
                          <span className="font-mono">{record.courseId}</span> · {record.attendedClasses} of{' '}
                          {record.totalClasses} classes attended
                        </p>
                      </div>
                    </div>
                    <AttendanceBadge percentage={record.percentage} barWidth="w-24" />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="text-xs text-slate-400">
            Created by {student.createdBy} · Source: {student.source} · Added {formatDate(student.createdAt)}{' '}
            · Last updated {formatDate(student.updatedAt)}
          </p>
        </div>
      )}
    </Modal>
  );
}
