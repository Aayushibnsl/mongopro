import Student from '../models/Student.js';
import Course from '../models/Course.js';
import Attendance, { LOW_ATTENDANCE_THRESHOLD } from '../models/Attendance.js';
import { roundTo2 } from '../utils/helpers.js';

// CGPA groups, counted with comparison operators ($lt, $gte)
const CGPA_BANDS = [
  { label: 'Below 7.0', filter: { cgpa: { $lt: 7 } } },
  { label: '7.0 – 7.9', filter: { cgpa: { $gte: 7, $lt: 8 } } },
  { label: '8.0 – 8.9', filter: { cgpa: { $gte: 8, $lt: 9 } } },
  { label: '9.0 – 10', filter: { cgpa: { $gte: 9 } } },
];

// Attendance groups (each attendance record is one student in one course)
const ATTENDANCE_BANDS = [
  { key: 'good', label: 'Good', range: '85% and above', filter: { percentage: { $gte: 85 } } },
  {
    key: 'average',
    label: 'Average',
    range: `${LOW_ATTENDANCE_THRESHOLD}% – 84%`,
    filter: { percentage: { $gte: LOW_ATTENDANCE_THRESHOLD, $lt: 85 } },
  },
  {
    key: 'low',
    label: 'Low',
    range: `Below ${LOW_ATTENDANCE_THRESHOLD}%`,
    filter: { percentage: { $lt: LOW_ATTENDANCE_THRESHOLD } },
  },
];

function countBands(Model, bands) {
  return Promise.all(
    bands.map(async ({ filter, ...band }) => ({ ...band, count: await Model.countDocuments(filter) }))
  );
}

// GET /api/dashboard
export async function getDashboard(req, res) {
  const [
    totalStudents,
    totalCourses,
    totalAttendanceRecords,
    cgpaAverageResult,
    attendanceAverageResult,
    recentStudents,
    branchDistribution,
    cgpaOverview,
    attendanceOverview,
  ] = await Promise.all([
    Student.countDocuments(),
    Course.countDocuments(),
    Attendance.countDocuments(),

    // $group with _id: null puts every document into one group, then $avg averages a field
    Student.aggregate([{ $group: { _id: null, average: { $avg: '$cgpa' } } }]),
    Attendance.aggregate([{ $group: { _id: null, average: { $avg: '$percentage' } } }]),

    // Newest students first
    Student.find({}, { name: 1, studentId: 1, branch: 1, semester: 1, cgpa: 1, city: 1, createdAt: 1 })
      .sort({ createdAt: -1, _id: -1 })
      .limit(5)
      .lean(),

    // Count students in each branch
    Student.aggregate([
      { $group: { _id: '$branch', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $project: { _id: 0, branch: '$_id', count: 1 } },
    ]),

    countBands(Student, CGPA_BANDS),
    countBands(Attendance, ATTENDANCE_BANDS),
  ]);

  const averageCgpa = cgpaAverageResult[0]?.average;
  const averageAttendance = attendanceAverageResult[0]?.average;

  res.json({
    success: true,
    data: {
      totalStudents,
      totalCourses,
      totalAttendanceRecords,
      averageCgpa: averageCgpa == null ? null : roundTo2(averageCgpa),
      averageAttendance: averageAttendance == null ? null : roundTo2(averageAttendance),
      recentStudents,
      branchDistribution,
      cgpaOverview,
      attendanceOverview,
    },
  });
}
