'use strict'

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Insumos: materias primas / ingredientes que se compran y se usan en recetas
// También pueden venderse directamente o llevarse al inventario.

var InsumoSchema = Schema({
	codigo: {
		type: String,
		required: true,
		unique: true,
		trim: true,
		uppercase: true,
		index: true
	},
	nombre: {
		type: String,
		required: true,
		trim: true,
		index: true
	},
	unidadMedida: {
		type: String,
		required: true,
		trim: true,
		default: 'unidades'
		// Ejemplos: kg, g, litros, ml, unidades, porciones, tazas, cucharadas
	},
	costoUnitario: {
		type: Number,
		required: true,
		min: 0,
		default: 0
	},
	cantidad: {
		type: Number,
		default: 0,
		min: 0
	},
	cantidadMinima: {
		type: Number,
		default: 0,
		min: 0
	},
	descripcion: {
		type: String,
		default: ''
	},
	activo: {
		type: Boolean,
		default: true,
		index: true
	},
	fechaCreacion: {
		type: Date,
		default: Date.now
	},
	fechaActualizacion: {
		type: Date,
		default: Date.now
	}
});

InsumoSchema.pre('save', function () {
	this.fechaActualizacion = Date.now();
});

module.exports = mongoose.model('Insumo', InsumoSchema);
