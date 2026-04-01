'use strict'

var CuentaMia = require('../../modules/module-cuentasMias');

const CUENTAS_MIAS_POR_DEFECTO = [
	{
		idCuenta: 'P1.1.001',
		nombre: 'CUENTA BANCARIA PERSONAL',
		descripcion: 'Cuenta bancaria de ahorros personal',
		categoria: 'Activo Corriente',
		liquidez: true
	},
	{
		idCuenta: 'P1.1.002',
		nombre: 'EFECTIVO PERSONAL',
		descripcion: 'Dinero en efectivo personal',
		categoria: 'Activo Corriente',
		liquidez: true
	},
	{
		idCuenta: 'P1.2.001',
		nombre: 'CONSTRUCCION CASA',
		descripcion: 'Registro de lo pagado para la construccion de la casa',
		categoria: 'Activo No Corriente',
		liquidez: false
	},
	{
		idCuenta: 'P1.2.002',
		nombre: 'CUENTAS POR COBRAR PERSONAL',
		descripcion: 'consolidado de Cobrar por prestamo de dinero',
		categoria: 'Activo No Corriente',
		liquidez: false
	},
	{
		idCuenta: 'P2.2.005',
		nombre: 'DEUDAS CONTABILIDAD PERSONAL',
		descripcion: 'Registro de todas las deudas de la contabilidad personal',
		categoria: 'Pasivo No Corriente',
		liquidez: false
	},
	{
		idCuenta: 'P3.0.001',
		nombre: 'CAPITAL CASA',
		descripcion: 'Lo pagado en la construccion de la casa',
		categoria: 'Patrimonio',
		liquidez: false
	},
	{
		idCuenta: 'P3.0.002',
		nombre: 'HISTORICO DE CUENTAS POR COBRAR PERSONAL',
		descripcion: 'Registro de las cuentas por cobrar histórica antes de la implementación del sistema',
		categoria: 'Patrimonio',
		liquidez: false
	},
	{
		idCuenta: 'P3.0.003',
		nombre: 'CAPITAL INICIAL',
		descripcion: 'Capital inicial para registro de los activos caja y bancos',
		categoria: 'Patrimonio',
		liquidez: false
	},
	{
		idCuenta: 'P4.2.001',
		nombre: 'HONORARIOS ALCALDIA',
		descripcion: 'Ingresos por honorarios de sistemas de la alcaldia',
		categoria: 'Otros Ingresos',
		liquidez: false
	},
	{
		idCuenta: 'P4.2.002',
		nombre: 'INGRESOS ALMACEN',
		descripcion: 'Ingresos por utilidades del almacen',
		categoria: 'Otros Ingresos',
		liquidez: false
	},
	{
		idCuenta: 'P4.2.003',
		nombre: 'INGRESOS ORANGE',
		descripcion: 'Ingresos de orange por utilidades',
		categoria: 'Otros Ingresos',
		liquidez: false
	},
	{
		idCuenta: 'P5.3.001',
		nombre: 'GASTOS CONTABILIDAD PERSONAL',
		descripcion: 'Registro de todos los gastos que se generan en la familia y que se pagan por esta contabilidad',
		categoria: 'Gastos No Operacionales',
		liquidez: false
	}
];

async function upsertCuentaMiaPorDefecto(def) {
	let cuenta = await CuentaMia.findOne({ idCuenta: def.idCuenta });

	if (!cuenta) {
		const cuentaCreada = await CuentaMia.create(def);
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

	const cuentaActualizada = await CuentaMia.findByIdAndUpdate(
		cuenta._id,
		cambios,
		{ returnDocument: 'after' }
	);

	return { estado: 'actualizada', cuenta: cuentaActualizada };
}

async function inicializarCuentasMiasPorDefecto() {
	const resumen = {
		totalDefinidas: CUENTAS_MIAS_POR_DEFECTO.length,
		creadas: 0,
		actualizadas: 0,
		sinCambios: 0,
		detalle: []
	};

	for (const cuentaDef of CUENTAS_MIAS_POR_DEFECTO) {
		const resultado = await upsertCuentaMiaPorDefecto(cuentaDef);

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
	CUENTAS_MIAS_POR_DEFECTO,
	inicializarCuentasMiasPorDefecto
};
