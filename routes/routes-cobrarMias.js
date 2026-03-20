'use strict'

var express = require('express');
var controllerCobrarMias = require('../controllers/controller-cobrarMias');
var router = express.Router();

router.get('/personal/getTiposCobroMios', controllerCobrarMias.getTiposCobroMio);
router.post('/personal/createTipoCobroMio', controllerCobrarMias.createTipoCobroMio);
router.put('/personal/updateTipoCobroMio/:id', controllerCobrarMias.updateTipoCobroMio);
router.delete('/personal/deleteTipoCobroMio/:id', controllerCobrarMias.deleteTipoCobroMio);

router.get('/personal/getProveedoresCobroMio', controllerCobrarMias.getProveedoresCobroMio);
router.get('/personal/getResumenProveedoresCobroMio', controllerCobrarMias.getResumenProveedoresCobroMio);
router.get('/personal/getProveedorCobroMio/:id', controllerCobrarMias.getProveedorCobroMioById);
router.post('/personal/createProveedorCobroMio', controllerCobrarMias.createProveedorCobroMio);
router.put('/personal/updateProveedorCobroMio/:id', controllerCobrarMias.updateProveedorCobroMio);
router.delete('/personal/deleteProveedorCobroMio/:id', controllerCobrarMias.deleteProveedorCobroMio);
router.post('/personal/addFacturaDeudorMio/:idProveedor', controllerCobrarMias.addFacturaDeudorMio);
router.post('/personal/abonarFacturaDeudorMio/:idProveedor/:idFactura', controllerCobrarMias.abonarFacturaDeudorMio);
router.delete('/personal/deleteAbonoFacturaDeudorMio/:idProveedor/:idFactura/:indexAbono', controllerCobrarMias.deleteAbonoFacturaDeudorMio);
router.delete('/personal/deleteFacturaDeudorMio/:idProveedor/:idFactura', controllerCobrarMias.deleteFacturaDeudorMio);

module.exports = router;


