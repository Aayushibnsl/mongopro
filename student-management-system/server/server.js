import dotenv from 'dotenv';
import express from 'express';

import { ensurePrimaryConnection, ensureSirConnection, PRIMARY_DB_NAME, SIR_DB_NAME } from './config/db.js';
import { requirePrimaryDatabase } from './middleware/requirePrimaryDatabase.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import studentRoutes from './routes/studentRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import databaseRoutes from './routes/databaseRoutes.js';

// Load variables from server/.env into process.env
dotenv.config({ quiet: true });

const PORT = Number(process.env.PORT) || 5000;

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
    message: 'Academic Intelligence Platform API is running. Open http://localhost:5173 for the app.',
  });
});

// These routes work even when the primary database is down
app.get('/api/health', (req, res) => res.json({ success: true, message: 'Server is running' }));
app.use('/api/database', databaseRoutes);

// Every route below needs the primary database
app.use('/api', requirePrimaryDatabase);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/attendance', attendanceRoutes);

app.use('/api', notFound);
app.use(errorHandler);

// ON YOUR COMPUTER: start a normal server on PORT.
// ON VERCEL: Vercel runs the exported app for each request itself (see `export default app`),
// and the database connects on the first request (see config/db.js).
if (!process.env.VERCEL) {
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

    // Connect right away so you see the result in the terminal.
    // If it fails, the next request tries again automatically.
    ensurePrimaryConnection();
    ensureSirConnection();
  });
}

export default app;
