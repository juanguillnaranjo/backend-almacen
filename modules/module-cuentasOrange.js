'use strict'

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var CuentaOrangeSchema = Schema({
	idCuenta: { type: String, unique: true },
	nombre: { type: String, required: true },
	descripcion: { type: String, default: '' },
	categoria: { type: String, required: true },
	liquidez: { type: Boolean, default: false },
	fechaCreacion: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CuentaOrange', CuentaOrangeSchema);
