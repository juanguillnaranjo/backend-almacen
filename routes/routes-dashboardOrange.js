'use strict'

var express = require('express');
var controller = require('../controllers/controller-dashboardOrange');
var router = express.Router();

router.get('/orange/dashboard', controller.getDashboardOrange);

module.exports = router;
