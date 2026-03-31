'use strict'

const POS_MENU_ORANGE = [
	{
		id: 'inventario',
		nombre: 'Inventario',
		descripcion: 'Gestion de productos por niveles (clase, tipo, tamano y sabor).',
		ruta: '/orange/inventario',
		habilitado: true,
		icono: '📦',
		orden: 1
	},
	{
		id: 'ventas',
		nombre: 'Ventas',
		descripcion: 'Registro de pedidos y facturacion POS en mostrador.',
		ruta: '/orange/pos/ventas',
		habilitado: true,
		icono: '🧾',
		orden: 2
	},
	{
		id: 'gastos',
		nombre: 'Gastos',
		descripcion: 'Control y clasificacion contable de gastos Orange.',
		ruta: '/orange/gastos',
		habilitado: true,
		icono: '💸',
		orden: 3
	},
	{
		id: 'retiros-caja',
		nombre: 'Retiros Caja Orange',
		descripcion: 'Registro de retiros de caja en efectivo, tarjeta y transferencia.',
		ruta: '/orange/pos/retiros',
		habilitado: true,
		icono: '🏧',
		orden: 4
	},
	{
		id: 'domicilios',
		nombre: 'Domicilios',
		descripcion: 'Despacho y seguimiento de pedidos a domicilio.',
		ruta: '/orange/pos/domicilios',
		habilitado: false,
		icono: '🛵',
		orden: 5
	},
	{
		id: 'cierre-caja',
		nombre: 'Cierre de Caja',
		descripcion: 'Consolidado diario de caja y resultados del punto de venta.',
		ruta: '/orange/cierre-caja',
		habilitado: true,
		icono: '🔐',
		orden: 6
	},
	{
		id: 'deudas',
		nombre: 'Deudas Orange',
		descripcion: 'Gestion de deudas y proveedores a pagar.',
		ruta: '/orange/deudas',
		habilitado: true,
		icono: '📋',
		orden: 7
	}
];

exports.getPosOrangeMenu = async function (req, res) {
	try {
		return res.status(200).json({
			success: true,
			menu: POS_MENU_ORANGE
		});
	} catch (err) {
		return res.status(500).json({
			success: false,
			message: 'Error al obtener menu POS Orange',
			error: err.message
		});
	}
};
