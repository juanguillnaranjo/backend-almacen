const express = require('express');
const router = express.Router();
const ventasController = require('../controllers/controller-ventas');

// Crear nueva venta
router.post('/orange/crearVenta', ventasController.crearVenta);

// Obtener ventas abiertas
router.get('/orange/ventasAbiertas', ventasController.getVentasAbiertas);

// Obtener todas las ventas (con filtros)
router.get('/orange/ventas', ventasController.getVentas);

// Obtener resumen de pagos digitales
router.get('/orange/resumenPagosDigitales', ventasController.getResumenPagosDigitales);

// Obtener venta específica
router.get('/orange/venta/:id', ventasController.getVenta);

// Agregar item a venta
router.post('/orange/venta/:ventaId/agregarItem', ventasController.agregarItem);

// Actualizar cantidad de item
router.put('/orange/venta/:ventaId/item/:itemIndex', ventasController.actualizarItem);

// Actualizar detalle de item (observacion)
router.put('/orange/venta/:ventaId/item/:itemIndex/detalle', ventasController.actualizarItemDetalle);

// Remover item
router.delete('/orange/venta/:ventaId/item/:itemIndex', ventasController.removerItem);

// Reasignar tipo/destino de venta
router.put('/orange/venta/:ventaId/reasignar', ventasController.reasignarVenta);

// Aplicar descuento
router.put('/orange/venta/:ventaId/descuento', ventasController.aplicarDescuento);

// Cerrar venta
router.post('/orange/venta/:ventaId/cerrar', ventasController.cerrarVenta);

// Cancelar venta
router.post('/orange/venta/:ventaId/cancelar', ventasController.cancelarVenta);

// Reabrir venta cerrada
router.put('/orange/venta/:ventaId/reabrir', ventasController.reabrirVenta);

// Imprimir cocina/cuenta
router.post('/orange/venta/:ventaId/imprimir/cocina', ventasController.imprimirCocina);
router.post('/orange/venta/:ventaId/imprimir/cuenta', ventasController.imprimirCuenta);

module.exports = router;
