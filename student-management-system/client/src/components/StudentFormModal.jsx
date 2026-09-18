import { useState } from 'react';
import { Save } from 'lucide-react';

import Modal from './Modal.jsx';
import FormField, { inputClass } from './FormField.jsx';
import { Spinner } from './LoadingState.jsx';
import { useToast } from './Toast.jsx';
import { createStudent, updateStudent } from '../services/studentService.js';
import { getErrorMessage } from '../services/api.js';
import { validateStudent } from '../utils/validation.js';
import { BRANCHES, GENDERS, SEMESTERS } from '../utils/constants.js';

const EMPTY_STUDENT = {
  name: '',
  studentId: '',
  age: '',
  email: '',
  phone: '',
  gender: '',
  branch: '',
  semester: '',
  cgpa: '',
  city: '',
  address: '',
};

// Stored numbers become strings so they work in <input> fields
function toFormValues(student) {
  const values = { ...EMPTY_STUDENT };
  for (const key of Object.keys(EMPTY_STUDENT)) {
    values[key] = student[key] == null ? '' : String(student[key]);
  }
  return values;
}

// Form values are strings – convert them to the types the API expects
function toPayload(values) {
  return {
    name: values.name.trim(),
    studentId: values.studentId.trim().toUpperCase(),
    age: Number(values.age),
    email: values.email.trim(),
    phone: values.phone.trim(),
    gender: values.gender,
    branch: values.branch,
    semester: Number(values.semester),
    cgpa: Number(values.cgpa),
    city: values.city.trim(),
    address: values.address.trim(),
  };
}

/**
 * Add Student / Edit Student form.
 * Pass `student` to edit an existing student, or leave it empty to add a new one.
 */
export default function StudentFormModal({ student, cities = [], onClose, onSaved }) {
  const isEdit = Boolean(student);
  const toast = useToast();

  const [values, setValues] = useState(() => (student ? toFormValues(student) : EMPTY_STUDENT));
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  // Keep branch options valid even if a student has a branch that isn't in our list
  const branchOptions =
    values.branch && !BRANCHES.includes(values.branch) ? [values.branch, ...BRANCHES] : BRANCHES;

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    if (errors[name]) setErrors((current) => ({ ...current, [name]: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const validationErrors = validateStudent(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    setServerError('');

    try {
      const payload = toPayload(values);
      const response = isEdit ? await updateStudent(student._id, payload) : await createStudent(payload);

      toast.success(response.message); // "Student added successfully" / "Student updated successfully"
      toast.sync(response.sync); // whether the institutional archive received the change
      onSaved(response.data);
    } catch (error) {
      const message = getErrorMessage(error);
      setServerError(message);
      toast.error(isEdit ? 'Could not update student' : 'Could not add student', message);
      setSaving(false);
    }
  }

  return (
    <Modal
      title={isEdit ? 'Edit student' : 'Add student'}
      description={
        isEdit
          ? 'Changes are saved immediately and copied to the institutional archive.'
          : 'The new student is saved immediately and copied to the institutional archive.'
      }
      onClose={saving ? () => {} : onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="student-form" className="btn btn-primary" disabled={saving}>
            {saving ? <Spinner /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Add student'}
          </button>
        </>
      }
    >
      <form id="student-form" onSubmit={handleSubmit} noValidate>
        {serverError && (
          <div
            className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {serverError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
          <FormField label="Full name" htmlFor="name" error={errors.name}>
            <input
              id="name"
              name="name"
              value={values.name}
              onChange={handleChange}
              className={inputClass(errors.name)}
              placeholder="e.g. Aayushi Bansal"
              autoFocus
            />
          </FormField>

          <FormField
            label="Student ID"
            htmlFor="studentId"
            error={errors.studentId}
            hint={isEdit ? "Student ID can't be changed – it links attendance and synced copies." : undefined}
          >
            <input
              id="studentId"
              name="studentId"
              value={values.studentId}
              onChange={handleChange}
              className={`${inputClass(errors.studentId)} font-mono uppercase placeholder:normal-case`}
              placeholder="e.g. PCEA24CY002"
              disabled={isEdit}
            />
          </FormField>

          <FormField label="Age" htmlFor="age" error={errors.age}>
            <input
              id="age"
              name="age"
              type="number"
              min="15"
              max="60"
              value={values.age}
              onChange={handleChange}
              className={inputClass(errors.age)}
              placeholder="e.g. 19"
            />
          </FormField>

          <FormField label="Gender" htmlFor="gender" error={errors.gender}>
            <select
              id="gender"
              name="gender"
              value={values.gender}
              onChange={handleChange}
              className={inputClass(errors.gender)}
            >
              <option value="">Select gender</option>
              {GENDERS.map((gender) => (
                <option key={gender} value={gender}>
                  {gender}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Email" htmlFor="email" error={errors.email}>
            <input
              id="email"
              name="email"
              type="email"
              value={values.email}
              onChange={handleChange}
              className={inputClass(errors.email)}
              placeholder="name@example.com"
            />
          </FormField>

          <FormField label="Phone" htmlFor="phone" error={errors.phone}>
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={values.phone}
              onChange={handleChange}
              className={inputClass(errors.phone)}
              placeholder="10-digit mobile number"
            />
          </FormField>

          <FormField label="Branch" htmlFor="branch" error={errors.branch}>
            <select
              id="branch"
              name="branch"
              value={values.branch}
              onChange={handleChange}
              className={inputClass(errors.branch)}
            >
              <option value="">Select branch</option>
              {branchOptions.map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </select>
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

          <FormField label="CGPA" htmlFor="cgpa" error={errors.cgpa}>
            <input
              id="cgpa"
              name="cgpa"
              type="number"
              step="0.01"
              min="0"
              max="10"
              value={values.cgpa}
              onChange={handleChange}
              className={inputClass(errors.cgpa)}
              placeholder="0 – 10"
            />
          </FormField>

          <FormField label="City" htmlFor="city" error={errors.city}>
            <input
              id="city"
              name="city"
              list="city-options"
              value={values.city}
              onChange={handleChange}
              className={inputClass(errors.city)}
              placeholder="e.g. Jaipur"
            />
            <datalist id="city-options">
              {cities.map((city) => (
                <option key={city} value={city} />
              ))}
            </datalist>
          </FormField>

          <FormField label="Address" htmlFor="address" optional className="sm:col-span-2">
            <textarea
              id="address"
              name="address"
              rows={2}
              value={values.address}
              onChange={handleChange}
              className="input resize-none"
              placeholder="e.g. Malviya Nagar, Jaipur, Rajasthan"
            />
          </FormField>
        </div>
      </form>
    </Modal>
  );
}
