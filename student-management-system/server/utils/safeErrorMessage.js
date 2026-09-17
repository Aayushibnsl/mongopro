// Error messages from MongoDB can sometimes include parts of a connection string.
// Connection strings contain usernames and passwords, so we clean every message
// before printing it to the console.

export function safeErrorMessage(error) {
  let message = error?.message || String(error) || 'Unknown error';

  // Hide anything that looks like a MongoDB connection string
  message = message.replace(/mongodb(\+srv)?:\/\/[^\s"'<>]+/gi, 'mongodb://<hidden>');

  // Hide the exact values from .env, just in case they appear in another form
  for (const secret of [process.env.PRIMARY_MONGODB_URI, process.env.SIR_MONGODB_URI]) {
    if (secret) message = message.split(secret).join('<hidden>');
  }

  return message;
}

// A short, beginner-friendly hint for the most common Atlas connection problems.
export function connectionHint(error) {
  const message = (error?.message || '').toLowerCase();

  if (message.includes('bad auth') || message.includes('authentication failed')) {
    return 'Check the username and password inside your connection string.';
  }
  if (message.includes('querysrv') || message.includes('enotfound')) {
    return 'Check the cluster address in your connection string and your internet connection.';
  }
  if (
    message.includes('whitelist') ||
    message.includes('ip address') ||
    message.includes('could not connect to any servers') ||
    message.includes('timed out') ||
    message.includes('econnrefused')
  ) {
    return 'In MongoDB Atlas, open Network Access and add your current IP address.';
  }
  if (message.includes('invalid connection string') || message.includes('unescaped')) {
    return 'If your password contains special characters such as @ : / ? #, URL-encode them (e.g. @ becomes %40).';
  }
  if (message.includes('invalid scheme') || message.includes('uri')) {
    return 'The connection string should start with mongodb+srv:// or mongodb://';
  }
  return 'Check your connection string and MongoDB Atlas settings.';
}
