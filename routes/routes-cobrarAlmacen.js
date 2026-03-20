'use strict'

var express = require('express');
var controllerCobrarAlmacen = require('../controllers/controller-cobrarAlmacen');
var router = express.Router();

/**
 * ================== RUTAS DE TIPOS DE VENTA ==================
 */

router.get('/almacen/getTiposVentaAlmacen', controllerCobrarAlmacen.getTiposVentaAlmacen);
router.post('/almacen/createTipoVentaAlmacen', controllerCobrarAlmacen.createTipoVentaAlmacen);
router.put('/almacen/updateTipoVentaAlmacen/:id', controllerCobrarAlmacen.updateTipoVentaAlmacen);
router.delete('/almacen/deleteTipoVentaAlmacen/:id', controllerCobrarAlmacen.deleteTipoVentaAlmacen);

/**
 * ================== RUTAS DE CLIENTES/DEUDORES ==================
 */

router.get('/almacen/getClientesCreditosExternos', controllerCobrarAlmacen.getClientesCreditosExternos);
router.post('/almacen/importarClientesCreditosExternos', controllerCobrarAlmacen.importarClientesCreditosExternos);
router.get('/almacen/getClientesCobroAlmacen', controllerCobrarAlmacen.getClientesCobroAlmacen);
router.get('/almacen/getResumenClientesCobroAlmacen', controllerCobrarAlmacen.getResumenClientesCobroAlmacen);
router.get('/almacen/getClienteCobroAlmacen/:id', controllerCobrarAlmacen.getClienteCobroAlmacenById);
router.post('/almacen/createClienteCobroAlmacen', controllerCobrarAlmacen.createClienteCobroAlmacen);
router.put('/almacen/updateClienteCobroAlmacen/:id', controllerCobrarAlmacen.updateClienteCobroAlmacen);
router.delete('/almacen/deleteClienteCobroAlmacen/:id', controllerCobrarAlmacen.deleteClienteCobroAlmacen);

/**
 * ================== RUTAS DE VENTAS/FACTURAS ==================
 */

router.post('/almacen/addVentaClienteAlmacen/:idCliente', controllerCobrarAlmacen.addVentaClienteAlmacen);
router.delete('/almacen/deleteVentaClienteAlmacen/:idCliente/:idVenta', controllerCobrarAlmacen.deleteVentaClienteAlmacen);

/**
 * ================== RUTAS DE ABONOS ==================
 */

router.post('/almacen/abonarVentaClienteAlmacen/:idCliente/:idVenta', controllerCobrarAlmacen.abonarVentaClienteAlmacen);
router.delete('/almacen/deleteAbonoVentaClienteAlmacen/:idCliente/:idVenta/:indexAbono', controllerCobrarAlmacen.deleteAbonoVentaClienteAlmacen);

/**
 * ================== RUTAS DE REPORTES ==================
 */

router.get('/almacen/getReporteVentasPendientesAlmacen', controllerCobrarAlmacen.getReporteVentasPendientesAlmacen);
router.get('/almacen/getReporteVentasPorPeriodoAlmacen', controllerCobrarAlmacen.getReporteVentasPorPeriodoAlmacen);
router.get('/almacen/getEstadoCuentaClienteAlmacen/:idCliente', controllerCobrarAlmacen.getEstadoCuentaClienteAlmacen);

module.exports = router;
