'use strict'

var express = require('express');
var controllerRetirosOrange = require('../controllers/controller-retirosOrange');
var router = express.Router();

router.get('/orange/getRetirosOrange', controllerRetirosOrange.getRetirosOrange);
router.get('/orange/getRetiroOrange/:id', controllerRetirosOrange.getRetiroOrangeById);
router.get('/orange/getResumenRetirosOrange', controllerRetirosOrange.getResumenRetirosOrange);
router.post('/orange/createRetiroOrange', controllerRetirosOrange.createRetiroOrange);
router.put('/orange/updateRetiroOrange/:id', controllerRetirosOrange.updateRetiroOrange);
router.delete('/orange/deleteRetiroOrange/:id', controllerRetirosOrange.deleteRetiroOrange);

module.exports = router;
