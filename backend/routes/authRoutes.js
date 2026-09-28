const express = require('express');
const router = express.Router();
const { getProfile, hubspotContact } = require('../controllers/authController');
const requireAuth = require('../middleware/authMiddleware');

// GET /api/auth/profile -> logged-in user's profile (protected)
router.get('/profile', requireAuth, getProfile);

// POST /api/auth/hubspot-contact -> create/update HubSpot contact after OTP (protected)
router.post('/hubspot-contact', requireAuth, hubspotContact);

module.exports = router;