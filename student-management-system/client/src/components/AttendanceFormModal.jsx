import { useState } from 'react';
import { Save } from 'lucide-react';

import Modal from './Modal.jsx';
import FormField, { inputClass } from './FormField.jsx';
import AttendanceBadge from './AttendanceBadge.jsx';
import { Spinner } from './LoadingState.jsx';
import { useToast } from './Toast.jsx';
import { createAttendance, updateAttendance } from '../services/attendanceService.js';
import { getErrorMessage } from '../services/api.js';
import { validateAttendance } from '../utils/validation.js';

const EMPTY_RECORD = { studentId: '', courseId: '', totalClasses: '', attendedClasses: '' };

export default function AttendanceFormModal({ record, students, courses, onClose, onSaved }) {
  const isEdit = Boolean(record);
  const toast = useToast();

  const [values, setValues] = useState(() =>
    record
      ? {
          studentId: record.studentId,
          courseId: record.courseId,
          totalClasses: String(record.totalClasses),
          attendedClasses: String(record.attendedClasses),
        }
      : EMPTY_RECORD
  );
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  // Live preview of the percentage (the server calculates the real value)
  const total = Number(values.totalClasses);
  const attended = Number(values.attendedClasses);
  const previewPercentage =
    total > 0 && values.attendedClasses !== '' && attended >= 0 && attended <= total
      ? Math.round((attended / total) * 10000) / 100
      : null;

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    if (errors[name]) setErrors((current) => ({ ...current, [name]: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const validationErrors = validateAttendance(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    setServerError('');

    try {
      const payload = {
        studentId: values.studentId,
        courseId: values.courseId,
        totalClasses: Number(values.totalClasses),
        attendedClasses: Number(values.attendedClasses),
      };
      const response = isEdit ? await updateAttendance(record._id, payload) : await createAttendance(payload);

      toast.success(response.message);
      toast.sync(response.sync);
      onSaved(response.data);
    } catch (error) {
      const message = getErrorMessage(error);
      setServerError(message);
      toast.error(isEdit ? 'Could not update attendance' : 'Could not add attendance', message);
      setSaving(false);
    }
  }

  return (
    <Modal
      title={isEdit ? 'Edit attendance' : 'Add attendance'}
      description="The percentage is calculated automatically when the record is saved."
      onClose={saving ? () => {} : onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="attendance-form" className="btn btn-primary" disabled={saving}>
            {saving ? <Spinner /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Add attendance'}
          </button>
        </>
      }
    >
      <form id="attendance-form" onSubmit={handleSubmit} noValidate>
        {serverError && (
          <div
            className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {serverError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
          <FormField
            label="Student"
            htmlFor="studentId"
            error={errors.studentId}
            className="sm:col-span-2"
            hint={
              isEdit
                ? 'Student and course identify this record, so only the class counts can change.'
                : undefined
            }
          >
            <select
              id="studentId"
              name="studentId"
              value={values.studentId}
              onChange={handleChange}
              className={inputClass(errors.studentId)}
              disabled={isEdit}
            >
              <option value="">Select a student</option>
              {isEdit && !students.some((student) => student.studentId === values.studentId) && (
                <option value={values.studentId}>{record.studentName ?? values.studentId}</option>
              )}
              {students.map((student) => (
                <option key={student._id} value={student.studentId}>
                  {student.name} ({student.studentId})
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Course" htmlFor="courseId" error={errors.courseId} className="sm:col-span-2">
            <select
              id="courseId"
              name="courseId"
              value={values.courseId}
              onChange={handleChange}
              className={inputClass(errors.courseId)}
              disabled={isEdit}
            >
              <option value="">Select a course</option>
              {isEdit && !courses.some((course) => course.courseId === values.courseId) && (
                <option value={values.courseId}>{record.courseName ?? values.courseId}</option>
              )}
              {courses.map((course) => (
                <option key={course._id} value={course.courseId}>
                  {course.courseId} · {course.courseName}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Total classes" htmlFor="totalClasses" error={errors.totalClasses}>
            <input
              id="totalClasses"
              name="totalClasses"
              type="number"
              min="1"
              value={values.totalClasses}
              onChange={handleChange}
              className={inputClass(errors.totalClasses)}
              placeholder="e.g. 40"
            />
          </FormField>

          <FormField label="Attended classes" htmlFor="attendedClasses" error={errors.attendedClasses}>
            <input
              id="attendedClasses"
              name="attendedClasses"
              type="number"
              min="0"
              value={values.attendedClasses}
              onChange={handleChange}
              className={inputClass(errors.attendedClasses)}
              placeholder="e.g. 35"
            />
          </FormField>
        </div>

        <div className="mt-5 flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
          <span className="text-sm text-slate-600">Attendance percentage</span>
          {previewPercentage == null ? (
            <span className="text-sm text-slate-400">Enter class counts</span>
          ) : (
            <AttendanceBadge percentage={previewPercentage} barWidth="w-24" />
          )}
        </div>
      </form>
    </Modal>
  );
}
