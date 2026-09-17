import { getDatabaseStatus, isPrimaryConnected, SIR_DB_NAME } from '../config/db.js';
import { syncAllRecords } from '../services/syncService.js';

// GET /api/database/status – connection status only, never connection strings
export function getStatus(req, res) {
  res.json({ success: true, data: getDatabaseStatus() });
}

// POST /api/database/sync-all – copy every primary record to the professor database.
// This only runs when the user clicks the button on the dashboard.
export async function syncAll(req, res) {
  if (!isPrimaryConnected()) {
    return res.status(503).json({ success: false, message: 'Primary database is not connected' });
  }

  const result = await syncAllRecords();

  if (result.status === 'skipped') {
    return res.status(503).json({
      success: false,
      message: `Nothing was copied because the ${result.reason}`,
      sync: result,
    });
  }
  if (result.status === 'failed') {
    return res.status(502).json({ success: false, message: result.message, sync: result });
  }

  const { students, courses, attendance } = result.counts;
  res.json({
    success: true,
    message: `Copied ${students} students, ${courses} courses and ${attendance} attendance records to ${SIR_DB_NAME}`,
    sync: result,
  });
}
