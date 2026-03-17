'use strict'

var express = require('express');
var controllerDeudas = require('../controllers/controler-deudas');
var router = express.Router();

router.get('/getProveedoresDeuda', controllerDeudas.getProveedoresDeuda);
router.get('/getResumenProveedoresDeuda', controllerDeudas.getResumenProveedoresDeuda);
router.get('/getProveedorDeuda/:id', controllerDeudas.getProveedorDeudaById);
router.post('/createProveedorDeuda', controllerDeudas.createProveedorDeuda);
router.put('/updateProveedorDeuda/:id', controllerDeudas.updateProveedorDeuda);
router.post('/addFacturaProveedor/:idProveedor', controllerDeudas.addFacturaProveedor);
router.post('/abonarFacturaProveedor/:idProveedor/:idFactura', controllerDeudas.abonarFacturaProveedor);
router.delete('/deleteAbonoFacturaProveedor/:idProveedor/:idFactura/:indexAbono', controllerDeudas.deleteAbonoFacturaProveedor);
router.delete('/deleteFacturaProveedor/:idProveedor/:idFactura', controllerDeudas.deleteFacturaProveedor);

module.exports = router;
