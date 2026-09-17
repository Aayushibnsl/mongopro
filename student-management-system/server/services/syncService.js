import {
  sirConnection,
  SIR_DB_NAME,
  SIR_ALLOWED_COLLECTIONS,
  isSirConfigured,
  isSirConnected,
  checkSirDatabaseExists,
} from '../config/db.js';
import Student from '../models/Student.js';
import Course from '../models/Course.js';
import Attendance from '../models/Attendance.js';
import { safeErrorMessage } from '../utils/safeErrorMessage.js';

/*
 * HOW SYNCHRONIZATION WORKS
 * -------------------------
 * 1. A controller saves the change in the PRIMARY database first (source of truth).
 * 2. It then calls one of the functions below to repeat the same change in the
 *    professor's database (PCEA24CY002).
 * 3. If the professor database is unavailable, the primary change is still kept.
 *    The function never throws – it returns a status the frontend can show:
 *
 *      { status: 'synced',  message: 'Synced with professor database' }
 *      { status: 'skipped', message: 'Saved to primary database only (...)' }
 *      { status: 'failed',  message: 'Professor database synchronization failed' }
 *
 * NO DUPLICATES: copies are matched by stable IDs (studentId, courseId, or
 * studentId + courseId) and written with an "upsert" – update the copy if it
 * exists, insert it if it doesn't. Syncing the same record 10 times still leaves
 * exactly one copy.
 */

// ---------------------------------------------------------------------------
// Safety helpers
// ---------------------------------------------------------------------------

function getSirCollection(collectionName) {
  // Safety check 1: only students, courses and attendance may ever be written
  if (!SIR_ALLOWED_COLLECTIONS.includes(collectionName)) {
    throw new Error(`Writing to collection "${collectionName}" is not allowed`);
  }

  // Safety check 2: make sure the connection really points at PCEA24CY002
  if (sirConnection.db?.databaseName !== SIR_DB_NAME) {
    throw new Error(`Refusing to write because the connected database is not ${SIR_DB_NAME}`);
  }

  return sirConnection.db.collection(collectionName);
}

// Returns null when the professor database is ready, otherwise a "skipped" result.
async function checkProfessorDatabase() {
  let reason = null;

  if (!isSirConfigured()) reason = 'professor database is not configured';
  else if (!isSirConnected()) reason = 'professor database is unavailable';
  else if (!(await checkSirDatabaseExists())) reason = `database ${SIR_DB_NAME} was not found`;

  return reason ? { status: 'skipped', reason, message: `Saved to primary database only (${reason})` } : null;
}

// Runs a piece of sync work and turns any error into a friendly status.
async function runSync(actionName, syncWork) {
  try {
    const notReady = await checkProfessorDatabase();
    if (notReady) return notReady;

    await syncWork();
    return { status: 'synced', message: 'Synced with professor database' };
  } catch (error) {
    console.error(`✖ Sync failed (${actionName}): ${safeErrorMessage(error)}`);
    return { status: 'failed', message: 'Professor database synchronization failed' };
  }
}

// Build an "upsert" update: copy every field, and keep the same _id for new copies.
function buildUpsertUpdate(document) {
  const plain = typeof document.toObject === 'function' ? document.toObject() : { ...document };
  const { _id, ...fields } = plain;

  return {
    $set: fields, // copy all fields from the primary document
    $setOnInsert: { _id }, // a brand-new copy gets the same _id as the primary document
  };
}

async function upsertCopy(collectionName, matchFilter, document) {
  const collection = getSirCollection(collectionName);
  await collection.updateOne(matchFilter, buildUpsertUpdate(document), { upsert: true });
}

// ---------------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------------

export function syncStudentCreate(student) {
  return runSync('create student', () => upsertCopy('students', { studentId: student.studentId }, student));
}

export function syncStudentUpdate(student) {
  // Upsert also repairs a missing copy (for example, a student created while the professor DB was offline)
  return runSync('update student', () => upsertCopy('students', { studentId: student.studentId }, student));
}

export function syncStudentDelete(student) {
  return runSync('delete student', async () => {
    await getSirCollection('students').deleteOne({ studentId: student.studentId });
    // The primary database also removed this student's attendance, so remove those copies too
    await getSirCollection('attendance').deleteMany({ studentId: student.studentId });
  });
}

// ---------------------------------------------------------------------------
// Courses
// ---------------------------------------------------------------------------

export function syncCourseCreate(course) {
  return runSync('create course', () => upsertCopy('courses', { courseId: course.courseId }, course));
}

export function syncCourseUpdate(course) {
  return runSync('update course', async () => {
    await upsertCopy('courses', { courseId: course.courseId }, course);
    // Attendance records store the course name too, so keep those copies in step
    await getSirCollection('attendance').updateMany(
      { courseId: course.courseId },
      { $set: { courseName: course.courseName } }
    );
  });
}

export function syncCourseDelete(course) {
  return runSync('delete course', async () => {
    await getSirCollection('courses').deleteOne({ courseId: course.courseId });
    await getSirCollection('attendance').deleteMany({ courseId: course.courseId });
  });
}

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------

function attendanceKey(record) {
  return { studentId: record.studentId, courseId: record.courseId };
}

export function syncAttendanceCreate(record) {
  return runSync('create attendance', () => upsertCopy('attendance', attendanceKey(record), record));
}

export function syncAttendanceUpdate(record) {
  return runSync('update attendance', () => upsertCopy('attendance', attendanceKey(record), record));
}

export function syncAttendanceDelete(record) {
  return runSync('delete attendance', () => getSirCollection('attendance').deleteOne(attendanceKey(record)));
}

// ---------------------------------------------------------------------------
// Manual "sync everything" (only runs when the user clicks the button)
// ---------------------------------------------------------------------------

async function copyAllDocuments(collectionName, Model, getMatchFilter) {
  const documents = await Model.find().lean();
  if (documents.length === 0) return 0;

  // bulkWrite sends all upserts to MongoDB in one request
  const operations = documents.map((document) => ({
    updateOne: {
      filter: getMatchFilter(document),
      update: buildUpsertUpdate(document),
      upsert: true,
    },
  }));

  await getSirCollection(collectionName).bulkWrite(operations, { ordered: false });
  return documents.length;
}

/**
 * Copies every primary record to the professor database.
 * Existing copies are updated, missing ones are inserted, and nothing is deleted.
 */
export async function syncAllRecords() {
  const counts = { students: 0, courses: 0, attendance: 0 };

  const result = await runSync('sync all records', async () => {
    counts.students = await copyAllDocuments('students', Student, (doc) => ({ studentId: doc.studentId }));
    counts.courses = await copyAllDocuments('courses', Course, (doc) => ({ courseId: doc.courseId }));
    counts.attendance = await copyAllDocuments('attendance', Attendance, attendanceKey);
  });

  return { ...result, counts };
}
