'use strict'

var CuentaOrange = require('../../modules/module-cuentasOrange');

const CUENTAS_ORANGE_POR_DEFECTO = [
	{
		idCuenta: 'O1.1.001',
		nombre: 'CAJA EFECTIVO ORANGE',
		descripcion: 'Caja principal de efectivo del negocio Orange',
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
		nombre: 'CAJA NEGOCIO ORANGE',
		descripcion: 'Caja del negocio Orange',
		categoria: 'Activo Corriente',
		liquidez: true
	},
	{
		idCuenta: 'O1.1.004',
		nombre: 'CUENTAS POR COBRAR ORANGE',
		descripcion: 'Registro de cuentas por cobrar del negocio Orange',
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
		nombre: 'DEUDAS PROVEEDORES ORANGE',
		descripcion: 'Registro de deudas a proveedores del negocio Orange',
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
		nombre: 'CAPITAL ORANGE',
		descripcion: 'Capital aportado al negocio Orange',
		categoria: 'Patrimonio',
		liquidez: false
	},
	{
		idCuenta: 'O3.0.002',
		nombre: 'UTILIDADES ACUMULADAS ORANGE',
		descripcion: 'Utilidades acumuladas del negocio Orange',
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
		nombre: 'VENTAS A CREDITO ORANGE',
		descripcion: 'Ingresos por ventas a crédito del negocio Orange',
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
		nombre: 'GASTOS OPERACIONALES ORANGE',
		descripcion: 'Gastos operacionales del negocio Orange',
		categoria: 'Gastos Operacionales',
		liquidez: false
	}
];

async function upsertCuentaOrangePorDefecto(def) {
	let cuenta = await CuentaOrange.findOne({
		$or: [
			{ idCuenta: def.idCuenta },
			{ nombre: def.nombre }
		]
	});

	if (!cuenta) {
		const cuentaCreada = await CuentaOrange.create(def);
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
