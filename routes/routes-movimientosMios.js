'use strict'

var express = require('express');
var controllerMovimientosMios = require('../controllers/controller-movimientosMios');
var router = express.Router();

router.get('/personal/getMovimientosMios', controllerMovimientosMios.getMovimientosMios);
router.get('/personal/getMovimientosMiosByCuenta/:cuentaId', controllerMovimientosMios.getMovimientosMiosByCuenta);
router.post('/personal/createMovimientoMio', controllerMovimientosMios.createMovimientoMio);
router.post('/personal/createAsientoManualMio', controllerMovimientosMios.createAsientoManualMio);
router.put('/personal/updateAsientoManualMio/:idOrigen', controllerMovimientosMios.updateAsientoManualMio);
router.delete('/personal/deleteAsientoManualMio/:idOrigen', controllerMovimientosMios.deleteAsientoManualMio);

module.exports = router;
