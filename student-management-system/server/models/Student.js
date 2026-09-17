import mongoose from 'mongoose';
import { primaryConnection } from '../config/db.js';

// A schema describes what a document in the "students" collection looks like.
const studentSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: [true, 'Student ID is required'],
      unique: true, // MongoDB creates a unique index, so two students can't share an ID
      trim: true,
      uppercase: true,
      match: [
        /^[A-Z0-9-]{3,20}$/,
        'Student ID can only contain letters, numbers and hyphens (3–20 characters)',
      ],
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [60, 'Name must be at most 60 characters'],
    },
    age: {
      type: Number,
      required: [true, 'Age is required'],
      min: [15, 'Age must be at least 15'],
      max: [60, 'Age must be at most 60'],
      validate: { validator: Number.isInteger, message: 'Age must be a whole number' },
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [/^[0-9]{10}$/, 'Phone number must be exactly 10 digits'],
    },
    gender: {
      type: String,
      required: [true, 'Gender is required'],
      enum: { values: ['Male', 'Female', 'Other'], message: 'Gender must be Male, Female or Other' },
    },
    branch: {
      type: String,
      required: [true, 'Branch is required'],
      trim: true,
    },
    semester: {
      type: Number,
      required: [true, 'Semester is required'],
      min: [1, 'Semester must be between 1 and 8'],
      max: [8, 'Semester must be between 1 and 8'],
      validate: { validator: Number.isInteger, message: 'Semester must be a whole number' },
    },
    cgpa: {
      type: Number,
      required: [true, 'CGPA is required'],
      min: [0, 'CGPA must be between 0 and 10'],
      max: [10, 'CGPA must be between 0 and 10'],
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: String,
      default: 'Aayushi',
    },
    source: {
      type: String,
      default: 'Student Management System',
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
    versionKey: false, // don't add the internal "__v" field, so documents look clean in Atlas
  }
);

// The model is bound to the PRIMARY connection -> student_management.students
const Student = primaryConnection.model('Student', studentSchema, 'students');

export default Student;
