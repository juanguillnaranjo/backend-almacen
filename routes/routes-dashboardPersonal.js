'use strict'

var express = require('express');
var controllerDashboardPersonal = require('../controllers/controller-dashboardPersonal');
var router = express.Router();

router.get('/personal/dashboard', controllerDashboardPersonal.getDashboardPersonal);

module.exports = router;
