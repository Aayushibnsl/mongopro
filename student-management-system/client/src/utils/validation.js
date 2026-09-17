// Form validation that runs in the browser before anything is sent.
// The server validates everything again (see server/models), so these
// checks are only here to show friendly messages quickly.

const isBlank = (value) => String(value ?? '').trim() === '';
const isWholeNumber = (value) => /^\d+$/.test(String(value).trim());

export function validateStudent(values) {
  const errors = {};

  if (isBlank(values.name)) errors.name = "Please enter the student's name";
  else if (values.name.trim().length < 2) errors.name = 'Name must be at least 2 characters';

  if (isBlank(values.studentId)) errors.studentId = 'Please enter a Student ID';
  else if (!/^[A-Za-z0-9-]{3,20}$/.test(values.studentId.trim()))
    errors.studentId = 'Use 3–20 letters, numbers or hyphens, e.g. PCEA24CY002';

  if (isBlank(values.age)) errors.age = 'Please enter the age';
  else if (!isWholeNumber(values.age) || Number(values.age) < 15 || Number(values.age) > 60)
    errors.age = 'Age must be a whole number between 15 and 60';

  if (isBlank(values.email)) errors.email = 'Please enter an email address';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()))
    errors.email = 'Please enter a valid email address';

  if (isBlank(values.phone)) errors.phone = 'Please enter a phone number';
  else if (!/^\d{10}$/.test(values.phone.trim())) errors.phone = 'Phone number must be exactly 10 digits';

  if (isBlank(values.gender)) errors.gender = 'Please select a gender';
  if (isBlank(values.branch)) errors.branch = 'Please select a branch';
  if (isBlank(values.semester)) errors.semester = 'Please select a semester';

  const cgpa = Number(values.cgpa);
  if (isBlank(values.cgpa)) errors.cgpa = 'Please enter the CGPA';
  else if (Number.isNaN(cgpa) || cgpa < 0 || cgpa > 10)
    errors.cgpa = 'CGPA must be a number between 0 and 10';

  if (isBlank(values.city)) errors.city = 'Please enter a city';

  return errors;
}

export function validateCourse(values) {
  const errors = {};

  if (isBlank(values.courseId)) errors.courseId = 'Please enter a Course ID';
  else if (!/^[A-Za-z0-9-]{2,15}$/.test(values.courseId.trim()))
    errors.courseId = 'Use 2–15 letters, numbers or hyphens, e.g. CS501';

  if (isBlank(values.courseCode)) errors.courseCode = 'Please enter a course code';
  else if (values.courseCode.trim().length > 10)
    errors.courseCode = 'Course code must be at most 10 characters';

  if (isBlank(values.courseName)) errors.courseName = 'Please enter the course name';
  else if (values.courseName.trim().length < 3)
    errors.courseName = 'Course name must be at least 3 characters';

  if (isBlank(values.credits)) errors.credits = 'Please enter the credits';
  else if (!isWholeNumber(values.credits) || Number(values.credits) < 1 || Number(values.credits) > 6)
    errors.credits = 'Credits must be a whole number between 1 and 6';

  if (isBlank(values.faculty)) errors.faculty = 'Please enter the faculty name';
  if (isBlank(values.semester)) errors.semester = 'Please select a semester';
  if (isBlank(values.department)) errors.department = 'Please enter the department';

  return errors;
}

export function validateAttendance(values) {
  const errors = {};

  if (isBlank(values.studentId)) errors.studentId = 'Please select a student';
  if (isBlank(values.courseId)) errors.courseId = 'Please select a course';

  if (isBlank(values.totalClasses)) errors.totalClasses = 'Please enter total classes';
  else if (!isWholeNumber(values.totalClasses) || Number(values.totalClasses) < 1)
    errors.totalClasses = 'Total classes must be a whole number of at least 1';

  if (isBlank(values.attendedClasses)) errors.attendedClasses = 'Please enter attended classes';
  else if (!isWholeNumber(values.attendedClasses))
    errors.attendedClasses = 'Attended classes must be a whole number';
  else if (!errors.totalClasses && Number(values.attendedClasses) > Number(values.totalClasses))
    errors.attendedClasses = 'Attended classes cannot be more than total classes';

  return errors;
}
