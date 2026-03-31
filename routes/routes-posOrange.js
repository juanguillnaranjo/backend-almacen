'use strict'

var express = require('express');
var controllerPosOrange = require('../controllers/controller-posOrange');
var router = express.Router();

router.get('/orange/getPosOrangeMenu', controllerPosOrange.getPosOrangeMenu);

module.exports = router;
