const axios = require('axios');

const ALLOWED_STACKS = ['backend', 'frontend'];
const ALLOWED_LEVELS = ['debug', 'info', 'warn', 'error', 'fatal'];
const ALLOWED_BACKEND_PACKAGES = ['cache', 'controller', 'cron_job', 'db', 'domain', 'handler', 'repository', 'route', 'service', 'auth', 'config', 'middleware', 'utils'];

const LOG_API_URL = 'http://20.244.56.144/evaluation-service/logs';
// If you have an auth token, put here
const AUTH_TOKEN = process.env.LOG_API_AUTH_TOKEN || ''; 

async function Log(stack, level, pkg, message) {
  stack = stack.toLowerCase();
  level = level.toLowerCase();
  pkg = pkg.toLowerCase();

  if (!ALLOWED_STACKS.includes(stack)) {
    throw new Error(`Invalid stack: ${stack}`);
  }
  if (!ALLOWED_LEVELS.includes(level)) {
    throw new Error(`Invalid level: ${level}`);
  }
  // Backend packages only
  if (!ALLOWED_BACKEND_PACKAGES.includes(pkg)) {
    throw new Error(`Invalid backend package: ${pkg}`);
  }
  if (typeof message !== 'string' || message.trim() === '') {
    throw new Error(`Invalid message`);
  }

  try {
    const response = await axios.post(LOG_API_URL, {
      stack,
      level,
      package: pkg,
      message
    }, {
      headers: {
        'Content-Type': 'application/json',
        ...(AUTH_TOKEN && { Authorization: `Bearer ${AUTH_TOKEN}` })
      }
    });

    return response.data;
  } catch (error) {
    // Consider logging to console or a fallback
    // but do not throw to avoid crashing app.
    return { error: error.message || 'Logging API failed' };
  }
}

module.exports = { Log };
