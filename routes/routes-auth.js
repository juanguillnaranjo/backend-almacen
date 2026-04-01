'use strict'

var express = require('express');
var controllerAuth = require('../controllers/controller-auth');
var mdAuth = require('../middlewares/authenticated');
var router = express.Router();

router.get('/auth/bootstrap-status', controllerAuth.bootstrapStatus);
router.post('/auth/register', controllerAuth.register);
router.post('/auth/login', controllerAuth.login);
router.get('/auth/me', mdAuth.ensureAuth, controllerAuth.me);
router.get('/auth/users',        mdAuth.ensureAuth, controllerAuth.getUsers);
router.post('/auth/users',       mdAuth.ensureAuth, controllerAuth.createUser);
router.put('/auth/users/:id',    mdAuth.ensureAuth, controllerAuth.updateUser);
router.delete('/auth/users/:id', mdAuth.ensureAuth, controllerAuth.deleteUser);

module.exports = router;
