const express = require('express');
const router = express.Router();
const { login } = require('./authController');

router.post('/login', login);

module.exports = router;