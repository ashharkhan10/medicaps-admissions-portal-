const express = require('express');
const router = express.Router();
const { hubspotStage, hubspotStatus } = require('../controllers/applicationController');
const requireAuth = require('../middleware/authMiddleware');

// POST /api/application/hubspot-stage -> create or move the application's deal (protected)
router.post('/hubspot-stage', requireAuth, hubspotStage);

// GET /api/application/hubspot-status -> sync Under Review / Accepted / Rejected from HubSpot (protected)
router.get('/hubspot-status', requireAuth, hubspotStatus);

module.exports = router;