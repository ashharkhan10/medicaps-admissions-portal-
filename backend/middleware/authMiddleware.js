// Protects routes that require a logged-in user.
// Checks the Supabase session token sent from the frontend in the Authorization header.

const supabase = require('../config/supabaseClient');

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No authentication token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({ error: 'Invalid or expired session.' });
    }

    // Attach the verified user to the request so later code can use it
    req.user = data.user;
    next();
  } catch (err) {
    console.error('Auth check failed:', err.message);
    return res.status(503).json({ error: 'Authentication service unavailable. Please try again.' });
  }
}

module.exports = requireAuth;