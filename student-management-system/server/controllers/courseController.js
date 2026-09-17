import Course from '../models/Course.js';
import Attendance from '../models/Attendance.js';
import { syncCourseCreate, syncCourseUpdate, syncCourseDelete } from '../services/syncService.js';
import { pickFields, escapeRegex, readString } from '../utils/helpers.js';

// courseId is the stable ID, so it can only be set when the course is created
const EDITABLE_FIELDS = ['courseName', 'courseCode', 'credits', 'faculty', 'semester', 'department'];

// READ ALL – GET /api/courses?search=dbms
export async function getCourses(req, res) {
  const search = readString(req.query.search).trim();

  const filter = {};
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [
      { courseName: pattern },
      { courseCode: pattern },
      { courseId: pattern },
      { faculty: pattern },
      { department: pattern },
    ];
  }

  const courses = await Course.find(filter).sort({ semester: 1, courseId: 1 }).lean();

  res.json({ success: true, data: courses, count: courses.length });
}

// READ ONE – GET /api/courses/:id
export async function getCourseById(req, res) {
  const course = await Course.findById(req.params.id).lean();

  if (!course) {
    return res.status(404).json({ success: false, message: 'Course not found' });
  }

  res.json({ success: true, data: course });
}

// CREATE – POST /api/courses
export async function createCourse(req, res) {
  const course = await Course.create(pickFields(req.body, ['courseId', ...EDITABLE_FIELDS]));
  const sync = await syncCourseCreate(course);

  res.status(201).json({ success: true, message: 'Course added successfully', data: course, sync });
}

// UPDATE – PUT /api/courses/:id
export async function updateCourse(req, res) {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return res.status(404).json({ success: false, message: 'Course not found' });
  }

  course.set(pickFields(req.body, EDITABLE_FIELDS));
  await course.save();

  // Attendance records keep a copy of the course name – updateMany() keeps them in step
  await Attendance.updateMany({ courseId: course.courseId }, { $set: { courseName: course.courseName } });

  const sync = await syncCourseUpdate(course);

  res.json({ success: true, message: 'Course updated successfully', data: course, sync });
}

// DELETE – DELETE /api/courses/:id
export async function deleteCourse(req, res) {
  const course = await Course.findByIdAndDelete(req.params.id);

  if (!course) {
    return res.status(404).json({ success: false, message: 'Course not found' });
  }

  // Attendance for a deleted course has no meaning anymore
  const { deletedCount } = await Attendance.deleteMany({ courseId: course.courseId });
  const sync = await syncCourseDelete(course);

  res.json({
    success: true,
    message: 'Course deleted successfully',
    data: { _id: course._id, courseId: course.courseId, attendanceRecordsDeleted: deletedCount },
    sync,
  });
}
