'use strict'

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var IngresoMioSchema = Schema({
	fecha: { type: Date, required: true, index: true },
	monto: { type: Number, required: true, min: 0.01 },
	fuenteIngreso: { type: String, required: true, trim: true, index: true },
	categoriaFuente: { type: String, required: true, trim: true, index: true },
	descripcion: { type: String, required: true, trim: true },
	observaciones: { type: String, default: '', trim: true },
	cuentaDebeId: { type: Schema.Types.ObjectId, ref: 'CuentaMia', required: true, index: true },
	cuentaHaberId: { type: Schema.Types.ObjectId, ref: 'CuentaMia', required: true, index: true }
}, {
	timestamps: true,
	collection: 'ingresosmios'
});

module.exports = mongoose.model('IngresoMio', IngresoMioSchema);
