'use strict'

var CuentaOrange = require('../../modules/module-cuentasOrange');

const CUENTAS_ORANGE_POR_DEFECTO = [
	{
		idCuenta: 'O1.1.001',
		nombre: 'CAJA ORANGE',
		descripcion: 'Caja principal de efectivo de Orange',
		categoria: 'Activo Corriente',
		liquidez: true
	},
	{
		idCuenta: 'O1.1.002',
		nombre: 'CUENTA BANCARIA ORANGE',
		descripcion: 'Cuenta bancaria operativa del negocio Orange',
		categoria: 'Activo Corriente',
		liquidez: true
	},
	{
		idCuenta: 'O1.1.003',
		nombre: 'RETIRO EFECTIVO',
		descripcion: 'Retiros de efectivo de caja Orange',
		categoria: 'Activo Corriente',
		liquidez: true
	},
	{
		idCuenta: 'O1.1.004',
		nombre: 'COMPRAS / INVENTARIO',
		descripcion: 'Inventario y compras a proveedores de Orange',
		categoria: 'Activo Corriente',
		liquidez: false
	},
	{
		idCuenta: 'O1.1.005',
		nombre: 'INVENTARIOS ORANGE',
		descripcion: 'Inventario de mercancia del negocio Orange',
		categoria: 'Activo Corriente',
		liquidez: false
	},
	{
		idCuenta: 'O2.1.001',
		nombre: 'DEUDAS ORANGE',
		descripcion: 'Registro de deudas con proveedores de Orange',
		categoria: 'Pasivo Corriente',
		liquidez: false
	},
	{
		idCuenta: 'O2.2.001',
		nombre: 'DEUDAS HOGAR',
		descripcion: 'Deudas del hogar registradas en Orange',
		categoria: 'Pasivo No Corriente',
		liquidez: false
	},
	{
		idCuenta: 'O3.0.001',
		nombre: 'GASTOS NO ORANGE',
		descripcion: 'Gastos no operativos o externos asumidos por Orange',
		categoria: 'Patrimonio',
		liquidez: false
	},
	{
		idCuenta: 'O3.0.002',
		nombre: 'GASTOS FAMILIARES (HOGAR)',
		descripcion: 'Registro de gastos familiares pagados desde Orange',
		categoria: 'Patrimonio',
		liquidez: false
	},
	{
		idCuenta: 'O3.0.003',
		nombre: 'CAPITAL INICIAL',
		descripcion: 'Dinero Inicial contable',
		categoria: 'Patrimonio',
		liquidez: false
	},
	{
		idCuenta: 'O3.0.004',
		nombre: 'AJUSTE DE APERTURA DEUDAS PROVEEDORES',
		descripcion: 'Cuenta para ajuste de apertura, va contra prveedores de deudas existentes',
		categoria: 'Patrimonio',
		liquidez: false
	},
	{
		idCuenta: 'O4.1.001',
		nombre: 'VENTAS ORANGE',
		descripcion: 'Ingresos por ventas del negocio Orange',
		categoria: 'Ingresos Operacionales',
		liquidez: false
	},
	{
		idCuenta: 'O4.1.002',
		nombre: 'VENTAS DOMICILIO ORANGE',
		descripcion: 'Ingresos por ventas a domicilio del negocio Orange',
		categoria: 'Ingresos Operacionales',
		liquidez: false
	},
	{
		idCuenta: 'O4.1.003',
		nombre: 'VENTAS PARA LLEVAR ORANGE',
		descripcion: 'Ingresos por ventas para llevar del negocio Orange',
		categoria: 'Ingresos Operacionales',
		liquidez: false
	},
	{
		idCuenta: 'O5.1.001',
		nombre: 'COSTOS DE VENTAS ORANGE',
		descripcion: 'Costos directos de ventas del negocio Orange',
		categoria: 'Costos de Ventas',
		liquidez: false
	},
	{
		idCuenta: 'O5.2.001',
		nombre: 'GASTOS ORANGE',
		descripcion: 'Gastos operacionales generales de Orange',
		categoria: 'Gastos Operacionales',
		liquidez: false
	}
];

async function upsertCuentaOrangePorDefecto(def) {
	let cuenta = await CuentaOrange.findOne({ idCuenta: def.idCuenta });

	if (!cuenta) {
		const cuentaCreada = await CuentaOrange.create(def);
		return { estado: 'creada', cuenta: cuentaCreada };
	}

	const cambios = {};
	if (cuenta.nombre !== def.nombre) cambios.nombre = def.nombre;
	if (cuenta.descripcion !== def.descripcion) cambios.descripcion = def.descripcion;
	if (cuenta.categoria !== def.categoria) cambios.categoria = def.categoria;
	if (Boolean(cuenta.liquidez) !== Boolean(def.liquidez)) cambios.liquidez = Boolean(def.liquidez);

	if (Object.keys(cambios).length === 0) {
		return { estado: 'sin-cambios', cuenta };
	}

	const cuentaActualizada = await CuentaOrange.findByIdAndUpdate(
		cuenta._id,
		cambios,
		{ returnDocument: 'after' }
	);

	return { estado: 'actualizada', cuenta: cuentaActualizada };
}

async function inicializarCuentasOrangePorDefecto() {
	const resumen = {
		totalDefinidas: CUENTAS_ORANGE_POR_DEFECTO.length,
		creadas: 0,
		actualizadas: 0,
		sinCambios: 0,
		detalle: []
	};

	for (const cuentaDef of CUENTAS_ORANGE_POR_DEFECTO) {
		const resultado = await upsertCuentaOrangePorDefecto(cuentaDef);

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
	CUENTAS_ORANGE_POR_DEFECTO,
	inicializarCuentasOrangePorDefecto
};
