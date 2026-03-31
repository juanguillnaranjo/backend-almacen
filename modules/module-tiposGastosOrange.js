'use strict'

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var TipoGastoOrangeSchema = Schema({
	clase: {
		type: String,
		required: true,
		trim: true,
		lowercase: true,
		index: true
	},
	subclase: {
		type: String,
		required: true,
		trim: true,
		lowercase: true,
		index: true
	},
	nombre: {
		type: String,
		required: true,
		trim: true,
		lowercase: true,
		index: true
	}
}, {
	timestamps: true,
	collection: 'tiposgastosorange'
});

TipoGastoOrangeSchema.index({ clase: 1, subclase: 1, nombre: 1 }, { unique: true });

module.exports = mongoose.model('TipoGastoOrange', TipoGastoOrangeSchema);
