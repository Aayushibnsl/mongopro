/*
 * Seed script – run with:  npm run seed
 *
 * Fills the PRIMARY database (student_management) with the demo students,
 * courses and attendance records in demoData.js.
 *
 * It is ADDITIVE and safe to run more than once: records that already exist
 * (matched on studentId / courseId / studentId+courseId) are left exactly as
 * they are, and only the missing ones are inserted. Nothing is ever deleted or
 * overwritten, so records you added through the app are never touched.
 *
 * The professor database is NOT touched here. It only receives records through
 * actions you take in the app (or the "Sync all records" button in Settings).
 */
import dotenv from 'dotenv';

import { connectPrimary, primaryConnection, PRIMARY_DB_NAME } from '../config/db.js';
import Student from '../models/Student.js';
import Course from '../models/Course.js';
import Attendance from '../models/Attendance.js';
import { demoStudents, demoCourses, demoAttendance } from './demoData.js';
import { safeErrorMessage } from '../utils/safeErrorMessage.js';

dotenv.config({ quiet: true });

/**
 * Inserts only the demo records whose key is not already in the collection.
 * `keyOf` turns a record into the string that identifies it.
 */
async function insertMissing(label, Model, demoRecords, keyOf) {
  const existing = await Model.find({}).lean();
  const existingKeys = new Set(existing.map(keyOf));

  const missing = demoRecords.filter((record) => !existingKeys.has(keyOf(record)));

  if (missing.length === 0) {
    console.log(`• ${label}: nothing to add (${existing.length} already present)`);
    return 0;
  }

  await Model.insertMany(missing);
  console.log(`✔ ${label}: added ${missing.length} (${existing.length} already present)`);
  return missing.length;
}

async function seed() {
  const result = await connectPrimary();
  if (result !== 'connected') {
    process.exitCode = 1;
    return;
  }

  // Build the unique indexes first (unique studentId, courseId, studentId + courseId)
  await Promise.all([Student.init(), Course.init(), Attendance.init()]);

  console.log(`\nSeeding ${PRIMARY_DB_NAME} — existing records are never changed.\n`);

  const added =
    (await insertMissing('Students', Student, demoStudents, (record) => record.studentId)) +
    (await insertMissing('Courses', Course, demoCourses, (record) => record.courseId)) +
    // Attendance is identified by the student and the course together
    (await insertMissing(
      'Attendance',
      Attendance,
      demoAttendance,
      (record) => `${record.studentId}::${record.courseId}`
    ));

  console.log(
    added === 0
      ? '\nEverything in the demo set is already in the database. Nothing was changed.'
      : `\nDone — ${added} new ${added === 1 ? 'record' : 'records'} added. The professor database was not changed.`
  );
}

seed()
  .catch((error) => {
    console.error(`✖ Seeding failed: ${safeErrorMessage(error)}`);
    process.exitCode = 1;
  })
  .finally(() => primaryConnection.close());
