const express = require('express');
const router = express.Router();
const sqlController = require('../controllers/sqlController');

// Route to fetch therapists based on patient preferences
router.get('/getTherapists', sqlController.getTherapists);

module.exports = router;