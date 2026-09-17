import Attendance, { LOW_ATTENDANCE_THRESHOLD } from '../models/Attendance.js';
import Student from '../models/Student.js';
import Course from '../models/Course.js';
import { syncAttendanceCreate, syncAttendanceUpdate, syncAttendanceDelete } from '../services/syncService.js';
import { pickFields, readString } from '../utils/helpers.js';

// Once a record exists, only the class counts can change (student + course identify the record)
const EDITABLE_FIELDS = ['totalClasses', 'attendedClasses'];

// READ ALL – GET /api/attendance?courseId=CS501&studentId=PCEA24CY002&low=true
export async function getAttendance(req, res) {
  const courseId = readString(req.query.courseId).trim().toUpperCase();
  const studentId = readString(req.query.studentId).trim().toUpperCase();

  const filter = {};
  if (courseId) filter.courseId = courseId;
  if (studentId) filter.studentId = studentId;
  if (req.query.low === 'true') filter.percentage = { $lt: LOW_ATTENDANCE_THRESHOLD };

  // Aggregation pipeline:
  //   $match  -> keep only the records we want
  //   $lookup -> join each record with its student (like a JOIN in SQL) to get the name
  const records = await Attendance.aggregate([
    { $match: filter },
    {
      $lookup: {
        from: 'students',
        localField: 'studentId',
        foreignField: 'studentId',
        as: 'student',
      },
    },
    { $addFields: { studentName: { $ifNull: [{ $arrayElemAt: ['$student.name', 0] }, 'Unknown student'] } } },
    { $project: { student: 0 } },
    { $sort: { studentName: 1, courseId: 1 } },
  ]);

  res.json({ success: true, data: records, count: records.length });
}

// READ ONE – GET /api/attendance/:id
export async function getAttendanceById(req, res) {
  const record = await Attendance.findById(req.params.id).lean();

  if (!record) {
    return res.status(404).json({ success: false, message: 'Attendance record not found' });
  }

  const student = await Student.findOne({ studentId: record.studentId }, { name: 1 }).lean();

  res.json({ success: true, data: { ...record, studentName: student?.name ?? 'Unknown student' } });
}

// CREATE – POST /api/attendance
export async function createAttendance(req, res) {
  const data = pickFields(req.body, ['studentId', 'courseId', ...EDITABLE_FIELDS]);
  const studentId = readString(data.studentId).trim().toUpperCase();
  const courseId = readString(data.courseId).trim().toUpperCase();

  if (!studentId || !courseId) {
    return res.status(400).json({ success: false, message: 'Please select a student and a course' });
  }

  // Make sure both the student and the course really exist
  const [student, course] = await Promise.all([
    Student.findOne({ studentId }).lean(),
    Course.findOne({ courseId }).lean(),
  ]);

  if (!student) {
    return res.status(400).json({ success: false, message: `No student found with Student ID ${studentId}` });
  }
  if (!course) {
    return res.status(400).json({ success: false, message: `No course found with Course ID ${courseId}` });
  }

  // The percentage is calculated automatically by the schema (see models/Attendance.js)
  const record = await Attendance.create({ ...data, studentId, courseId, courseName: course.courseName });
  const sync = await syncAttendanceCreate(record);

  res.status(201).json({
    success: true,
    message: 'Attendance added successfully',
    data: { ...record.toObject(), studentName: student.name },
    sync,
  });
}

// UPDATE – PUT /api/attendance/:id
export async function updateAttendance(req, res) {
  const record = await Attendance.findById(req.params.id);

  if (!record) {
    return res.status(404).json({ success: false, message: 'Attendance record not found' });
  }

  record.set(pickFields(req.body, EDITABLE_FIELDS));
  await record.save(); // percentage is recalculated before saving

  const sync = await syncAttendanceUpdate(record);

  res.json({ success: true, message: 'Attendance updated successfully', data: record, sync });
}

// DELETE – DELETE /api/attendance/:id
export async function deleteAttendance(req, res) {
  const record = await Attendance.findByIdAndDelete(req.params.id);

  if (!record) {
    return res.status(404).json({ success: false, message: 'Attendance record not found' });
  }

  const sync = await syncAttendanceDelete(record);

  res.json({ success: true, message: 'Attendance deleted successfully', data: { _id: record._id }, sync });
}
