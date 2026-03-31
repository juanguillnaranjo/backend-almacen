'use strict'

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Jerarquía de 4 niveles:
//   Nivel 1 - clase  : comida, bebidas, licores, etc.
//   Nivel 2 - tipo   : pizza, hamburguesa, cerveza, etc.
//   Nivel 3 - tamano : personal, mediana, grande, etc.
//   Nivel 4 - sabor  : pepperoni, hawaiana, clásica, etc.  ← producto final

var InventarioOrangeSchema = Schema({
	codigo: {
		type: String,
		required: true,
		unique: true,
		trim: true,
		uppercase: true,
		index: true
	},
	clase: {
		type: String,
		required: true,
		trim: true,
		lowercase: true,
		index: true
	},
	tipo: {
		type: String,
		required: true,
		trim: true,
		lowercase: true,
		index: true
	},
	tamano: {
		type: String,
		required: true,
		trim: true,
		lowercase: true,
		index: true
	},
	sabor: {
		type: String,
		required: true,
		trim: true,
		index: true
	},
	costoUnitario: {
		type: Number,
		required: true,
		min: 0,
		default: 0
	},
	precioVenta: {
		type: Number,
		required: true,
		min: 0,
		default: 0
	},
	cantidad: {
		type: Number,
		default: 0,
		min: 0,
		index: true
	},
	activo: {
		type: Boolean,
		default: true,
		index: true
	},
	descripcion: {
		type: String,
		default: ''
	},
	icono: {
		type: String,
		default: ''
	},
	// Tipo de producto:
	//   'elaborado'  → producto terminado que se compra ya hecho (licores, cervezas, etc.)
	//   'producido'  → producto que se elabora en el restaurante y tiene receta con insumos
	tipoProducto: {
		type: String,
		enum: ['elaborado', 'producido'],
		default: 'elaborado',
		index: true
	},
	// Receta del producto (solo aplica cuando tipoProducto === 'producido')
	// Cada línea referencia un Insumo y la cantidad necesaria para producir UNA unidad
	receta: [
		{
			insumo: {
				type: Schema.Types.ObjectId,
				ref: 'Insumo',
				required: true
			},
			cantidad: {
				type: Number,
				required: true,
				min: 0
			},
			_id: false
		}
	],
	fechaCreacion: {
		type: Date,
		default: Date.now
	},
	fechaActualizacion: {
		type: Date,
		default: Date.now
	}
});

// Índices compuestos para navegación jerárquica
InventarioOrangeSchema.index({ clase: 1, tipo: 1 });
InventarioOrangeSchema.index({ clase: 1, tipo: 1, tamano: 1 });
// Combinación única: no puede haber dos productos con misma clase+tipo+tamano+sabor
InventarioOrangeSchema.index({ clase: 1, tipo: 1, tamano: 1, sabor: 1 }, { unique: true });

InventarioOrangeSchema.pre('save', function () {
	this.fechaActualizacion = Date.now();
});

module.exports = mongoose.model('InventarioOrange', InventarioOrangeSchema);
