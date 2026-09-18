import Student from '../models/Student.js';
import Course from '../models/Course.js';
import Attendance, { LOW_ATTENDANCE_THRESHOLD } from '../models/Attendance.js';
import { roundTo2 } from '../utils/helpers.js';
import { buildInsights } from '../services/insightService.js';

/*
 * ACADEMIC ANALYTICS
 * ------------------
 * One endpoint that returns every figure the analytics screens need, so the app
 * makes a single request instead of one per chart.
 *
 * Every number below is derived from the records actually stored in the database.
 * Nothing is estimated, projected or filled in: where there is no data, the
 * field is null or the list is empty and the interface shows an empty state.
 */

// Academic performance bands (CGPA)
const CGPA_BANDS = [
  { label: 'Below 7.0', min: 0, max: 7 },
  { label: '7.0 – 7.9', min: 7, max: 8 },
  { label: '8.0 – 8.9', min: 8, max: 9 },
  { label: '9.0 – 10', min: 9, max: 10.001 },
];

// Attendance bands. "low" is the threshold the institution acts on.
const ATTENDANCE_BANDS = [
  { key: 'good', label: 'Good', range: '85% and above', min: 85, max: 100.001 },
  { key: 'average', label: 'Average', range: `${LOW_ATTENDANCE_THRESHOLD}% – 84%`, min: LOW_ATTENDANCE_THRESHOLD, max: 85 },
  { key: 'low', label: 'At risk', range: `Below ${LOW_ATTENDANCE_THRESHOLD}%`, min: -1, max: LOW_ATTENDANCE_THRESHOLD },
];

const average = (values) => (values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null);
const round = (value) => (value == null ? null : roundTo2(value));

// Sorts a band list into the fixed display order regardless of aggregation order
function toBands(bandDefinitions, values, field = null) {
  return bandDefinitions.map((band) => {
    const { min, max, ...rest } = band;
    const count = values.filter((item) => {
      const value = field ? item[field] : item;
      return value != null && value >= min && value < max;
    }).length;
    return { ...rest, count };
  });
}

// GET /api/analytics
export async function getAnalytics(req, res) {
  const [students, courses, attendance] = await Promise.all([
    Student.find({}, { name: 1, studentId: 1, branch: 1, semester: 1, cgpa: 1, city: 1, createdAt: 1, updatedAt: 1 })
      .lean(),
    Course.find({}).lean(),
    // One join so every attendance record carries the student's name and branch
    Attendance.aggregate([
      {
        $lookup: { from: 'students', localField: 'studentId', foreignField: 'studentId', as: 'student' },
      },
      {
        $addFields: {
          studentName: { $ifNull: [{ $arrayElemAt: ['$student.name', 0] }, 'Unknown student'] },
          branch: { $arrayElemAt: ['$student.branch', 0] },
        },
      },
      { $project: { student: 0 } },
    ]),
  ]);

  // ---------------------------------------------------------------------
  // Per-student attendance (one student can appear in several courses)
  // ---------------------------------------------------------------------
  const byStudent = new Map();
  for (const record of attendance) {
    const entry = byStudent.get(record.studentId) ?? { percentages: [], courses: 0 };
    entry.percentages.push(record.percentage);
    entry.courses += 1;
    byStudent.set(record.studentId, entry);
  }

  const studentAttendance = students.map((student) => {
    const entry = byStudent.get(student.studentId);
    return {
      _id: student._id,
      studentId: student.studentId,
      name: student.name,
      branch: student.branch,
      semester: student.semester,
      cgpa: student.cgpa,
      coursesTracked: entry?.courses ?? 0,
      averageAttendance: entry ? round(average(entry.percentages)) : null,
    };
  });

  const tracked = studentAttendance.filter((student) => student.averageAttendance != null);
  const atRisk = tracked
    .filter((student) => student.averageAttendance < LOW_ATTENDANCE_THRESHOLD)
    .sort((a, b) => a.averageAttendance - b.averageAttendance);

  // ---------------------------------------------------------------------
  // Per-course attendance
  // ---------------------------------------------------------------------
  const byCourse = new Map();
  for (const record of attendance) {
    const entry = byCourse.get(record.courseId) ?? { percentages: [], low: 0 };
    entry.percentages.push(record.percentage);
    if (record.percentage < LOW_ATTENDANCE_THRESHOLD) entry.low += 1;
    byCourse.set(record.courseId, entry);
  }

  const courseStats = courses
    .map((course) => {
      const entry = byCourse.get(course.courseId);
      return {
        courseId: course.courseId,
        courseName: course.courseName,
        courseCode: course.courseCode,
        faculty: course.faculty,
        department: course.department,
        semester: course.semester,
        credits: course.credits,
        enrolled: entry?.percentages.length ?? 0,
        averageAttendance: entry ? round(average(entry.percentages)) : null,
        atRisk: entry?.low ?? 0,
      };
    })
    .sort((a, b) => b.enrolled - a.enrolled || a.courseName.localeCompare(b.courseName));

  const coursesWithData = courseStats.filter((course) => course.averageAttendance != null);

  // ---------------------------------------------------------------------
  // Academic performance by branch and semester
  // ---------------------------------------------------------------------
  const attendanceByStudentId = new Map(tracked.map((student) => [student.studentId, student.averageAttendance]));

  function groupBy(key) {
    const groups = new Map();
    for (const student of students) {
      const value = student[key];
      const entry = groups.get(value) ?? { cgpas: [], attendances: [] };
      entry.cgpas.push(student.cgpa);
      const studentAverage = attendanceByStudentId.get(student.studentId);
      if (studentAverage != null) entry.attendances.push(studentAverage);
      groups.set(value, entry);
    }
    return [...groups.entries()].map(([value, entry]) => ({
      [key]: value,
      students: entry.cgpas.length,
      averageCgpa: round(average(entry.cgpas)),
      averageAttendance: round(average(entry.attendances)),
    }));
  }

  const byBranch = groupBy('branch').sort((a, b) => b.students - a.students || a.branch.localeCompare(b.branch));
  const bySemester = groupBy('semester').sort((a, b) => a.semester - b.semester);

  // ---------------------------------------------------------------------
  // Headline figures
  // ---------------------------------------------------------------------
  const averageCgpa = round(average(students.map((student) => student.cgpa)));
  const averageAttendance = round(average(attendance.map((record) => record.percentage)));

  const overview = {
    totalStudents: students.length,
    totalCourses: courses.length,
    totalRecords: attendance.length,
    averageCgpa,
    averageAttendance,
    studentsTracked: tracked.length,
    studentsAtRisk: atRisk.length,
    branches: byBranch.length,
    coursesWithAttendance: coursesWithData.length,
  };

  const performance = {
    bands: toBands(CGPA_BANDS, students, 'cgpa'),
    byBranch,
    bySemester,
    topPerformers: [...students]
      .sort((a, b) => b.cgpa - a.cgpa || a.name.localeCompare(b.name))
      .slice(0, 5)
      .map((student) => ({
        _id: student._id,
        studentId: student.studentId,
        name: student.name,
        branch: student.branch,
        semester: student.semester,
        cgpa: student.cgpa,
        averageAttendance: attendanceByStudentId.get(student.studentId) ?? null,
      })),
    // Students who are weak on both measures — the ones worth a conversation
    needsAttention: studentAttendance
      .filter(
        (student) =>
          student.cgpa < 7 ||
          (student.averageAttendance != null && student.averageAttendance < LOW_ATTENDANCE_THRESHOLD)
      )
      .sort((a, b) => a.cgpa - b.cgpa)
      .slice(0, 8),
  };

  const attendanceSection = {
    threshold: LOW_ATTENDANCE_THRESHOLD,
    bands: toBands(ATTENDANCE_BANDS, attendance, 'percentage'),
    byCourse: courseStats,
    atRisk: atRisk.slice(0, 10),
    recent: [...attendance]
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 6)
      .map((record) => ({
        _id: record._id,
        studentId: record.studentId,
        studentName: record.studentName,
        courseId: record.courseId,
        courseName: record.courseName,
        attendedClasses: record.attendedClasses,
        totalClasses: record.totalClasses,
        percentage: record.percentage,
        updatedAt: record.updatedAt,
      })),
  };

  const recentStudents = [...students]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 6)
    .map((student) => ({
      ...student,
      averageAttendance: attendanceByStudentId.get(student.studentId) ?? null,
    }));

  res.json({
    success: true,
    data: {
      generatedAt: new Date().toISOString(),
      overview,
      attendance: attendanceSection,
      performance,
      recentStudents,
      insights: buildInsights({
        overview,
        students: studentAttendance,
        atRisk,
        courseStats: coursesWithData,
        byBranch,
        threshold: LOW_ATTENDANCE_THRESHOLD,
      }),
    },
  });
}
