'use strict'

var mongoose = require('mongoose');

var TipoDeudaFamiliarSchema = new mongoose.Schema(
	{
		nombre: {
			type: String,
			required: true,
			trim: true,
			lowercase: true,
			unique: true,
			index: true
		}
	},
	{ timestamps: true }
);

module.exports = mongoose.model('TipoDeudaFamiliar', TipoDeudaFamiliarSchema);