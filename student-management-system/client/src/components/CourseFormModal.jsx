import { useState } from 'react';
import { Save } from 'lucide-react';

import Modal from './Modal.jsx';
import FormField, { inputClass } from './FormField.jsx';
import { Spinner } from './LoadingState.jsx';
import { useToast } from './Toast.jsx';
import { createCourse, updateCourse } from '../services/courseService.js';
import { getErrorMessage } from '../services/api.js';
import { validateCourse } from '../utils/validation.js';
import { DEPARTMENTS, SEMESTERS } from '../utils/constants.js';

const EMPTY_COURSE = {
  courseId: '',
  courseCode: '',
  courseName: '',
  credits: '',
  faculty: '',
  semester: '',
  department: '',
};

function toFormValues(course) {
  const values = { ...EMPTY_COURSE };
  for (const key of Object.keys(EMPTY_COURSE)) {
    values[key] = course[key] == null ? '' : String(course[key]);
  }
  return values;
}

function toPayload(values) {
  return {
    courseId: values.courseId.trim().toUpperCase(),
    courseCode: values.courseCode.trim().toUpperCase(),
    courseName: values.courseName.trim(),
    credits: Number(values.credits),
    faculty: values.faculty.trim(),
    semester: Number(values.semester),
    department: values.department.trim(),
  };
}

export default function CourseFormModal({ course, onClose, onSaved }) {
  const isEdit = Boolean(course);
  const toast = useToast();

  const [values, setValues] = useState(() => (course ? toFormValues(course) : EMPTY_COURSE));
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    if (errors[name]) setErrors((current) => ({ ...current, [name]: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const validationErrors = validateCourse(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    setServerError('');

    try {
      const payload = toPayload(values);
      const response = isEdit ? await updateCourse(course._id, payload) : await createCourse(payload);

      toast.success(response.message);
      toast.sync(response.sync);
      onSaved(response.data);
    } catch (error) {
      const message = getErrorMessage(error);
      setServerError(message);
      toast.error(isEdit ? 'Could not update course' : 'Could not add course', message);
      setSaving(false);
    }
  }

  return (
    <Modal
      title={isEdit ? 'Edit course' : 'Add course'}
      description="Courses are saved to your database and synced to the professor database."
      onClose={saving ? () => {} : onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="course-form" className="btn btn-primary" disabled={saving}>
            {saving ? <Spinner /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Add course'}
          </button>
        </>
      }
    >
      <form id="course-form" onSubmit={handleSubmit} noValidate>
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
            label="Course ID"
            htmlFor="courseId"
            error={errors.courseId}
            hint={isEdit ? "Course ID can't be changed – attendance records use it." : undefined}
          >
            <input
              id="courseId"
              name="courseId"
              value={values.courseId}
              onChange={handleChange}
              className={`${inputClass(errors.courseId)} font-mono uppercase placeholder:normal-case`}
              placeholder="e.g. CS501"
              disabled={isEdit}
              autoFocus={!isEdit}
            />
          </FormField>

          <FormField label="Course code" htmlFor="courseCode" error={errors.courseCode}>
            <input
              id="courseCode"
              name="courseCode"
              value={values.courseCode}
              onChange={handleChange}
              className={`${inputClass(errors.courseCode)} uppercase placeholder:normal-case`}
              placeholder="e.g. DBMS"
            />
          </FormField>

          <FormField
            label="Course name"
            htmlFor="courseName"
            error={errors.courseName}
            className="sm:col-span-2"
          >
            <input
              id="courseName"
              name="courseName"
              value={values.courseName}
              onChange={handleChange}
              className={inputClass(errors.courseName)}
              placeholder="e.g. Database Management System"
              autoFocus={isEdit}
            />
          </FormField>

          <FormField label="Credits" htmlFor="credits" error={errors.credits}>
            <input
              id="credits"
              name="credits"
              type="number"
              min="1"
              max="6"
              value={values.credits}
              onChange={handleChange}
              className={inputClass(errors.credits)}
              placeholder="1 – 6"
            />
          </FormField>

          <FormField label="Semester" htmlFor="semester" error={errors.semester}>
            <select
              id="semester"
              name="semester"
              value={values.semester}
              onChange={handleChange}
              className={inputClass(errors.semester)}
            >
              <option value="">Select semester</option>
              {SEMESTERS.map((semester) => (
                <option key={semester} value={semester}>
                  Semester {semester}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Faculty" htmlFor="faculty" error={errors.faculty}>
            <input
              id="faculty"
              name="faculty"
              value={values.faculty}
              onChange={handleChange}
              className={inputClass(errors.faculty)}
              placeholder="e.g. Dr. Sharma"
            />
          </FormField>

          <FormField label="Department" htmlFor="department" error={errors.department}>
            <input
              id="department"
              name="department"
              list="department-options"
              value={values.department}
              onChange={handleChange}
              className={inputClass(errors.department)}
              placeholder="e.g. Computer Science"
            />
            <datalist id="department-options">
              {DEPARTMENTS.map((department) => (
                <option key={department} value={department} />
              ))}
            </datalist>
          </FormField>
        </div>
      </form>
    </Modal>
  );
}
