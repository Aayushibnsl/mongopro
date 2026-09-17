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

// Extra information about the professor database that readyState alone can't tell us.
const sirState = {
  configured: false, // is SIR_MONGODB_URI filled in?
  databaseFound: false, // does PCEA24CY002 already exist on the professor's cluster?
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
    console.log(`✔ Primary MongoDB connected (database: ${PRIMARY_DB_NAME})`);
    return 'connected';
  } catch (error) {
    console.error(`✖ Primary MongoDB connection failed: ${safeErrorMessage(error)}`);
    console.error(`  Hint: ${connectionHint(error)}`);
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
    sirState.configured = false;
    console.warn('! SIR_MONGODB_URI is empty. Syncing to the professor database is turned off.');
    return 'missing';
  }

  sirState.configured = true;

  try {
    await sirConnection.openUri(uri, {
      dbName: SIR_DB_NAME,
      serverSelectionTimeoutMS: 10000,
      // Never let Mongoose create collections or indexes on the professor's cluster by itself
      autoCreate: false,
      autoIndex: false,
    });

    await checkSirDatabaseExists();

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
    console.error(`✖ Sir MongoDB connection failed: ${safeErrorMessage(error)}`);
    console.error(`  Hint: ${connectionHint(error)}`);
    console.error('  The app will keep working with the primary database only.');
    return 'failed';
  }
}

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
  return sirState.configured;
}

/**
 * Status shown on the dashboard. It contains database names only –
 * never connection strings, usernames or passwords.
 */
export function getDatabaseStatus() {
  const primary = isPrimaryConnected()
    ? { status: 'connected', message: 'Connected' }
    : {
        status: 'unavailable',
        message: 'Not connected. Check PRIMARY_MONGODB_URI and Atlas Network Access.',
      };

  let sir;
  if (!sirState.configured) {
    sir = { status: 'not_configured', message: 'SIR_MONGODB_URI is empty, so syncing is turned off.' };
  } else if (!isSirConnected()) {
    sir = { status: 'unavailable', message: 'Unavailable. Changes are saved to the primary database only.' };
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
