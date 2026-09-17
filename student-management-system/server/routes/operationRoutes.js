import { Router } from 'express';
import {
  getOperationCatalog,
  runComparisonOperator,
  runLogicalOperator,
  runOtherOperation,
} from '../controllers/operationController.js';

const router = Router();

// Only predefined, read-only queries – see controllers/operationController.js
router.get('/', getOperationCatalog);
router.get('/comparison/:operator', runComparisonOperator); // lt, gt, lte, gte, eq
router.get('/logical/:operator', runLogicalOperator); // and, or, nor, not
router.get('/other/:operation', runOtherOperation); // find, findOne, countDocuments, sort, limit

export default router;
