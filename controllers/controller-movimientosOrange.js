'use strict'

var mongoose = require('mongoose');
var MovimientoOrange = require('../modules/module-movimientosOrange');
var CuentaOrange = require('../modules/module-cuentasOrange');

const ORIGENES_MODELO_VALIDOS = ['ventas', 'compras', 'gastos', 'pagos', 'ingresos', 'nomina', 'manual', 'cierre_orange', 'deudasorange'];

function normalizarOrigenModelo(valor) {
    if (valor === undefined || valor === null) return '';
    return String(valor).trim().toLowerCase();
}

function esOrigenModeloValido(origen) {
    return ORIGENES_MODELO_VALIDOS.includes(origen);
}

function normalizarTexto(valor) {
    return String(valor || '').trim();
}

function normalizarFecha(fecha) {
    const valor = String(fecha || '').trim();
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
    if (match) {
        const year = Number(match[1]);
        const month = Number(match[2]) - 1;
        const day = Number(match[3]);
        const date = new Date(year, month, day);
        if (isNaN(date.getTime())) return null;
        date.setHours(0, 0, 0, 0);
        return date;
    }
    const date = new Date(valor);
    if (isNaN(date.getTime())) return null;
    date.setHours(0, 0, 0, 0);
    return date;
}

var controller = {

    getMovimientosOrange: async (req, res) => {
        try {
            const movimientos = await MovimientoOrange.find({})
                .populate('cuentaId', 'idCuenta nombre categoria')
                .sort({ fecha: -1, _id: -1 });

            if (!movimientos || movimientos.length === 0) {
                return res.status(404).send({ message: 'No hay movimientos Orange para mostrar' });
            }

            return res.status(200).send({ movimientos });
        } catch (err) {
            return res.status(500).send({ message: 'Error al obtener movimientos Orange', error: err.message || err });
        }
    },

    getMovimientosOrangeByCuenta: async (req, res) => {
        try {
            const { cuentaId } = req.params;

            if (!cuentaId || !mongoose.Types.ObjectId.isValid(cuentaId)) {
                return res.status(400).send({ message: 'cuentaId invalido' });
            }

            const movimientos = await MovimientoOrange.find({ cuentaId })
                .populate('cuentaId', 'idCuenta nombre categoria')
                .sort({ fecha: -1, _id: -1 });

            if (!movimientos || movimientos.length === 0) {
                return res.status(404).send({ message: 'No hay movimientos Orange para la cuenta seleccionada' });
            }

            return res.status(200).send({ movimientos });
        } catch (err) {
            return res.status(500).send({ message: 'Error al obtener movimientos Orange por cuenta', error: err.message || err });
        }
    },

    createAsientoManualOrange: async (req, res) => {
        try {
            const params = req.body || {};
            const cuentaOrigenId = normalizarTexto(params.cuentaOrigenId);
            const cuentaDestinoId = normalizarTexto(params.cuentaDestinoId);
            const descripcion = normalizarTexto(params.descripcion);
            const fecha = normalizarFecha(params.fecha);
            const monto = Number(params.monto || 0);
            const origenModelo = normalizarOrigenModelo(params.origenModelo) || 'manual';

            if (!cuentaOrigenId || !cuentaDestinoId || !descripcion || !params.fecha) {
                return res.status(400).send({ message: 'Los campos cuentaOrigenId, cuentaDestinoId, descripcion y fecha son obligatorios' });
            }

            if (!fecha) {
                return res.status(400).send({ message: 'Fecha invalida. Usa formato YYYY-MM-DD' });
            }

            if (!esOrigenModeloValido(origenModelo)) {
                return res.status(400).send({
                    message: `origenModelo invalido. Valores permitidos: ${ORIGENES_MODELO_VALIDOS.join(', ')}`
                });
            }

            if (!mongoose.Types.ObjectId.isValid(cuentaOrigenId) || !mongoose.Types.ObjectId.isValid(cuentaDestinoId)) {
                return res.status(400).send({ message: 'Cuenta origen o destino invalida' });
            }

            if (cuentaOrigenId === cuentaDestinoId) {
                return res.status(400).send({ message: 'La cuenta origen y la cuenta destino deben ser diferentes' });
            }

            if (!(monto > 0)) {
                return res.status(400).send({ message: 'El monto debe ser mayor a 0' });
            }

            const [cuentaOrigen, cuentaDestino] = await Promise.all([
                CuentaOrange.findById(cuentaOrigenId),
                CuentaOrange.findById(cuentaDestinoId)
            ]);

            if (!cuentaOrigen || !cuentaDestino) {
                return res.status(404).send({ message: 'La cuenta origen o destino no existe en Orange' });
            }

            const idOrigen = new mongoose.Types.ObjectId();

            const guardados = await MovimientoOrange.insertMany([
                {
                    cuentaId: cuentaOrigenId,
                    origenModelo,
                    _idOrigen: idOrigen,
                    debe: 0,
                    haber: monto,
                    descripcion: `${descripcion} (origen)`,
                    fecha
                },
                {
                    cuentaId: cuentaDestinoId,
                    origenModelo,
                    _idOrigen: idOrigen,
                    debe: monto,
                    haber: 0,
                    descripcion: `${descripcion} (destino)`,
                    fecha
                }
            ]);

            const ids = guardados.map(m => m._id);
            const movimientos = await MovimientoOrange.find({ _id: { $in: ids } })
                .populate('cuentaId', 'idCuenta nombre categoria')
                .sort({ debe: -1 });

            return res.status(200).send({ movimientos, _idOrigen: idOrigen });
        } catch (err) {
            return res.status(500).send({ message: 'Error al crear el asiento manual Orange', error: err.message || err });
        }
    },

    updateAsientoManualOrange: async (req, res) => {
        try {
            const { idOrigen } = req.params;

            if (!idOrigen || !mongoose.Types.ObjectId.isValid(idOrigen)) {
                return res.status(400).send({ message: 'idOrigen invalido' });
            }

            const params = req.body || {};
            const cuentaOrigenId = normalizarTexto(params.cuentaOrigenId);
            const cuentaDestinoId = normalizarTexto(params.cuentaDestinoId);
            const descripcion = normalizarTexto(params.descripcion);
            const fecha = normalizarFecha(params.fecha);
            const monto = Number(params.monto || 0);

            if (!cuentaOrigenId || !cuentaDestinoId || !descripcion || !params.fecha) {
                return res.status(400).send({ message: 'Los campos cuentaOrigenId, cuentaDestinoId, descripcion y fecha son obligatorios' });
            }

            if (!fecha) {
                return res.status(400).send({ message: 'Fecha invalida. Usa formato YYYY-MM-DD' });
            }

            if (!mongoose.Types.ObjectId.isValid(cuentaOrigenId) || !mongoose.Types.ObjectId.isValid(cuentaDestinoId)) {
                return res.status(400).send({ message: 'Cuenta origen o destino invalida' });
            }

            if (cuentaOrigenId === cuentaDestinoId) {
                return res.status(400).send({ message: 'La cuenta origen y la cuenta destino deben ser diferentes' });
            }

            if (!(monto > 0)) {
                return res.status(400).send({ message: 'El monto debe ser mayor a 0' });
            }

            const existentes = await MovimientoOrange.find({ _idOrigen: idOrigen, origenModelo: 'manual' });
            if (!existentes || existentes.length === 0) {
                return res.status(404).send({ message: 'No existe asiento manual Orange para el idOrigen indicado' });
            }

            const [cuentaOrigen, cuentaDestino] = await Promise.all([
                CuentaOrange.findById(cuentaOrigenId),
                CuentaOrange.findById(cuentaDestinoId)
            ]);

            if (!cuentaOrigen || !cuentaDestino) {
                return res.status(404).send({ message: 'La cuenta origen o destino no existe en Orange' });
            }

            await MovimientoOrange.deleteMany({ _idOrigen: idOrigen, origenModelo: 'manual' });

            const guardados = await MovimientoOrange.insertMany([
                {
                    cuentaId: cuentaOrigenId,
                    origenModelo: 'manual',
                    _idOrigen: idOrigen,
                    debe: 0,
                    haber: monto,
                    descripcion: `${descripcion} (origen)`,
                    fecha
                },
                {
                    cuentaId: cuentaDestinoId,
                    origenModelo: 'manual',
                    _idOrigen: idOrigen,
                    debe: monto,
                    haber: 0,
                    descripcion: `${descripcion} (destino)`,
                    fecha
                }
            ]);

            const ids = guardados.map(m => m._id);
            const movimientos = await MovimientoOrange.find({ _id: { $in: ids } })
                .populate('cuentaId', 'idCuenta nombre categoria')
                .sort({ debe: -1 });

            return res.status(200).send({ movimientos, _idOrigen: idOrigen });
        } catch (err) {
            return res.status(500).send({ message: 'Error al actualizar el asiento manual Orange', error: err.message || err });
        }
    },

    deleteAsientoManualOrange: async (req, res) => {
        try {
            const { idOrigen } = req.params;

            if (!idOrigen || !mongoose.Types.ObjectId.isValid(idOrigen)) {
                return res.status(400).send({ message: 'idOrigen invalido' });
            }

            const result = await MovimientoOrange.deleteMany({ _idOrigen: idOrigen, origenModelo: 'manual' });

            if (!result || result.deletedCount === 0) {
                return res.status(404).send({ message: 'No existe asiento manual Orange para eliminar con el idOrigen indicado' });
            }

            return res.status(200).send({ deletedCount: result.deletedCount, _idOrigen: idOrigen });
        } catch (err) {
            return res.status(500).send({ message: 'Error al eliminar el asiento manual Orange', error: err.message || err });
        }
    }

};

module.exports = controller;
