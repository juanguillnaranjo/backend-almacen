'use strict'

var express = require('express');
var controllerCierres = require('../controllers/controler-cierresDiarios');
var mdIntegration = require('../middlewares/integration-key');
var router = express.Router();

// Endpoint de integración externa (PHP) protegido por API key, sin JWT.
router.post('/upsertCierreDiario', mdIntegration.ensureCierreApiKey, controllerCierres.upsertCierreDiario);

module.exports = router;
