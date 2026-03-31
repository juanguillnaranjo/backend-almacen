'use strict'

var express = require('express');
var controllerInsumos = require('../controllers/controller-insumos');
var router = express.Router();

// Obtener todos los insumos
router.get('/orange/getInsumos', controllerInsumos.getInsumos);

// Obtener un insumo por ID
router.get('/orange/getInsumo/:id', controllerInsumos.getInsumo);

// Crear insumo
router.post('/orange/createInsumo', controllerInsumos.createInsumo);

// Actualizar insumo
router.put('/orange/updateInsumo/:id', controllerInsumos.updateInsumo);

// Incrementar stock
router.post('/orange/incrementarStockInsumo/:id', controllerInsumos.incrementarStockInsumo);

// Decrementar stock
router.post('/orange/decrementarStockInsumo/:id', controllerInsumos.decrementarStockInsumo);

// Eliminar insumo (requiere ?confirmacion=ELIMINAR)
router.delete('/orange/deleteInsumo/:id', controllerInsumos.deleteInsumo);

module.exports = router;
