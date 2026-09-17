import { Router } from 'express';
import { getStatus, syncAll } from '../controllers/databaseController.js';

const router = Router();

router.get('/status', getStatus);
router.post('/sync-all', syncAll);

export default router;
