const express = require('express');
const sessionController = require('../controllers/sessionController');

const router = express.Router();

router.post('/start', sessionController.start);
router.post('/close', sessionController.close);

module.exports = router; 