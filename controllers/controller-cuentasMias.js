'use strict'

var CuentaMia = require('../modules/module-cuentasMias');
var MovimientoMio = require('../modules/module-movimientoMios');

// Plan de cuentas personal — misma jerarquía que la del almacén,
// prefijo 'P' para distinguir: P1.1.001 (personal) vs 1.1.001 (almacén)
const CATEGORIA_PREFIJOS = {
    'Activo Corriente':        'P1.1',
    'Activo No Corriente':     'P1.2',
    'Pasivo Corriente':        'P2.1',
    'Pasivo No Corriente':     'P2.2',
    'Patrimonio':              'P3.0',
    'Ingresos Operacionales':  'P4.1',
    'Otros Ingresos':          'P4.2',
    'Costos de Ventas':        'P5.1',
    'Gastos Operacionales':    'P5.2',
    'Gastos No Operacionales': 'P5.3',
};

async function generarIdCuenta(categoria) {
    const prefijo = CATEGORIA_PREFIJOS[categoria];
    if (!prefijo) throw new Error(`Categoria no reconocida: ${categoria}`);

    // Escapa los puntos para la regex: P1\.1
    const prefijoRegex = prefijo.replace(/\./g, '\\.');
    const cuentas = await CuentaMia.find({
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

    getCuentasMias: async (req, res) => {
        try {
            const cuentas = await CuentaMia.find({}).sort({ idCuenta: 1 });
            if (!cuentas || cuentas.length === 0) {
                return res.status(404).send({ message: 'No hay cuentas personales para mostrar' });
            }

            const cuentasIds = cuentas.map(c => c._id);
            const saldosPorCuenta = await MovimientoMio.aggregate([
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
            return res.status(500).send({ message: 'Error al obtener cuentas personales', error: err.message || err });
        }
    },

    createCuentaMia: async (req, res) => {
        try {
            const { nombre, descripcion, categoria, liquidez } = req.body;

            if (!nombre || !nombre.trim()) {
                return res.status(400).send({ message: 'El nombre de la cuenta es obligatorio' });
            }
            if (!categoria || !CATEGORIA_PREFIJOS[categoria]) {
                return res.status(400).send({ message: 'Categoria no valida' });
            }

            const idCuenta = await generarIdCuenta(categoria);

            const cuenta = new CuentaMia({
                idCuenta,
                nombre:      nombre.trim(),
                descripcion: descripcion ? descripcion.trim() : '',
                categoria,
                liquidez: liquidez === true
            });

            const cuentaStored = await cuenta.save();
            const cuentaConSaldo = cuentaStored.toObject();
            cuentaConSaldo.saldo = 0;
            return res.status(200).send({ cuenta: cuentaConSaldo });
        } catch (err) {
            return res.status(500).send({ message: 'Error al crear la cuenta personal', error: err.message || err });
        }
    },

    updateCuentaMia: async (req, res) => {
        try {
            const { id } = req.params;
            const { nombre, descripcion, categoria, liquidez } = req.body || {};

            const cuenta = await CuentaMia.findById(id);
            if (!cuenta) {
                return res.status(404).send({ message: 'Cuenta no encontrada' });
            }

            const updateData = {
                nombre: nombre ? String(nombre).trim() : cuenta.nombre,
                descripcion: descripcion ? String(descripcion).trim() : '',
                liquidez: liquidez === true
            };

            const categoriaLimpia = categoria ? String(categoria).trim() : cuenta.categoria;
            if (!CATEGORIA_PREFIJOS[categoriaLimpia]) {
                return res.status(400).send({ message: 'Categoria no valida' });
            }

            updateData.categoria = categoriaLimpia;

            if (categoriaLimpia !== cuenta.categoria) {
                updateData.idCuenta = await generarIdCuenta(categoriaLimpia);
            }

            const cuentaUpdated = await CuentaMia.findOneAndUpdate(
                { _id: id },
                { $set: updateData },
                { returnDocument: 'after' }
            );

            if (!cuentaUpdated) {
                return res.status(404).send({ message: 'Cuenta no encontrada' });
            }

            const saldoResult = await MovimientoMio.aggregate([
                { $match: { cuentaId: cuentaUpdated._id } },
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

            const cuentaObj = cuentaUpdated.toObject();
            cuentaObj.saldo = Number(saldoResult?.[0]?.saldo || 0);

            return res.status(200).send({ cuenta: cuentaObj });
        } catch (err) {
            return res.status(500).send({ message: 'Error al actualizar la cuenta', error: err.message || err });
        }
    },

    deleteCuentaMia: async (req, res) => {
        try {
            const { id } = req.params;
            const { confirmacion } = req.body || {};
            const cuenta = await CuentaMia.findById(id);
            if (!cuenta) {
                return res.status(404).send({ message: 'Cuenta no encontrada' });
            }

            const confirmacionEsperada = `ELIMINAR ${cuenta.idCuenta}`;
            if (confirmacion !== confirmacionEsperada) {
                return res.status(400).send({
                    message: `Confirmacion invalida. Debes escribir exactamente: ${confirmacionEsperada}`
                });
            }

            await CuentaMia.findByIdAndDelete(id);
            return res.status(200).send({ message: 'Cuenta eliminada correctamente' });
        } catch (err) {
            return res.status(500).send({ message: 'Error al eliminar la cuenta', error: err.message || err });
        }
    }

};

module.exports = controller;
