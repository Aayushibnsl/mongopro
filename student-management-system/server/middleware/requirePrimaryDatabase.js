import { ensurePrimaryConnection, getDatabaseStatus } from '../config/db.js';

// Makes sure the primary database is connected before a route runs.
// The first request opens the connection; later requests reuse it.
// If it can't connect, the request stops early with a clear message instead of timing out.
export async function requirePrimaryDatabase(req, res, next) {
  const result = await ensurePrimaryConnection();

  if (result !== 'connected') {
    return res.status(503).json({
      success: false,
      message: `Primary database is not connected. ${getDatabaseStatus().primary.message}`,
    });
  }
  next();
}
