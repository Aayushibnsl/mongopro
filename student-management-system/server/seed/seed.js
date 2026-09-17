/*
 * Seed script – run with:  npm run seed
 *
 * Fills the PRIMARY database (student_management) with demo students, courses
 * and attendance. It never overwrites anything: if any of the three collections
 * already has documents, it stops without changing data.
 *
 * The professor database is NOT touched here. It only receives records through
 * actions you take in the app.
 */
import dotenv from 'dotenv';

import { connectPrimary, primaryConnection, PRIMARY_DB_NAME } from '../config/db.js';
import Student from '../models/Student.js';
import Course from '../models/Course.js';
import Attendance from '../models/Attendance.js';
import { demoStudents, demoCourses, demoAttendance } from './demoData.js';
import { safeErrorMessage } from '../utils/safeErrorMessage.js';

dotenv.config({ quiet: true });

async function seed() {
  const result = await connectPrimary();
  if (result !== 'connected') {
    process.exitCode = 1;
    return;
  }

  // Build the unique indexes first (unique studentId, courseId, studentId + courseId)
  await Promise.all([Student.init(), Course.init(), Attendance.init()]);

  const [studentCount, courseCount, attendanceCount] = await Promise.all([
    Student.countDocuments(),
    Course.countDocuments(),
    Attendance.countDocuments(),
  ]);

  if (studentCount > 0 || courseCount > 0 || attendanceCount > 0) {
    console.log('Demo data already exists');
    console.log(`  students: ${studentCount}, courses: ${courseCount}, attendance: ${attendanceCount}`);
    console.log('Nothing was overwritten');
    return;
  }

  // insertMany() adds many documents in one command (validation still runs)
  const students = await Student.insertMany(demoStudents);
  console.log(`✔ Inserted ${students.length} documents into ${PRIMARY_DB_NAME}.students`);

  const courses = await Course.insertMany(demoCourses);
  console.log(`✔ Inserted ${courses.length} documents into ${PRIMARY_DB_NAME}.courses`);

  const attendance = await Attendance.insertMany(demoAttendance);
  console.log(`✔ Inserted ${attendance.length} documents into ${PRIMARY_DB_NAME}.attendance`);

  console.log('\nDemo data is ready. The professor database was not changed.');
}

seed()
  .catch((error) => {
    console.error(`✖ Seeding failed: ${safeErrorMessage(error)}`);
    process.exitCode = 1;
  })
  .finally(() => primaryConnection.close());
