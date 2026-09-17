import mongoose from 'mongoose';
import { primaryConnection } from '../config/db.js';

const courseSchema = new mongoose.Schema(
  {
    courseId: {
      type: String,
      required: [true, 'Course ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
      match: [/^[A-Z0-9-]{2,15}$/, 'Course ID can only contain letters, numbers and hyphens'],
    },
    courseName: {
      type: String,
      required: [true, 'Course name is required'],
      trim: true,
      minlength: [3, 'Course name must be at least 3 characters'],
    },
    courseCode: {
      type: String,
      required: [true, 'Course code is required'],
      trim: true,
      uppercase: true,
      maxlength: [10, 'Course code must be at most 10 characters'],
    },
    credits: {
      type: Number,
      required: [true, 'Credits are required'],
      min: [1, 'Credits must be between 1 and 6'],
      max: [6, 'Credits must be between 1 and 6'],
      validate: { validator: Number.isInteger, message: 'Credits must be a whole number' },
    },
    faculty: {
      type: String,
      required: [true, 'Faculty name is required'],
      trim: true,
    },
    semester: {
      type: Number,
      required: [true, 'Semester is required'],
      min: [1, 'Semester must be between 1 and 8'],
      max: [8, 'Semester must be between 1 and 8'],
      validate: { validator: Number.isInteger, message: 'Semester must be a whole number' },
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },
  },
  { timestamps: true, versionKey: false }
);

// PRIMARY connection -> student_management.courses
const Course = primaryConnection.model('Course', courseSchema, 'courses');

export default Course;
