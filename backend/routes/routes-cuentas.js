'use strict'
// routes para cuentas

var express = require('express');
var controllerCuentas = require('../controllers/controller-cuentas');
var router = express.Router();

// rutas para cuentas
router.get('/getCuentas', controllerCuentas.getCuentas);
router.post('/createCuenta', controllerCuentas.createCuenta);
router.post('/initCuentasDefault', controllerCuentas.initCuentasDefault);

module.exports = router;