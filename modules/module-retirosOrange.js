'use strict'

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var RetiroOrangeSchema = Schema({
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
	descripcion: {
		type: String,
		required: true,
		trim: true
	}
}, {
	timestamps: true,
	collection: 'retirosorange'
});

RetiroOrangeSchema.index({ fecha: -1 });

module.exports = mongoose.model('RetiroOrange', RetiroOrangeSchema);
