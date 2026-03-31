'use strict'

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var GastoOrangeSchema = Schema({
	fecha: {
		type: Date,
		required: true,
		index: true,
		default: Date.now
	},
	monto: {
		type: Number,
		required: true,
		min: 0.01
	},
	claseGasto: {
		type: String,
		required: true,
		trim: true,
		lowercase: true,
		index: true
	},
	subclaseGasto: {
		type: String,
		required: true,
		trim: true,
		lowercase: true,
		index: true
	},
	tipoGasto: {
		type: String,
		required: true,
		trim: true,
		lowercase: true
	},
	categoriaGasto: {
		type: String,
		default: ''
	},
	descripcion: {
		type: String,
		required: true,
		trim: true
	},
	observaciones: {
		type: String,
		default: ''
	},
	cuentaDebeId: {
		type: Schema.Types.ObjectId,
		ref: 'CuentaOrange',
		required: true
	},
	cuentaHaberId: {
		type: Schema.Types.ObjectId,
		ref: 'CuentaOrange',
		required: true
	}
}, {
	timestamps: true,
	collection: 'gastosorange'
});

GastoOrangeSchema.index({ claseGasto: 1, subclaseGasto: 1, tipoGasto: 1 });

module.exports = mongoose.model('GastoOrange', GastoOrangeSchema);
