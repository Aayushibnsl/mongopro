import mongoose from 'mongoose';
import { safeErrorMessage, connectionHint } from '../utils/safeErrorMessage.js';

/*
 * This app talks to TWO MongoDB Atlas databases:
 *
 *   PRIMARY DB  -> your own Atlas cluster, database "student_management"
 *                  (the source of truth – every page reads from here)
 *
 *   SIR DB      -> the professor's existing Atlas cluster, database "PCEA24CY002"
 *                  (receives synchronized copies so the professor can inspect them)
 *
 * mongoose.connect() only supports one default connection, so we use
 * mongoose.createConnection() to keep two independent connections.
 */

// Database names are fixed on purpose. The `dbName` option below makes sure we
// only ever use these two databases, even if a connection string mentions another one.
export const PRIMARY_DB_NAME = 'student_management';
export const SIR_DB_NAME = 'PCEA24CY002';

// The only collections the app may ever write to in the professor's database.
export const SIR_ALLOWED_COLLECTIONS = ['students', 'courses', 'attendance'];

export const primaryConnection = mongoose.createConnection();
export const sirConnection = mongoose.createConnection();

// readyState 1 means "connected" in Mongoose
const CONNECTED = 1;

// After a failed connection attempt, wait this long before trying again
const RETRY_COOLDOWN_MS = 15000;

// Extra information that readyState alone can't tell us
const primaryState = {
  lastErrorHint: '', // why the last connection attempt failed (never contains credentials)
};
const sirState = {
  databaseFound: false, // does PCEA24CY002 already exist on the professor's cluster?
  lastErrorHint: '',
};

/**
 * Connect to your own Atlas database.
 * Returns 'connected', 'failed' or 'missing' (no connection string in .env).
 */
export async function connectPrimary() {
  const uri = process.env.PRIMARY_MONGODB_URI;

  if (!uri) {
    console.error('✖ PRIMARY_MONGODB_URI is empty. Add your Atlas connection string to server/.env');
    return 'missing';
  }

  try {
    await primaryConnection.openUri(uri, {
      dbName: PRIMARY_DB_NAME,
      serverSelectionTimeoutMS: 10000,
    });
    primaryState.lastErrorHint = '';
    console.log(`✔ Primary MongoDB connected (database: ${PRIMARY_DB_NAME})`);
    return 'connected';
  } catch (error) {
    primaryState.lastErrorHint = connectionHint(error);
    console.error(`✖ Primary MongoDB connection failed: ${safeErrorMessage(error)}`);
    console.error(`  Hint: ${primaryState.lastErrorHint}`);
    return 'failed';
  }
}

/**
 * Connect to the professor's Atlas cluster.
 * If this fails, the app keeps working with the primary database only.
 */
export async function connectSir() {
  const uri = process.env.SIR_MONGODB_URI;

  if (!uri) {
    console.warn('! SIR_MONGODB_URI is empty. Syncing to the professor database is turned off.');
    return 'missing';
  }

  try {
    await sirConnection.openUri(uri, {
      dbName: SIR_DB_NAME,
      serverSelectionTimeoutMS: 10000,
      // Never let Mongoose create collections or indexes on the professor's cluster by itself
      autoCreate: false,
      autoIndex: false,
    });

    await checkSirDatabaseExists();
    sirState.lastErrorHint = '';

    if (sirState.databaseFound) {
      console.log(`✔ Sir MongoDB connected (database: ${SIR_DB_NAME})`);
    } else {
      console.warn(
        `! Sir MongoDB connected, but database "${SIR_DB_NAME}" was not found on that cluster.\n` +
          '  Sync is paused – this app will NOT create the database. Ask your professor to create it.'
      );
    }
    return 'connected';
  } catch (error) {
    sirState.lastErrorHint = connectionHint(error);
    console.error(`✖ Sir MongoDB connection failed: ${safeErrorMessage(error)}`);
    console.error(`  Hint: ${sirState.lastErrorHint}`);
    console.error('  The app will keep working with the primary database only.');
    return 'failed';
  }
}

/*
 * CONNECTING ON DEMAND (works on your computer AND on Vercel)
 * -----------------------------------------------------------
 * On Vercel the backend runs as a serverless function: there is no server that
 * starts once and keeps running, so "connect at startup" is not enough.
 * Instead, requests call ensurePrimaryConnection() / ensureSirConnection():
 *   - the first call opens the connection,
 *   - later calls reuse the same connection,
 *   - if connecting failed, we wait RETRY_COOLDOWN_MS before trying again,
 *     so every request doesn't have to wait for another slow attempt.
 */
function connectOnDemand(connect) {
  let attempt = null; // the current (or the successful) connection attempt
  let lastFailureAt = 0;

  return async function ensureConnection() {
    if (attempt) return attempt;
    if (Date.now() - lastFailureAt < RETRY_COOLDOWN_MS) return 'failed';

    attempt = connect();
    const result = await attempt;

    if (result !== 'connected') {
      attempt = null; // allow a new attempt later
      if (result === 'failed') lastFailureAt = Date.now();
    }
    return result;
  };
}

// Each returns 'connected', 'failed' or 'missing'
export const ensurePrimaryConnection = connectOnDemand(connectPrimary);
export const ensureSirConnection = connectOnDemand(connectSir);

/**
 * MongoDB creates a database automatically the first time you write to it.
 * We do NOT want to create PCEA24CY002 by accident, so before syncing we check
 * that it already exists. A database exists only if it has at least one collection.
 */
export async function checkSirDatabaseExists() {
  if (sirConnection.readyState !== CONNECTED) return false;
  if (sirState.databaseFound) return true;

  const collections = await sirConnection.db.listCollections({}, { nameOnly: true }).toArray();
  sirState.databaseFound = collections.length > 0;
  return sirState.databaseFound;
}

export function isPrimaryConnected() {
  return primaryConnection.readyState === CONNECTED;
}

export function isSirConnected() {
  return sirConnection.readyState === CONNECTED;
}

export function isSirConfigured() {
  return Boolean(process.env.SIR_MONGODB_URI);
}

/**
 * Status shown on the dashboard. It contains database names only –
 * never connection strings, usernames or passwords.
 */
export function getDatabaseStatus() {
  let primary;
  if (!process.env.PRIMARY_MONGODB_URI) {
    primary = {
      status: 'not_configured',
      message:
        'PRIMARY_MONGODB_URI is not set. Add it to server/.env (or to your hosting environment variables).',
    };
  } else if (!isPrimaryConnected()) {
    primary = {
      status: 'unavailable',
      message: primaryState.lastErrorHint || 'Check PRIMARY_MONGODB_URI and Atlas Network Access.',
    };
  } else {
    primary = { status: 'connected', message: 'Connected' };
  }

  let sir;
  if (!isSirConfigured()) {
    sir = { status: 'not_configured', message: 'SIR_MONGODB_URI is not set, so syncing is turned off.' };
  } else if (!isSirConnected()) {
    sir = {
      status: 'unavailable',
      message:
        `Unavailable – changes are saved to the primary database only. ${sirState.lastErrorHint}`.trim(),
    };
  } else if (!sirState.databaseFound) {
    sir = {
      status: 'database_not_found',
      message: `Connected, but database ${SIR_DB_NAME} was not found. Sync is paused.`,
    };
  } else {
    sir = { status: 'connected', message: 'Connected' };
  }

  return {
    primary: { database: PRIMARY_DB_NAME, ...primary },
    sir: { database: SIR_DB_NAME, ...sir },
  };
}
