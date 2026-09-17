import { Router } from 'express';
import {
  getStudents,
  getStudentFilters,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
} from '../controllers/studentController.js';

const router = Router();

router.get('/', getStudents); // READ ALL
router.get('/filters', getStudentFilters); // must come before '/:id'
router.get('/:id', getStudentById); // READ ONE
router.post('/', createStudent); // CREATE
router.put('/:id', updateStudent); // UPDATE
router.delete('/:id', deleteStudent); // DELETE

export default router;
