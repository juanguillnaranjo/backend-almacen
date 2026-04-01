const express = require('express');
const router = express.Router();
const ventasController = require('../controllers/controller-ventas');
const mdRoles = require('../middlewares/authenticated');

const allowPosBasico = mdRoles.requireRoles(['admin', 'orange', 'orange_pos']);
const allowPosCompleto = mdRoles.requireRoles(['admin', 'orange']);

// Crear nueva venta
router.post('/orange/crearVenta', allowPosBasico, ventasController.crearVenta);

// Obtener ventas abiertas
router.get('/orange/ventasAbiertas', allowPosBasico, ventasController.getVentasAbiertas);

// Obtener todas las ventas (con filtros)
router.get('/orange/ventas', allowPosCompleto, ventasController.getVentas);

// Obtener resumen de pagos digitales
router.get('/orange/resumenPagosDigitales', allowPosCompleto, ventasController.getResumenPagosDigitales);

// Obtener venta específica
router.get('/orange/venta/:id', allowPosBasico, ventasController.getVenta);

// Agregar item a venta
router.post('/orange/venta/:ventaId/agregarItem', allowPosBasico, ventasController.agregarItem);

// Actualizar cantidad de item
router.put('/orange/venta/:ventaId/item/:itemIndex', allowPosBasico, ventasController.actualizarItem);

// Actualizar detalle de item (observacion)
router.put('/orange/venta/:ventaId/item/:itemIndex/detalle', allowPosBasico, ventasController.actualizarItemDetalle);

// Remover item
router.delete('/orange/venta/:ventaId/item/:itemIndex', allowPosCompleto, ventasController.removerItem);

// Reasignar tipo/destino de venta
router.put('/orange/venta/:ventaId/reasignar', allowPosCompleto, ventasController.reasignarVenta);

// Aplicar descuento
router.put('/orange/venta/:ventaId/descuento', allowPosCompleto, ventasController.aplicarDescuento);

// Cerrar venta
router.post('/orange/venta/:ventaId/cerrar', allowPosBasico, ventasController.cerrarVenta);

// Cancelar venta
router.post('/orange/venta/:ventaId/cancelar', allowPosCompleto, ventasController.cancelarVenta);

// Reabrir venta cerrada
router.put('/orange/venta/:ventaId/reabrir', allowPosCompleto, ventasController.reabrirVenta);

// Imprimir cocina/cuenta
router.post('/orange/venta/:ventaId/imprimir/cocina', allowPosBasico, ventasController.imprimirCocina);
router.post('/orange/venta/:ventaId/imprimir/cuenta', allowPosBasico, ventasController.imprimirCuenta);

module.exports = router;
