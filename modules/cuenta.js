'use strict'

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var CuentaSchema = Schema({
    idCuenta:    { type: String, unique: true },
    nombre:      String,
    descripcion: String,
    categoria:   String,
    liquidez:    { type: Boolean, default: false },
    fechaCreacion: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Cuenta', CuentaSchema);