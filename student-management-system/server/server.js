import dotenv from 'dotenv';
import express from 'express';

import { connectPrimary, connectSir, PRIMARY_DB_NAME, SIR_DB_NAME } from './config/db.js';
import { requirePrimaryDatabase } from './middleware/requirePrimaryDatabase.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import studentRoutes from './routes/studentRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import operationRoutes from './routes/operationRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import databaseRoutes from './routes/databaseRoutes.js';

// Load variables from server/.env into process.env
dotenv.config({ quiet: true });

const PORT = Number(process.env.PORT) || 5000;
const RETRY_DELAY_MS = 30000;

const app = express();

// Read JSON request bodies (req.body)
app.use(express.json());

// Print one short line for every API request, e.g. "GET /api/students 200 (35 ms)"
app.use('/api', (req, res, next) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} (${Date.now() - startedAt} ms)`);
  });
  next();
});

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Student Management System API is running. Open http://localhost:5173 for the app.',
  });
});

// These routes work even when the primary database is down
app.get('/api/health', (req, res) => res.json({ success: true, message: 'Server is running' }));
app.use('/api/database', databaseRoutes);

// Every route below needs the primary database
app.use('/api', requirePrimaryDatabase);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/operations', operationRoutes);

app.use('/api', notFound);
app.use(errorHandler);

// Try to connect; if Atlas can't be reached (e.g. Network Access not set yet), try again later.
async function connectWithRetry(connect, label) {
  const result = await connect();
  if (result === 'failed') {
    console.log(`  Retrying ${label} connection in ${RETRY_DELAY_MS / 1000} seconds...`);
    setTimeout(() => connectWithRetry(connect, label), RETRY_DELAY_MS);
  }
}

// In Express 5 the listen callback receives an error if the server could not start
app.listen(PORT, (error) => {
  if (error) {
    if (error.code === 'EADDRINUSE') {
      console.error(`\n✖ Port ${PORT} is already in use.`);
      console.error('  On macOS, port 5000 is often used by "AirPlay Receiver".');
      console.error('  Fix: System Settings → General → AirDrop & Handoff → turn off AirPlay Receiver,');
      console.error(
        '  or set PORT=5001 in server/.env and start the client with BACKEND_URL=http://localhost:5001\n'
      );
    } else {
      console.error(`✖ Server could not start: ${error.message}`);
    }
    process.exit(1);
  }

  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`   Primary database: ${PRIMARY_DB_NAME}   |   Professor database: ${SIR_DB_NAME}\n`);

  connectWithRetry(connectPrimary, 'Primary MongoDB');
  connectWithRetry(connectSir, 'Sir MongoDB');
});
