'use strict'

var express = require('express');
var controllerInventarioOrange = require('../controllers/controller-inventarioOrange');
var router = express.Router();

// Obtener todos los productos
router.get('/orange/getProductosOrange', controllerInventarioOrange.getProductosOrange);

// Obtener clases (nivel 1)
router.get('/orange/getClases', controllerInventarioOrange.getClases);

// Compatibilidad con nombre anterior
router.get('/orange/getDepartamentos', controllerInventarioOrange.getDepartamentos);

// Obtener tipos por clase (nivel 2)
router.get('/orange/getTiposPorClase/:clase', controllerInventarioOrange.getTiposPorClase);

// Obtener tamanos por clase + tipo (nivel 3)
router.get('/orange/getTamanosPorClaseTipo/:clase/:tipo', controllerInventarioOrange.getTamanosPorClaseTipo);

// Obtener sabores/productos finales por ruta (nivel 4)
router.get('/orange/getSaboresPorRuta/:clase/:tipo/:tamano', controllerInventarioOrange.getSaboresPorRuta);

// Obtener arbol completo de inventario
router.get('/orange/getArbolInventario', controllerInventarioOrange.getArbolInventario);

// Obtener resumen del inventario
router.get('/orange/getResumenInventario', controllerInventarioOrange.getResumenInventario);

// Obtener un producto por ID
router.get('/orange/getProductoOrange/:id', controllerInventarioOrange.getProductoOrange);

// Obtener un producto por código
router.get('/orange/getProductoByCodigo/:codigo', controllerInventarioOrange.getProductoByCodigo);

// Crear producto
router.post('/orange/createProductoOrange', controllerInventarioOrange.createProductoOrange);

// Actualizar producto
router.put('/orange/updateProductoOrange/:id', controllerInventarioOrange.updateProductoOrange);

// Incrementar cantidad
router.post('/orange/incrementarCantidad/:id', controllerInventarioOrange.incrementarCantidad);

// Decrementar cantidad
router.post('/orange/decrementarCantidad/:id', controllerInventarioOrange.decrementarCantidad);

// Eliminar producto
router.delete('/orange/deleteProductoOrange/:id', controllerInventarioOrange.deleteProductoOrange);

// ─── RECETA ───────────────────────────────────────────────────────────────────

// Obtener receta de un producto (con insumos populados)
router.get('/orange/getReceta/:id', controllerInventarioOrange.getReceta);

// Reemplazar (o vaciar) la receta completa de un producto
router.put('/orange/setReceta/:id', controllerInventarioOrange.setReceta);

// Cambiar tipo de producto (elaborado ↔ producido)
router.put('/orange/updateTipoProducto/:id', controllerInventarioOrange.updateTipoProducto);

module.exports = router;
