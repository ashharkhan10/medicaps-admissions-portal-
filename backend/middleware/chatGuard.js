// Protects the public chatbot route from abuse:
// max 15 messages per minute per visitor, max 500 characters per question,
// and only clean user/assistant history is passed to the AI.

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 15;
const hits = new Map();

function chatGuard(req, res, next) {
  const now = Date.now();
  const key = req.ip || 'unknown';
  const entry = hits.get(key);

  if (!entry || now - entry.start > WINDOW_MS) {
    hits.set(key, { start: now, count: 1 });
  } else {
    entry.count++;
    if (entry.count > MAX_REQUESTS) {
      return res.status(429).json({ reply: 'You are sending messages too quickly. Please wait a minute and try again.' });
    }
  }

  const { message, history } = req.body || {};

  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }
  if (message.length > 500) {
    return res.status(400).json({ reply: 'Please keep your question under 500 characters.' });
  }

  // Keep only the last 10 normal chat messages, so nobody can inject extra instructions
  req.body.history = Array.isArray(history)
    ? history
        .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }))
    : [];

  next();
}

// Clear old visitors from memory every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of hits) {
    if (now - value.start > WINDOW_MS) hits.delete(key);
  }
}, 5 * 60 * 1000).unref();

module.exports = chatGuard;