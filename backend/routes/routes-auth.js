'use strict'

var express = require('express');
var controllerAuth = require('../controllers/controller-auth');
var mdAuth = require('../middlewares/authenticated');
var router = express.Router();

router.post('/auth/login', controllerAuth.login);
router.get('/auth/me', mdAuth.ensureAuth, controllerAuth.me);

module.exports = router;
