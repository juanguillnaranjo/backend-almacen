'use strict'

var Cuenta = require('../../modules/cuenta');

const CUENTAS_POR_DEFECTO = [
	{
		idCuenta: '1.1.001',
		nombre: 'CAJA EFECTIVO ALMACEN',
		descripcion: 'Caja principal de efectivo del almacen',
		categoria: 'Activo Corriente',
		liquidez: true
	},
	{
		idCuenta: '1.1.002',
		nombre: 'CUENTA BANCARIA ALMACEN',
		descripcion: 'Cuenta bancaria operativa del almacen',
		categoria: 'Activo Corriente',
		liquidez: true
	},
	{
		idCuenta: '1.1.003',
		nombre: 'RETIROS EFECTIVO JUAN',
		descripcion: 'Retiros de efectivo realizados por Juan Guillermo',
		categoria: 'Activo Corriente',
		liquidez: true
	},
	{
		idCuenta: '1.1.004',
		nombre: 'RETIROS EFECTIVO DONA YOLANDA',
		descripcion: 'Retiros de efectivo realizados por Dona Yolanda',
		categoria: 'Activo Corriente',
		liquidez: true
	},
	{
		idCuenta: '1.1.005',
		nombre: 'INVENTARIOS/COMPRAS',
		descripcion: 'Inventario de mercancia y compras a proveedores',
		categoria: 'Activo Corriente',
		liquidez: false
	},
	{
		idCuenta: '1.1.006',
		nombre: 'CUENTAS POR COBRAR',
		descripcion: 'Registro de las cuentas por cobrar, clientes y mas',
		categoria: 'Activo Corriente',
		liquidez: false
	},
	{
		idCuenta: '2.1.001',
		nombre: 'DEUDAS PROVEEDORES',
		descripcion: 'Registro de las deudas a los proveedores',
		categoria: 'Pasivo Corriente',
		liquidez: false
	},
	{
		idCuenta: '2.1.002',
		nombre: 'DEUDA CON JUAN',
		descripcion: 'Dinero prestado de Juan al almacén',
		categoria: 'Pasivo Corriente',
		liquidez: false
	},
	{
		idCuenta: '3.0.001',
		nombre: 'CAPITAL',
		descripcion: 'Lo que el dueño aporta al negocio',
		categoria: 'Patrimonio',
		liquidez: false
	},
	{
		idCuenta: '3.0.002',
		nombre: 'UTILIDADES ACUMULADAS',
		descripcion: 'Lo que se ha guardado de utilidades',
		categoria: 'Patrimonio',
		liquidez: false
	},
	{
		idCuenta: '4.1.001',
		nombre: 'VENTAS ALMACEN',
		descripcion: 'Ingresos por ventas del almacen',
		categoria: 'Ingresos Operacionales',
		liquidez: false
	},
	{
		idCuenta: '4.1.002',
		nombre: 'VENTAS A CREDITO',
		descripcion: 'Ingresos por ventas del almacen realizadas a credito',
		categoria: 'Ingresos Operacionales',
		liquidez: false
	},
	{
		idCuenta: '5.2.001',
		nombre: 'GASTOS ALMACEN',
		descripcion: 'Gastos operacionales del almacen',
		categoria: 'Gastos Operacionales',
		liquidez: false
	},
	{
		idCuenta: '5.2.002',
		nombre: 'GASTOS ARGEMIRO',
		descripcion: 'Gastos asociados a Argemiro',
		categoria: 'Gastos Operacionales',
		liquidez: false
	},
	{
		idCuenta: '5.2.003',
		nombre: 'VIATICOS SURTIDO',
		descripcion: 'Registro de los viáticos requeridos para surtir',
		categoria: 'Gastos Operacionales',
		liquidez: false
	},
	{
		idCuenta: '3.0.003',
		nombre: 'CAPITAL HISTORICO CARTERA ALMACEN',
		descripcion: 'Saldo histórico de la cartera de crédito del almacén',
		categoria: 'Patrimonio',
		liquidez: false
	}
];

async function crearCuentasPorDefectoSiVacia() {
	const total = await Cuenta.countDocuments({});

	if (total > 0) {
		return {
			inicializada: false,
			motivo: 'La colección cuentas ya tiene registros',
			totalActual: total
		};
	}

	const creadas = await Cuenta.insertMany(
		CUENTAS_POR_DEFECTO.map((cuenta) => ({ ...cuenta })),
		{ ordered: true }
	);

	return {
		inicializada: true,
		totalCreadas: creadas.length
	};
}

async function upsertCuentaPorDefecto(def) {
	let cuenta = await Cuenta.findOne({
		$or: [
			{ idCuenta: def.idCuenta },
			{ nombre: def.nombre }
		]
	});

	if (!cuenta) {
		const cuentaCreada = await Cuenta.create(def);
		return { estado: 'creada', cuenta: cuentaCreada };
	}

	const cambios = {};
	if (cuenta.idCuenta !== def.idCuenta) cambios.idCuenta = def.idCuenta;
	if (cuenta.nombre !== def.nombre) cambios.nombre = def.nombre;
	if (cuenta.descripcion !== def.descripcion) cambios.descripcion = def.descripcion;
	if (cuenta.categoria !== def.categoria) cambios.categoria = def.categoria;
	if (Boolean(cuenta.liquidez) !== Boolean(def.liquidez)) cambios.liquidez = Boolean(def.liquidez);

	if (Object.keys(cambios).length === 0) {
		return { estado: 'sin-cambios', cuenta };
	}

	const cuentaActualizada = await Cuenta.findByIdAndUpdate(
		cuenta._id,
		cambios,
		{ returnDocument: 'after' }
	);

	return { estado: 'actualizada', cuenta: cuentaActualizada };
}

async function inicializarCuentasPorDefecto() {
	const resumen = {
		totalDefinidas: CUENTAS_POR_DEFECTO.length,
		creadas: 0,
		actualizadas: 0,
		sinCambios: 0,
		detalle: []
	};

	for (const cuentaDef of CUENTAS_POR_DEFECTO) {
		const resultado = await upsertCuentaPorDefecto(cuentaDef);

		if (resultado.estado === 'creada') resumen.creadas += 1;
		if (resultado.estado === 'actualizada') resumen.actualizadas += 1;
		if (resultado.estado === 'sin-cambios') resumen.sinCambios += 1;

		resumen.detalle.push({
			estado: resultado.estado,
			idCuenta: resultado.cuenta.idCuenta,
			nombre: resultado.cuenta.nombre,
			categoria: resultado.cuenta.categoria,
			liquidez: Boolean(resultado.cuenta.liquidez)
		});
	}

	return resumen;
}

module.exports = {
	CUENTAS_POR_DEFECTO,
	crearCuentasPorDefectoSiVacia,
	inicializarCuentasPorDefecto
};