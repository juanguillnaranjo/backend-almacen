'use strict'

var express = require('express');
var controllerDeudasOrange = require('../controllers/controller-deudasOrange');
var router = express.Router();

router.get('/orange/getProveedoresDeudaOrange', controllerDeudasOrange.getProveedoresDeudaOrange);
router.get('/orange/getResumenProveedoresDeudaOrange', controllerDeudasOrange.getResumenProveedoresDeudaOrange);
router.get('/orange/getProveedorDeudaOrange/:id', controllerDeudasOrange.getProveedorDeudaOrangeById);
router.post('/orange/createProveedorDeudaOrange', controllerDeudasOrange.createProveedorDeudaOrange);
router.put('/orange/updateProveedorDeudaOrange/:id', controllerDeudasOrange.updateProveedorDeudaOrange);
router.post('/orange/addFacturaProveedorOrange/:idProveedor', controllerDeudasOrange.addFacturaProveedorOrange);
router.post('/orange/abonarFacturaProveedorOrange/:idProveedor/:idFactura', controllerDeudasOrange.abonarFacturaProveedorOrange);
router.delete('/orange/deleteAbonoFacturaProveedorOrange/:idProveedor/:idFactura/:indexAbono', controllerDeudasOrange.deleteAbonoFacturaProveedorOrange);
router.delete('/orange/deleteFacturaProveedorOrange/:idProveedor/:idFactura', controllerDeudasOrange.deleteFacturaProveedorOrange);
router.get('/orange/getCuentasSalidaAbonoOrange', controllerDeudasOrange.getCuentasSalidaAbonoOrange);

module.exports = router;
