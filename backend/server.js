// Entry point for the backend. Only wires things together — no business logic here.

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes');

const app = express();

// Render sits behind a proxy; this makes req.ip the real visitor IP (used by the chat rate limit)
app.set('trust proxy', 1);

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

// Basic health check
app.get('/', (req, res) => {
  res.send('Medicaps Portal backend is running.');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});