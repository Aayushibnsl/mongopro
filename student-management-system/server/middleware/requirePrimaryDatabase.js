import { isPrimaryConnected } from '../config/db.js';

// Stops API requests early with a clear message when the primary database is not connected,
// instead of letting them wait and time out.
export function requirePrimaryDatabase(req, res, next) {
  if (!isPrimaryConnected()) {
    return res.status(503).json({
      success: false,
      message:
        'Primary database is not connected. Check PRIMARY_MONGODB_URI in server/.env and Atlas Network Access.',
    });
  }
  next();
}
