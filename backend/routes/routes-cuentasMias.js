'use strict'

var express = require('express');
var controllerCuentasMias = require('../controllers/controller-cuentasMias');
var router = express.Router();

router.get('/personal/cuentas', controllerCuentasMias.getCuentasMias);
router.post('/personal/cuentas', controllerCuentasMias.createCuentaMia);
router.put('/personal/cuentas/:id', controllerCuentasMias.updateCuentaMia);
router.delete('/personal/cuentas/:id', controllerCuentasMias.deleteCuentaMia);

module.exports = router;
