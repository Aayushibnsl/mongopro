import { safeErrorMessage } from '../utils/safeErrorMessage.js';

// Friendly names for field paths used in error messages
const FIELD_LABELS = {
  studentId: 'Student ID',
  courseId: 'Course ID',
  cgpa: 'CGPA',
  age: 'Age',
  semester: 'Semester',
  credits: 'Credits',
  totalClasses: 'Total classes',
  attendedClasses: 'Attended classes',
};

function label(path) {
  return FIELD_LABELS[path] || path;
}

// Unknown API route
export function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// Every error thrown in a route ends up here and is turned into
// { success: false, message: "..." }
// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, next) {
  // Mongoose validation failed (e.g. CGPA above 10, missing name)
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map((fieldError) =>
      fieldError.name === 'CastError'
        ? `${label(fieldError.path)} must be a valid number`
        : fieldError.message
    );
    return res.status(400).json({ success: false, message: messages[0], errors: messages });
  }

  // An invalid MongoDB _id in the URL, e.g. /api/students/123
  if (error.name === 'CastError') {
    const message = error.path === '_id' ? 'Invalid ID format' : `Invalid value for ${label(error.path)}`;
    return res.status(400).json({ success: false, message });
  }

  // Duplicate key error from a unique index (E11000)
  if (error.code === 11000) {
    const keys = Object.keys(error.keyValue || error.keyPattern || {});
    let message = 'This record already exists';

    if (keys.includes('studentId') && keys.includes('courseId')) {
      message = 'Attendance for this student and course already exists';
    } else if (keys.includes('studentId')) {
      message = `A student with Student ID ${error.keyValue?.studentId ?? ''} already exists`;
    } else if (keys.includes('courseId')) {
      message = `A course with Course ID ${error.keyValue?.courseId ?? ''} already exists`;
    }
    return res.status(409).json({ success: false, message });
  }

  // The request body was not valid JSON
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid JSON in request body' });
  }

  // MongoDB could not be reached in the middle of a request
  if (['MongoNetworkError', 'MongoServerSelectionError', 'MongoNotConnectedError'].includes(error.name)) {
    return res
      .status(503)
      .json({ success: false, message: 'Database is temporarily unavailable. Please try again.' });
  }

  console.error(`✖ ${req.method} ${req.originalUrl} failed: ${safeErrorMessage(error)}`);
  res.status(500).json({ success: false, message: 'Something went wrong on the server. Please try again.' });
}
