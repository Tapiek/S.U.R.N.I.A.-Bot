// web-dashboard/server/routes/character.js

const express = require('express');
const router = express.Router();
const characterProcessController = require('../controllers/characterProcessController');

// Route for character submission
router.post('/submit', characterProcessController);

module.exports = router;
