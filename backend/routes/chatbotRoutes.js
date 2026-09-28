const express = require('express');
const router = express.Router();
const { handleChatMessage } = require('../controllers/chatbotController');
const chatGuard = require('../middleware/chatGuard');

// Public route, protected by rate limit and input checks
router.post('/message', chatGuard, handleChatMessage);

module.exports = router;