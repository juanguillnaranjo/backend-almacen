'use strict'

var express = require('express');
var controllerMovimientos = require('../controllers/controller-movimientos');
var router = express.Router();

router.get('/getMovimientos', controllerMovimientos.getMovimientos);
router.get('/getMovimientosByCuenta/:cuentaId', controllerMovimientos.getMovimientosByCuenta);
router.get('/getMovimientosByOrigen/:origenModelo/:idOrigen', controllerMovimientos.getMovimientosByOrigen);
router.get('/getMovimientosByOrigen/:idOrigen', controllerMovimientos.getMovimientosByOrigen);
router.post('/createMovimiento', controllerMovimientos.createMovimiento);
router.post('/createAsientoManual', controllerMovimientos.createAsientoManual);
router.put('/updateAsientoManual/:idOrigen', controllerMovimientos.updateAsientoManual);
router.delete('/deleteAsientoManual/:idOrigen', controllerMovimientos.deleteAsientoManual);

module.exports = router;
