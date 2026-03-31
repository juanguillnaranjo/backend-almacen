'use strict'

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var CierreOrangeSchema = Schema({
	fecha:                { type: Date,   required: true, unique: true },
	baseInicial:          { type: Number, required: true, default: 0 },
	totalVentas:          { type: Number, required: true, default: 0 },
	totalGastos:          { type: Number, required: true, default: 0 },
	retiroEfectivo:       { type: Number, required: true, default: 0 },
	retiroTransferencias: { type: Number, required: true, default: 0 },
	efectivoReal:         { type: Number, required: true, default: 0 },
	baseSigDia:           { type: Number, required: true, default: 0 },
	efectivoTeorico:      { type: Number, required: true, default: 0 },
	diferencia:           { type: Number, required: true, default: 0 },
	ventaTotalDomicilio:  { type: Number, required: true, default: 0 },
	ventaTotalMesas:      { type: Number, required: true, default: 0 },
	ventaTotalLlevar:     { type: Number, required: true, default: 0 },
	origen:               { type: String, default: 'externo' },
	fechaRecepcion:       { type: Date,   default: Date.now }
}, { collection: 'cierresorange' });

module.exports = mongoose.model('CierreOrange', CierreOrangeSchema);
