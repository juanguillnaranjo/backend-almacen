'use strict'

var express = require('express');
var controllerProcesoSurtido = require('../controllers/controler-procesoSurtido');
var router = express.Router();

router.get('/getProcesosSurtido', controllerProcesoSurtido.getProcesosSurtido);
router.get('/getProcesoSurtidoByFecha/:fecha', controllerProcesoSurtido.getProcesoSurtidoByFecha);
router.post('/createProcesoSurtido', controllerProcesoSurtido.createProcesoSurtido);
router.put('/updateProcesoSurtido/:id', controllerProcesoSurtido.updateProcesoSurtido);
router.post('/addFacturaProcesoSurtido/:id', controllerProcesoSurtido.addFacturaProcesoSurtido);
router.put('/updateFacturaProcesoSurtido/:id/:idFactura', controllerProcesoSurtido.updateFacturaProcesoSurtido);
router.delete('/deleteFacturaProcesoSurtido/:id/:idFactura', controllerProcesoSurtido.deleteFacturaProcesoSurtido);
router.post('/addViaticoProcesoSurtido/:id', controllerProcesoSurtido.addViaticoProcesoSurtido);
router.put('/updateViaticoProcesoSurtido/:id/:idViatico', controllerProcesoSurtido.updateViaticoProcesoSurtido);
router.delete('/deleteViaticoProcesoSurtido/:id/:idViatico', controllerProcesoSurtido.deleteViaticoProcesoSurtido);
router.post('/asentarMovimientosProcesoSurtido/:id', controllerProcesoSurtido.asentarMovimientosProcesoSurtido);
router.post('/upsertProcesoSurtido', controllerProcesoSurtido.upsertProcesoSurtido);
router.delete('/deleteProcesoSurtido/:id', controllerProcesoSurtido.deleteProcesoSurtido);

module.exports = router;
