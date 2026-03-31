'use strict'

var express = require('express');
var controllerGastosOrange = require('../controllers/controller-gastosOrange');
var router = express.Router();

router.get('/orange/getTiposGastoOrange', controllerGastosOrange.getTiposGastoOrange);
router.post('/orange/createTipoGastoOrange', controllerGastosOrange.createTipoGastoOrange);
router.delete('/orange/deleteTipoGastoOrange/:id', controllerGastosOrange.deleteTipoGastoOrange);
router.delete('/orange/deleteClaseGasto', controllerGastosOrange.deleteClaseGasto);
router.delete('/orange/deleteSubclaseGasto', controllerGastosOrange.deleteSubclaseGasto);

router.get('/orange/getGastosOrange', controllerGastosOrange.getGastosOrange);
router.get('/orange/getGastoOrange/:id', controllerGastosOrange.getGastoOrangeById);
router.get('/orange/getResumenGastosOrange', controllerGastosOrange.getResumenGastosOrange);
router.post('/orange/createGastoOrange', controllerGastosOrange.createGastoOrange);
router.put('/orange/updateGastoOrange/:id', controllerGastosOrange.updateGastoOrange);
router.delete('/orange/deleteGastoOrange/:id', controllerGastosOrange.deleteGastoOrange);

module.exports = router;
