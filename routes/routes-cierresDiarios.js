'use strict'

var express = require('express');
var controllerCierres = require('../controllers/controler-cierresDiarios');
var router = express.Router();

router.get('/getCierresDiarios', controllerCierres.getCierresDiarios);
router.get('/getCierreDiario/:fecha', controllerCierres.getCierreByFecha);

module.exports = router;
