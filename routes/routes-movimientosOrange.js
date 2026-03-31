'use strict'

var express = require('express');
var controller = require('../controllers/controller-movimientosOrange');
var router = express.Router();

router.get('/orange/getMovimientosOrange', controller.getMovimientosOrange);
router.get('/orange/getMovimientosOrangeByCuenta/:cuentaId', controller.getMovimientosOrangeByCuenta);
router.post('/orange/createAsientoManualOrange', controller.createAsientoManualOrange);
router.put('/orange/updateAsientoManualOrange/:idOrigen', controller.updateAsientoManualOrange);
router.delete('/orange/deleteAsientoManualOrange/:idOrigen', controller.deleteAsientoManualOrange);

module.exports = router;
