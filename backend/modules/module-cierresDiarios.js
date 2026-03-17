'use strict'

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var CierreDiarioSchema = Schema({
	fecha: { type: Date, required: true, unique: true },
	baseInicial: { type: Number, required: true, default: 0 },
	totalVentas: { type: Number, required: true, default: 0 },
	totalAbonos: { type: Number, required: true, default: 0 },
	totalGastos: { type: Number, required: true, default: 0 },
	gastosArgemiro: { type: Number, required: true, default: 0 },
	retiroTransferencias: { type: Number, required: true, default: 0 },
	retiroJuan: { type: Number, required: true, default: 0 },
	retiroYolanda: { type: Number, required: true, default: 0 },
	efectivoTeorico: { type: Number, required: true, default: 0 },
	efectivoReal: { type: Number, required: true, default: 0 },
	diferencia: { type: Number, required: true, default: 0 },
	origen: { type: String, default: 'externo' },
	fechaRecepcion: { type: Date, default: Date.now }
}, { collection: 'cierrediarios' });

module.exports = mongoose.model('CierreDiario', CierreDiarioSchema);
