'use strict'

var express = require('express');
var controllerDeudasFamiliares = require('../controllers/controller-deudasFamiliares');
var router = express.Router();

router.get('/orange/getTiposDeudaFamiliares', controllerDeudasFamiliares.getTiposDeudaFamiliar);
router.post('/orange/createTipoDeudaFamiliar', controllerDeudasFamiliares.createTipoDeudaFamiliar);
router.put('/orange/updateTipoDeudaFamiliar/:id', controllerDeudasFamiliares.updateTipoDeudaFamiliar);
router.delete('/orange/deleteTipoDeudaFamiliar/:id', controllerDeudasFamiliares.deleteTipoDeudaFamiliar);

router.get('/orange/getProveedoresDeudaFamiliar', controllerDeudasFamiliares.getProveedoresDeudaFamiliar);
router.get('/orange/getResumenProveedoresDeudaFamiliar', controllerDeudasFamiliares.getResumenProveedoresDeudaFamiliar);
router.get('/orange/getProveedorDeudaFamiliar/:id', controllerDeudasFamiliares.getProveedorDeudaFamiliarById);
router.post('/orange/createProveedorDeudaFamiliar', controllerDeudasFamiliares.createProveedorDeudaFamiliar);
router.put('/orange/updateProveedorDeudaFamiliar/:id', controllerDeudasFamiliares.updateProveedorDeudaFamiliar);
router.post('/orange/relacionarProveedorTipoDeudaFamiliar/:id', controllerDeudasFamiliares.relacionarProveedorTipoDeudaFamiliar);
router.delete('/orange/deleteProveedorDeudaFamiliar/:id', controllerDeudasFamiliares.deleteProveedorDeudaFamiliar);
router.post('/orange/addFacturaProveedorFamiliar/:idProveedor', controllerDeudasFamiliares.addFacturaProveedorFamiliar);
router.post('/orange/abonarFacturaProveedorFamiliar/:idProveedor/:idFactura', controllerDeudasFamiliares.abonarFacturaProveedorFamiliar);
router.delete('/orange/deleteAbonoFacturaProveedorFamiliar/:idProveedor/:idFactura/:indexAbono', controllerDeudasFamiliares.deleteAbonoFacturaProveedorFamiliar);
router.delete('/orange/deleteFacturaProveedorFamiliar/:idProveedor/:idFactura', controllerDeudasFamiliares.deleteFacturaProveedorFamiliar);
router.get('/orange/getCuentasSalidaAbonoFamiliar', controllerDeudasFamiliares.getCuentasSalidaAbonoFamiliar);

module.exports = router;
