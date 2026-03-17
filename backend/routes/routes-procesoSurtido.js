'use strict'

var express = require('express');
var controllerProcesoSurtido = require('../controllers/controler-procesoSurtido');
var router = express.Router();

router.get('/getProcesosSurtido', controllerProcesoSurtido.getProcesosSurtido);
router.get('/getProcesoSurtidoByFecha/:fecha', controllerProcesoSurtido.getProcesoSurtidoByFecha);
router.post('/upsertProcesoSurtido', controllerProcesoSurtido.upsertProcesoSurtido);
router.delete('/deleteProcesoSurtido/:id', controllerProcesoSurtido.deleteProcesoSurtido);

module.exports = router;
