'use strict'

var express = require('express');
var controllerCierres = require('../controllers/controler-cierresDiarios');
var controllerCierresOrange = require('../controllers/controller-cierresOrange');
var controllerDeudasOrange = require('../controllers/controller-deudasOrange');
var mdIntegration = require('../middlewares/integration-key');
var router = express.Router();

// Endpoint de integración externa (PHP) protegido por API key, sin JWT.
router.post('/upsertCierreDiario',       mdIntegration.ensureCierreApiKey, controllerCierres.upsertCierreDiario);
router.post('/upsertCierreOrange',       mdIntegration.ensureCierreApiKey, controllerCierresOrange.upsertCierreOrange);
router.get('/deudasOrangePendientes',    mdIntegration.ensureCierreApiKey, controllerDeudasOrange.getDeudasOrangePendientesIntegracion);
router.get('/integrations/deudasOrangePendientes', mdIntegration.ensureCierreApiKey, controllerDeudasOrange.getDeudasOrangePendientesIntegracion);
router.get('/integrations/orange/cuentasSalidaAbono', mdIntegration.ensureCierreApiKey, controllerDeudasOrange.getCuentasSalidaAbonoOrangeIntegracion);
router.post('/integrations/orange/abonarFacturaProveedor/:idProveedor/:idFactura', mdIntegration.ensureCierreApiKey, controllerDeudasOrange.abonarFacturaProveedorOrangeIntegracion);

module.exports = router;
