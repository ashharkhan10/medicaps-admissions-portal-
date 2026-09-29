// Entry point for the backend. Only wires things together — no business logic here.

require('dotenv').config();

// Stop at startup if any required setting is missing, with a clear message
const REQUIRED_ENV = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'HUBSPOT_ACCESS_TOKEN', 'GROQ_API_KEY'];
const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  console.error('Missing environment variables:', missingEnv.join(', '));
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const axios = require('axios');

// Every HubSpot call gives up after 10 seconds instead of hanging
axios.defaults.timeout = 10 * 1000;

const authRoutes = require('./routes/authRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes');

const app = express();

// Render sits behind a proxy; this makes req.ip the real visitor IP (used by the chat rate limit)
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Basic security headers on every response
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// FRONTEND_URL can hold one or more links, separated by commas
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '100kb' }));

// Route groups — clearly separated by feature
app.use('/api/auth', authRoutes);
app.use('/api/application', applicationRoutes);
app.use('/api/chatbot', chatbotRoutes);

// Health check (also used by the keep-awake ping)
app.get('/', (req, res) => {
  res.send('Medicaps Portal backend is running.');
});

// Unknown routes
app.use((req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// Global error handler: logs the real error, sends the user a clean message only
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid request body.' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request is too large.' });
  }
  console.error('Unhandled error:', err.message);
  return res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

// Log unexpected async errors instead of letting the server crash
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason?.message || reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err.message);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});