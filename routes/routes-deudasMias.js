'use strict'

var express = require('express');
var controllerDeudasMias = require('../controllers/controller-deudasMias');
var router = express.Router();

router.get('/personal/getTiposDeudaMias', controllerDeudasMias.getTiposDeudaMia);
router.post('/personal/createTipoDeudaMia', controllerDeudasMias.createTipoDeudaMia);
router.put('/personal/updateTipoDeudaMia/:id', controllerDeudasMias.updateTipoDeudaMia);
router.delete('/personal/deleteTipoDeudaMia/:id', controllerDeudasMias.deleteTipoDeudaMia);

router.get('/personal/getProveedoresDeudaMia', controllerDeudasMias.getProveedoresDeudaMia);
router.get('/personal/getResumenProveedoresDeudaMia', controllerDeudasMias.getResumenProveedoresDeudaMia);
router.get('/personal/getProveedorDeudaMia/:id', controllerDeudasMias.getProveedorDeudaMiaById);
router.post('/personal/createProveedorDeudaMia', controllerDeudasMias.createProveedorDeudaMia);
router.put('/personal/updateProveedorDeudaMia/:id', controllerDeudasMias.updateProveedorDeudaMia);
router.delete('/personal/deleteProveedorDeudaMia/:id', controllerDeudasMias.deleteProveedorDeudaMia);
router.post('/personal/addFacturaProveedorMia/:idProveedor', controllerDeudasMias.addFacturaProveedorMia);
router.put('/personal/updateFacturaProveedorMia/:idProveedor/:idFactura', controllerDeudasMias.updateFacturaProveedorMia);
router.post('/personal/abonarFacturaProveedorMia/:idProveedor/:idFactura', controllerDeudasMias.abonarFacturaProveedorMia);
router.put('/personal/updateAbonoFacturaProveedorMia/:idProveedor/:idFactura/:indexAbono', controllerDeudasMias.updateAbonoFacturaProveedorMia);
router.delete('/personal/deleteAbonoFacturaProveedorMia/:idProveedor/:idFactura/:indexAbono', controllerDeudasMias.deleteAbonoFacturaProveedorMia);
router.delete('/personal/deleteFacturaProveedorMia/:idProveedor/:idFactura', controllerDeudasMias.deleteFacturaProveedorMia);

module.exports = router;
