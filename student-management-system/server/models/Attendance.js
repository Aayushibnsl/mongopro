import mongoose from 'mongoose';
import { primaryConnection } from '../config/db.js';

export const LOW_ATTENDANCE_THRESHOLD = 75;

const attendanceSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: [true, 'Student is required'],
      trim: true,
      uppercase: true,
    },
    courseId: {
      type: String,
      required: [true, 'Course is required'],
      trim: true,
      uppercase: true,
    },
    courseName: {
      type: String,
      trim: true,
    },
    totalClasses: {
      type: Number,
      required: [true, 'Total classes is required'],
      min: [1, 'Total classes must be at least 1'],
      max: [500, 'Total classes must be at most 500'],
      validate: { validator: Number.isInteger, message: 'Total classes must be a whole number' },
    },
    attendedClasses: {
      type: Number,
      required: [true, 'Attended classes is required'],
      min: [0, 'Attended classes cannot be negative'],
      validate: [
        { validator: Number.isInteger, message: 'Attended classes must be a whole number' },
        {
          // `this` is the document being saved
          validator: function (value) {
            return value <= this.totalClasses;
          },
          message: 'Attended classes cannot be more than total classes',
        },
      ],
    },
    percentage: {
      type: Number,
      min: 0,
      max: 100,
    },
  },
  { timestamps: true, versionKey: false }
);

// One attendance record per student per course (compound unique index)
attendanceSchema.index({ studentId: 1, courseId: 1 }, { unique: true });

// Calculate the percentage automatically before every save,
// so it is always correct, e.g. 35 / 40 classes -> 87.5
attendanceSchema.pre('validate', function () {
  if (this.totalClasses > 0 && this.attendedClasses >= 0) {
    this.percentage = Math.round((this.attendedClasses / this.totalClasses) * 10000) / 100;
  }
});

// PRIMARY connection -> student_management.attendance
const Attendance = primaryConnection.model('Attendance', attendanceSchema, 'attendance');

export default Attendance;
