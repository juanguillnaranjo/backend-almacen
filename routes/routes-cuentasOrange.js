'use strict'

var express = require('express');
var controllerCuentasOrange = require('../controllers/controller-cuentasOrange');
var router = express.Router();

router.get('/orange/cuentas', controllerCuentasOrange.getCuentasOrange);
router.post('/orange/cuentas', controllerCuentasOrange.createCuentaOrange);
router.put('/orange/cuentas/:id', controllerCuentasOrange.updateCuentaOrange);
router.delete('/orange/cuentas/:id', controllerCuentasOrange.deleteCuentaOrange);

module.exports = router;
