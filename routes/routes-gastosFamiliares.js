const express = require('express');
const router = express.Router();
const GastosFamiliaresController = require('../controllers/controller-gastosFamiliares');
const authenticated = require('../middlewares/authenticated');

const controller = new GastosFamiliaresController();

router.get('/personal/getTiposGastoFamiliares', authenticated.ensureAuth, (req, res) => controller.getTiposGastoFamiliares(req, res));
router.post('/personal/createTipoGastoFamiliar', authenticated.ensureAuth, (req, res) => controller.createTipoGastoFamiliar(req, res));
router.put('/personal/updateTipoGastoFamiliar/:id', authenticated.ensureAuth, (req, res) => controller.updateTipoGastoFamiliar(req, res));
router.delete('/personal/deleteTipoGastoFamiliar/:id', authenticated.ensureAuth, (req, res) => controller.deleteTipoGastoFamiliar(req, res));

router.get('/personal/getGastosFamiliares', authenticated.ensureAuth, (req, res) => controller.getGastosFamiliares(req, res));
router.get('/personal/getGastoFamiliar/:id', authenticated.ensureAuth, (req, res) => controller.getGastoFamiliar(req, res));
router.get('/personal/getResumenGastosFamiliares', authenticated.ensureAuth, (req, res) => controller.getResumenGastosFamiliares(req, res));
router.post('/personal/createGastoFamiliar', authenticated.ensureAuth, (req, res) => controller.createGastoFamiliar(req, res));
router.put('/personal/updateGastoFamiliar/:id', authenticated.ensureAuth, (req, res) => controller.updateGastoFamiliar(req, res));
router.delete('/personal/deleteGastoFamiliar/:id', authenticated.ensureAuth, (req, res) => controller.deleteGastoFamiliar(req, res));

module.exports = router;
