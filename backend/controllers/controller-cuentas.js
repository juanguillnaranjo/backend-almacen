'use strict'

var Cuenta = require('../modules/cuenta');
var Movimiento = require('../modules/module-movimientos');
var defaultCuentasService = require('./services/default-cuentas.service');

// Mapa jerárquico del plan de cuentas (compatible con Odoo / QuickBooks)
const CATEGORIA_PREFIJOS = {
    'Activo Corriente':        '1.1',
    'Activo No Corriente':     '1.2',
    'Pasivo Corriente':        '2.1',
    'Pasivo No Corriente':     '2.2',
    'Patrimonio':              '3.0',
    'Ingresos Operacionales':  '4.1',
    'Otros Ingresos':          '4.2',
    'Costos de Ventas':        '5.1',
    'Gastos Operacionales':    '5.2',
    'Gastos No Operacionales': '5.3',
};

async function generarIdCuenta(categoria) {
    const prefijo = CATEGORIA_PREFIJOS[categoria];
    if (!prefijo) throw new Error(`Categoria no reconocida: ${categoria}`);

    const prefijoRegex = prefijo.replace(/\./g, '\\.');
    const cuentas = await Cuenta.find({
        idCuenta: { $regex: `^${prefijoRegex}\\.` }
    }).select('idCuenta');

    let siguiente = 1;
    if (cuentas.length > 0) {
        const secuencias = cuentas.map(c => {
            const partes = c.idCuenta.split('.');
            return parseInt(partes[partes.length - 1], 10) || 0;
        });
        siguiente = Math.max(...secuencias) + 1;
    }

    return `${prefijo}.${String(siguiente).padStart(3, '0')}`;
}

var controller = {
// metodos para cuentas

    getCuentas: async (req, res) => {
        try {
            const cuentas = await Cuenta.find({}).sort({ idCuenta: 1 });
            if (!cuentas || cuentas.length === 0) return res.status(404).send({ message: 'No hay cuentas para mostrar' });

            const cuentasIds = cuentas.map(c => c._id);
            const saldosPorCuenta = await Movimiento.aggregate([
                { $match: { cuentaId: { $in: cuentasIds } } },
                {
                    $group: {
                        _id: '$cuentaId',
                        saldo: {
                            $sum: {
                                $subtract: [
                                    { $ifNull: ['$debe', '$debito'] },
                                    { $ifNull: ['$haber', '$credito'] }
                                ]
                            }
                        }
                    }
                }
            ]);

            const saldoMap = new Map(
                saldosPorCuenta.map(item => [String(item._id), Number(item.saldo || 0)])
            );

            const cuentasConSaldo = cuentas.map(cuenta => {
                const cuentaObj = cuenta.toObject();
                cuentaObj.saldo = saldoMap.get(String(cuenta._id)) || 0;
                return cuentaObj;
            });

            return res.status(200).send({ cuentas: cuentasConSaldo });
        } catch (err) {
            return res.status(500).send({ message: 'Error al devolver las cuentas', error: err });
        }
    },

    
    createCuenta: async (req, res) => {
        try {
            const params = req.body;

            const idCuenta = await generarIdCuenta(params.categoria);

            const cuenta = new Cuenta({
                idCuenta,
                nombre:      params.nombre,
                descripcion: params.descripcion,
                categoria:   params.categoria
            });

            const cuentaStored = await cuenta.save();
            const cuentaConSaldo = cuentaStored.toObject();
            cuentaConSaldo.saldo = 0;
            return res.status(200).send({ cuenta: cuentaConSaldo });
        } catch (err) {
            return res.status(500).send({ message: 'Error al guardar la cuenta', error: err.message || err });
        }
    },

    initCuentasDefault: async (req, res) => {
        try {
            const resultado = await defaultCuentasService.inicializarCuentasPorDefecto();
            return res.status(200).send({
                message: 'Inicializacion de cuentas por defecto ejecutada',
                resultado
            });
        } catch (err) {
            return res.status(500).send({ message: 'Error al inicializar cuentas por defecto', error: err.message || err });
        }
    }
    
};
module.exports = controller;