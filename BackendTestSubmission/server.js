// Node.js HTTP URL Shortener Microservice with Logging Integration

const express = require('express');
const bodyParser = require('body-parser');
const geoip = require('geoip-lite');
const validUrl = require('valid-url');
const fs = require('fs');
const path = require('path');

// Import the reusable Log function from your loggingMiddleware.js
const { Log } = require('../LoggingMiddleware/loggingMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// In-memory data storage: shortcode -> { originalUrl, createdAt, expiry, clicks: [{timestamp, referrer, geo}], shortcode }
const urlStore = new Map();

// Logging Middleware: writes logs asynchronously to a file with buffered writes
const logFilePath = path.join(__dirname, 'logs.txt');
const logBuffer = [];

function flushLogs() {
  if (logBuffer.length > 0) {
    fs.appendFile(logFilePath, logBuffer.join('\n') + '\n', err => {});
    logBuffer.length = 0;
  }
}

setInterval(flushLogs, 3000);

function loggingMiddleware(req, res, next) {
  const logEntry = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} from ${req.ip}`;
  logBuffer.push(logEntry);
  next();
}

app.use(loggingMiddleware);

// Utility to generate random shortcode
function generateShortCode(length = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
// Validate shortcode (alphanumeric, 4-10 chars)
function isValidShortCode(code) {
  return /^[a-zA-Z0-9]{4,10}$/.test(code);
}

// POST /shorturls - Create a shortened URL with logging
app.post('/shorturls', async (req, res) => {
  try {
    const { url, validity, shortcode } = req.body;

    if (!url || !validUrl.isWebUri(url)) {
      await Log('backend', 'error', 'handler', 'Invalid or missing URL in request body.');
      return res.status(400).json({ error: 'Invalid or missing URL.' });
    }

    const validityMinutes = (typeof validity === 'number' && validity > 0) ? validity : 30;

    let finalShortCode;
    if (shortcode) {
      if (!isValidShortCode(shortcode)) {
        await Log('backend', 'error', 'handler', `Invalid shortcode format provided: ${shortcode}`);
        return res.status(400).json({ error: 'Invalid shortcode format. Must be alphanumeric, 4-10 chars.' });
      }
      if (urlStore.has(shortcode)) {
        await Log('backend', 'warn', 'handler', `Shortcode collision attempt: ${shortcode}`);
        return res.status(409).json({ error: 'Shortcode already in use.' });
      }
      finalShortCode = shortcode;
    } else {
      do {
        finalShortCode = generateShortCode();
      } while (urlStore.has(finalShortCode));
    }

    const createdAt = new Date();
    const expiryDate = new Date(createdAt.getTime() + validityMinutes * 60000);

    urlStore.set(finalShortCode, {
      originalUrl: url,
      createdAt: createdAt.toISOString(),
      expiry: expiryDate.toISOString(),
      clicks: [],
      shortcode: finalShortCode
    });

    await Log('backend', 'info', 'handler', `Short URL created: ${finalShortCode} for URL: ${url}`);

    const host = req.get('host');
    const protocol = req.protocol;

    res.status(201).json({
      shortLink: `${protocol}://${host}/${finalShortCode}`,
      expiry: expiryDate.toISOString()
    });
  } catch (err) {
    await Log('backend', 'fatal', 'handler', `Unexpected error in short URL creation: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /shorturls/:shortcode - Retrieve shortened URL statistics
app.get('/shorturls/:shortcode', (req, res) => {
  const { shortcode } = req.params;

  if (!urlStore.has(shortcode)) {
    return res.status(404).json({ error: 'Shortcode does not exist.' });
  }

  const data = urlStore.get(shortcode);

  res.json({
    originalUrl: data.originalUrl,
    createdAt: data.createdAt,
    expiry: data.expiry,
    totalClicks: data.clicks.length,
    clicks: data.clicks
  });
});

// GET /:shortcode - Redirect to original URL if valid and track click
app.get('/:shortcode', async (req, res) => {
  const { shortcode } = req.params;

  if (!urlStore.has(shortcode)) {
    await Log('backend', 'error', 'handler', `Attempted redirect on non-existent shortcode: ${shortcode}`);
    return res.status(404).json({ error: 'Shortcode not found.' });
  }

  const data = urlStore.get(shortcode);
  const now = new Date();

  if (now > new Date(data.expiry)) {
    await Log('backend', 'warn', 'handler', `Attempted redirect on expired shortcode: ${shortcode}`);
    return res.status(410).json({ error: 'Shortcode expired.' });
  }

  const referrer = req.get('referer') || 'direct';
  const ip = req.ip.replace('::ffff:', ''); // handle IPv4-mapped IPv6
  const geo = geoip.lookup(ip) || { country: 'unknown' };

  data.clicks.push({
    timestamp: now.toISOString(),
    referrer: referrer,
    geo: geo.country
  });

  await Log('backend', 'info', 'handler', `Redirecting shortcode: ${shortcode} to URL: ${data.originalUrl}`);

  res.redirect(data.originalUrl);
});

// Start the server
app.listen(PORT);
