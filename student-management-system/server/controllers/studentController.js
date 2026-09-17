import Student from '../models/Student.js';
import Attendance from '../models/Attendance.js';
import { syncStudentCreate, syncStudentUpdate, syncStudentDelete } from '../services/syncService.js';
import { pickFields, escapeRegex, readString, readPositiveInt, roundTo2 } from '../utils/helpers.js';

// Fields the form is allowed to change. studentId can only be set when creating a student,
// because it is the stable ID used for attendance records and for syncing.
const EDITABLE_FIELDS = [
  'name',
  'age',
  'email',
  'phone',
  'gender',
  'branch',
  'semester',
  'cgpa',
  'city',
  'address',
];
const SORTABLE_FIELDS = ['name', 'cgpa', 'age', 'semester', 'createdAt'];

// Note: Express 5 automatically passes errors from async functions to the
// error handler (middleware/errorHandler.js), so we don't need try/catch everywhere.

// READ ALL – GET /api/students?search=&branch=&city=&sortBy=cgpa&order=desc&page=1&limit=10
export async function getStudents(req, res) {
  const search = readString(req.query.search).trim();
  const branch = readString(req.query.branch);
  const city = readString(req.query.city);
  const sortBy = SORTABLE_FIELDS.includes(req.query.sortBy) ? req.query.sortBy : 'createdAt';
  const sortOrder = req.query.order === 'asc' ? 1 : -1; // 1 = ascending, -1 = descending
  const page = readPositiveInt(req.query.page, 1);
  const limit = Math.min(readPositiveInt(req.query.limit, 10), 100);

  // Build the MongoDB filter step by step
  const filter = {};
  if (search) {
    // Case-insensitive "contains" search on name OR studentId
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: pattern }, { studentId: pattern }];
  }
  if (branch) filter.branch = branch;
  if (city) filter.city = city;

  // Run find() and countDocuments() at the same time
  const [students, total] = await Promise.all([
    Student.find(filter)
      .sort({ [sortBy]: sortOrder, _id: 1 }) // _id keeps the order stable between pages
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Student.countDocuments(filter),
  ]);

  // Average attendance for the students on this page (aggregation pipeline: $match -> $group)
  const averages = await Attendance.aggregate([
    { $match: { studentId: { $in: students.map((student) => student.studentId) } } },
    { $group: { _id: '$studentId', averageAttendance: { $avg: '$percentage' } } },
  ]);
  const averageByStudentId = new Map(averages.map((item) => [item._id, roundTo2(item.averageAttendance)]));

  res.json({
    success: true,
    data: students.map((student) => ({
      ...student,
      averageAttendance: averageByStudentId.get(student.studentId) ?? null,
    })),
    pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
  });
}

// GET /api/students/filters – distinct() returns every unique value only once
export async function getStudentFilters(req, res) {
  const [branches, cities] = await Promise.all([Student.distinct('branch'), Student.distinct('city')]);

  res.json({ success: true, data: { branches: branches.sort(), cities: cities.sort() } });
}

// READ ONE – GET /api/students/:id
export async function getStudentById(req, res) {
  const student = await Student.findById(req.params.id).lean();

  if (!student) {
    return res.status(404).json({ success: false, message: 'Student not found' });
  }

  const attendance = await Attendance.find({ studentId: student.studentId }).sort({ courseId: 1 }).lean();

  res.json({ success: true, data: { ...student, attendance } });
}

// CREATE – POST /api/students
export async function createStudent(req, res) {
  const studentData = pickFields(req.body, ['studentId', ...EDITABLE_FIELDS]);

  // 1. Insert into the PRIMARY database (validation runs automatically)
  const student = await Student.create(studentData);

  // 2. Copy it to the professor's database
  const sync = await syncStudentCreate(student);

  res.status(201).json({ success: true, message: 'Student added successfully', data: student, sync });
}

// UPDATE – PUT /api/students/:id
export async function updateStudent(req, res) {
  const student = await Student.findById(req.params.id);

  if (!student) {
    return res.status(404).json({ success: false, message: 'Student not found' });
  }

  // 1. Change the allowed fields and save (save() runs all schema validators)
  student.set(pickFields(req.body, EDITABLE_FIELDS));
  await student.save();

  // 2. Update the copy in the professor's database
  const sync = await syncStudentUpdate(student);

  res.json({ success: true, message: 'Student updated successfully', data: student, sync });
}

// DELETE – DELETE /api/students/:id
export async function deleteStudent(req, res) {
  // 1. Delete from the PRIMARY database
  const student = await Student.findByIdAndDelete(req.params.id);

  if (!student) {
    return res.status(404).json({ success: false, message: 'Student not found' });
  }

  // Also delete this student's attendance so no orphan records are left behind
  const { deletedCount } = await Attendance.deleteMany({ studentId: student.studentId });

  // 2. Delete the matching copies from the professor's database
  const sync = await syncStudentDelete(student);

  res.json({
    success: true,
    message: 'Student deleted successfully',
    data: { _id: student._id, studentId: student.studentId, attendanceRecordsDeleted: deletedCount },
    sync,
  });
}
