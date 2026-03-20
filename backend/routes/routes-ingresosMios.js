'use strict'

var express = require('express');
var controllerIngresosMios = require('../controllers/controller-ingresosMios');
var router = express.Router();

router.get('/personal/getIngresosMios', controllerIngresosMios.getIngresosMios);
router.get('/personal/getIngresoMio/:id', controllerIngresosMios.getIngresoMioById);
router.get('/personal/getResumenIngresosMios', controllerIngresosMios.getResumenIngresosMios);
router.post('/personal/createIngresoMio', controllerIngresosMios.createIngresoMio);
router.put('/personal/updateIngresoMio/:id', controllerIngresosMios.updateIngresoMio);
router.delete('/personal/deleteIngresoMio/:id', controllerIngresosMios.deleteIngresoMio);

module.exports = router;
