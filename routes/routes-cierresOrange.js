'use strict'

var express = require('express');
var controller = require('../controllers/controller-cierresOrange.js');
var router = express.Router();

router.get('/orange/getCierresOrange',            controller.getCierresOrange);
router.get('/orange/getCierreOrange/:fecha',      controller.getCierreOrangeByFecha);
router.post('/orange/upsertCierreOrange',         controller.upsertCierreOrange);
router.post('/orange/rehacerCierreOrange',        controller.rehacerCierreOrange);

module.exports = router;
