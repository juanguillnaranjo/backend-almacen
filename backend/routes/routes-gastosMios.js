const express = require('express');
const router = express.Router();
const GastosMiosController = require('../controllers/controller.gastosMios');
const authenticated = require('../middlewares/authenticated');

const controller = new GastosMiosController();

// Catalogo tipos de gasto
router.get('/personal/getTiposGastoMios', authenticated.ensureAuth, (req, res) => controller.getTiposGastoMios(req, res));
router.post('/personal/createTipoGastoMio', authenticated.ensureAuth, (req, res) => controller.createTipoGastoMio(req, res));
router.delete('/personal/deleteTipoGastoMio/:id', authenticated.ensureAuth, (req, res) => controller.deleteTipoGastoMio(req, res));

// GET: Obtener todos los gastos
router.get('/personal/getGastosMios', authenticated.ensureAuth, (req, res) => controller.getGastosMios(req, res));

// GET: Obtener un gasto por ID
router.get('/personal/getGastoMio/:id', authenticated.ensureAuth, (req, res) => controller.getGastoMio(req, res));

// GET: Obtener resumen de gastos
router.get('/personal/getResumenGastosMios', authenticated.ensureAuth, (req, res) => controller.getResumenGastosMios(req, res));

// POST: Crear nuevo gasto
router.post('/personal/createGastoMio', authenticated.ensureAuth, (req, res) => controller.createGastoMio(req, res));

// PUT: Actualizar gasto
router.put('/personal/updateGastoMio/:id', authenticated.ensureAuth, (req, res) => controller.updateGastoMio(req, res));

// DELETE: Eliminar gasto
router.delete('/personal/deleteGastoMio/:id', authenticated.ensureAuth, (req, res) => controller.deleteGastoMio(req, res));

module.exports = router;
