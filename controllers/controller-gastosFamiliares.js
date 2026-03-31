const GastoFamiliar = require('../modules/module-gastosFamiliares');
const TipoGastoFamiliar = require('../modules/module-tiposGastosFamiliares');
const MovimientoOrange = require('../modules/module-movimientosOrange');
const CuentaOrange = require('../modules/module-cuentasOrange');

const ORIGEN_MODELO_GASTOS_FAMILIARES = 'gastosfamiliares';
const MEDIOS_PAGO_VALIDOS = ['efectivo', 'banco'];
const CUENTA_DEBE_FIJA = { idCuenta: 'O3.0.002', nombre: 'GASTOS FAMILIARES (HOGAR)' };
const CUENTA_HABER_EFECTIVO = { idCuenta: 'O1.1.003', nombre: 'RETIRO EFECTIVO' };
const CUENTA_HABER_BANCO = { idCuenta: 'O1.1.002', nombre: 'CUENTA BANCARIA ORANGE' };

function normalizarTipoGasto(valor) {
  return String(valor || '').trim().toLowerCase();
}

function normalizarTexto(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
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

function normalizarMedioPago(valor) {
  const raw = String(valor || '').trim().toLowerCase();
  if (raw === 'cuenta bancaria' || raw === 'bancaria') return 'banco';
  return raw;
}

async function resolverCuentaHaberPorMedioPago(medioPago) {
  const objetivo = medioPago === 'banco' ? CUENTA_HABER_BANCO : CUENTA_HABER_EFECTIVO;
  const idCuentaObjetivo = normalizarTexto(objetivo.idCuenta);
  const nombreObjetivo = normalizarTexto(objetivo.nombre);

  const cuenta = await CuentaOrange.findOne({ idCuenta: objetivo.idCuenta });
  if (!cuenta) {
    return {
      ok: false,
      mensaje: medioPago === 'banco'
        ? 'No existe la cuenta O1.1.002 CUENTA BANCARIA ORANGE.'
        : 'No existe la cuenta O1.1.003 RETIRO EFECTIVO.'
    };
  }

  const idCuenta = normalizarTexto(cuenta?.idCuenta || '');
  const nombre = normalizarTexto(cuenta?.nombre || '');
  if (idCuenta !== idCuentaObjetivo || nombre !== nombreObjetivo) {
    return {
      ok: false,
      mensaje: `La cuenta configurada para ${medioPago} no coincide con ${objetivo.idCuenta} ${objetivo.nombre}`
    };
  }

  return { ok: true, cuenta };
}

async function resolverCuentaDebeFija() {
  const idCuentaObjetivo = normalizarTexto(CUENTA_DEBE_FIJA.idCuenta);
  const nombreObjetivo = normalizarTexto(CUENTA_DEBE_FIJA.nombre);

  const cuenta = await CuentaOrange.findOne({ idCuenta: CUENTA_DEBE_FIJA.idCuenta });
  if (!cuenta) {
    return { ok: false, mensaje: 'No existe la cuenta O3.0.002 GASTOS FAMILIARES (HOGAR).' };
  }

  const idCuenta = normalizarTexto(cuenta?.idCuenta || '');
  const nombre = normalizarTexto(cuenta?.nombre || '');
  if (idCuenta !== idCuentaObjetivo || nombre !== nombreObjetivo) {
    return {
      ok: false,
      mensaje: 'La cuenta Debe configurada no coincide con O3.0.002 GASTOS FAMILIARES (HOGAR).'
    };
  }

  return { ok: true, cuentaDebe: cuenta };
}

function construirDescripcionGasto(gasto) {
  return `Gasto familiar ${gasto.tipoGasto} - ${gasto.descripcion}`;
}

async function sincronizarMovimientosGasto(gasto) {
  try {
    await MovimientoOrange.deleteMany({
      origenModelo: ORIGEN_MODELO_GASTOS_FAMILIARES,
      _idOrigen: gasto._id
    });

    const monto = Number(gasto.monto || 0);
    if (!(monto > 0)) return 0;

    const descripcion = construirDescripcionGasto(gasto);

    await MovimientoOrange.insertMany([
      {
        cuentaId: gasto.cuentaDebeId,
        origenModelo: ORIGEN_MODELO_GASTOS_FAMILIARES,
        _idOrigen: gasto._id,
        debe: monto,
        haber: 0,
        descripcion,
        fecha: gasto.fecha
      },
      {
        cuentaId: gasto.cuentaHaberId,
        origenModelo: ORIGEN_MODELO_GASTOS_FAMILIARES,
        _idOrigen: gasto._id,
        debe: 0,
        haber: monto,
        descripcion,
        fecha: gasto.fecha
      }
    ]);

    return 2;
  } catch (error) {
    console.log('Error sincronizando movimientos de gasto familiar:', error);
    return 0;
  }
}

class GastosFamiliaresController {
  constructor() {}

  async getTiposGastoFamiliares(req, res) {
    try {
      const tipos = await TipoGastoFamiliar.find().sort({ nombre: 1 });
      return res.status(200).json({ tipos });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ mensaje: 'Error al obtener tipos de gasto familiares', error });
    }
  }

  async createTipoGastoFamiliar(req, res) {
    try {
      const nombre = normalizarTipoGasto(req.body?.nombre);
      if (!nombre) {
        return res.status(400).json({ mensaje: 'El nombre del tipo de gasto es obligatorio' });
      }

      const existente = await TipoGastoFamiliar.findOne({ nombre });
      if (existente) {
        return res.status(409).json({ mensaje: 'El tipo de gasto ya existe' });
      }

      const tipo = await TipoGastoFamiliar.create({ nombre });
      return res.status(201).json({ mensaje: 'Tipo de gasto familiar creado', tipo });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ mensaje: 'Error al crear tipo de gasto familiar', error });
    }
  }

  async updateTipoGastoFamiliar(req, res) {
    try {
      const { id } = req.params;
      const nombre = normalizarTipoGasto(req.body?.nombre);
      if (!nombre) {
        return res.status(400).json({ mensaje: 'El nombre del tipo de gasto es obligatorio' });
      }

      const tipoActual = await TipoGastoFamiliar.findById(id);
      if (!tipoActual) {
        return res.status(404).json({ mensaje: 'Tipo de gasto no encontrado' });
      }

      const nombreAnterior = normalizarTipoGasto(tipoActual.nombre);
      if (nombreAnterior === nombre) {
        return res.status(200).json({ mensaje: 'Tipo de gasto actualizado', tipo: tipoActual, gastosActualizados: 0 });
      }

      const duplicado = await TipoGastoFamiliar.findOne({
        nombre,
        _id: { $ne: id }
      });
      if (duplicado) {
        return res.status(409).json({ mensaje: 'El tipo de gasto ya existe' });
      }

      tipoActual.nombre = nombre;
      await tipoActual.save();

      const gastosActualizados = await GastoFamiliar.updateMany(
        { tipoGasto: nombreAnterior },
        {
          $set: {
            tipoGasto: nombre,
            categoriaGasto: nombre
          }
        }
      );

      return res.status(200).json({
        mensaje: 'Tipo de gasto familiar actualizado',
        tipo: tipoActual,
        gastosActualizados: Number(gastosActualizados?.modifiedCount || 0)
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ mensaje: 'Error al actualizar tipo de gasto familiar', error });
    }
  }

  async deleteTipoGastoFamiliar(req, res) {
    try {
      const { id } = req.params;
      const tipo = await TipoGastoFamiliar.findById(id);
      if (!tipo) {
        return res.status(404).json({ mensaje: 'Tipo de gasto no encontrado' });
      }

      const tipoNombre = normalizarTipoGasto(tipo.nombre);
      const enUso = await GastoFamiliar.exists({ tipoGasto: tipoNombre });
      if (enUso) {
        return res.status(409).json({ mensaje: 'No se puede eliminar un tipo que ya esta en uso' });
      }

      const totalTipos = await TipoGastoFamiliar.countDocuments();
      if (totalTipos <= 1) {
        return res.status(400).json({ mensaje: 'Debes mantener al menos un tipo de gasto' });
      }

      await TipoGastoFamiliar.findByIdAndDelete(id);
      return res.status(200).json({ mensaje: 'Tipo de gasto familiar eliminado' });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ mensaje: 'Error al eliminar tipo de gasto familiar', error });
    }
  }

  async getGastosFamiliares(req, res) {
    try {
      const gastos = await GastoFamiliar.find()
        .populate('cuentaDebeId', 'idCuenta nombre categoria')
        .populate('cuentaHaberId', 'idCuenta nombre categoria')
        .sort({ fecha: -1 });

      if (!gastos || gastos.length === 0) {
        return res.status(404).json({ mensaje: 'No hay gastos familiares para mostrar' });
      }

      return res.status(200).json({ gastos });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ mensaje: 'Error al obtener gastos familiares', error });
    }
  }

  async getGastoFamiliar(req, res) {
    try {
      const { id } = req.params;
      const gasto = await GastoFamiliar.findById(id)
        .populate('cuentaDebeId', 'idCuenta nombre categoria')
        .populate('cuentaHaberId', 'idCuenta nombre categoria');

      if (!gasto) {
        return res.status(404).json({ mensaje: 'Gasto familiar no encontrado' });
      }
      return res.status(200).json({ gasto });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ mensaje: 'Error al obtener gasto familiar', error });
    }
  }

  async getResumenGastosFamiliares(req, res) {
    try {
      const resumenGlobal = await GastoFamiliar.aggregate([
        {
          $group: {
            _id: null,
            totalGastos: { $sum: 1 },
            montoTotal: { $sum: '$monto' }
          }
        }
      ]);

      const porTipo = await GastoFamiliar.aggregate([
        {
          $group: {
            _id: '$tipoGasto',
            categoriaGasto: { $first: '$categoriaGasto' },
            cantidad: { $sum: 1 },
            total: { $sum: '$monto' }
          }
        },
        { $sort: { total: -1 } }
      ]);

      return res.status(200).json({
        resumen: resumenGlobal[0] || { totalGastos: 0, montoTotal: 0 },
        porTipo
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ mensaje: 'Error al obtener resumen de gastos familiares', error });
    }
  }

  async createGastoFamiliar(req, res) {
    try {
      const { fecha, monto, tipoGasto, categoriaGasto, descripcion, observaciones, medioPago } = req.body;
      const tipoNormalizado = normalizarTipoGasto(tipoGasto);
      const fechaNormalizada = fecha ? normalizarFecha(fecha) : new Date();
      const medioPagoNormalizado = normalizarMedioPago(medioPago);

      if (!monto || !tipoGasto || !descripcion || !medioPagoNormalizado) {
        return res.status(400).json({ mensaje: 'Campos requeridos incompletos' });
      }

      if (!MEDIOS_PAGO_VALIDOS.includes(medioPagoNormalizado)) {
        return res.status(400).json({ mensaje: 'Medio de pago invalido. Usa efectivo o banco' });
      }

      if (fecha && !fechaNormalizada) {
        return res.status(400).json({ mensaje: 'fecha invalida. Usa formato YYYY-MM-DD' });
      }

      const tipoExiste = await TipoGastoFamiliar.exists({ nombre: tipoNormalizado });
      if (!tipoExiste) {
        return res.status(400).json({ mensaje: 'El tipo de gasto no existe en el catalogo' });
      }

      const cuentaDebeResult = await resolverCuentaDebeFija();
      if (!cuentaDebeResult.ok) {
        return res.status(400).json({ mensaje: cuentaDebeResult.mensaje });
      }
      const cuentaDebeId = String(cuentaDebeResult.cuentaDebe._id);

      const cuentaHaberResult = await resolverCuentaHaberPorMedioPago(medioPagoNormalizado);
      if (!cuentaHaberResult.ok) {
        return res.status(400).json({ mensaje: cuentaHaberResult.mensaje });
      }

      const cuentaHaberId = String(cuentaHaberResult.cuenta._id);

      if (String(cuentaDebeId) === String(cuentaHaberId)) {
        return res.status(400).json({ mensaje: 'Las cuentas deben ser diferentes' });
      }

      const nuevoGasto = new GastoFamiliar({
        fecha: fechaNormalizada,
        monto,
        tipoGasto: tipoNormalizado,
        categoriaGasto: categoriaGasto || tipoNormalizado,
        descripcion,
        observaciones,
        medioPago: medioPagoNormalizado,
        cuentaDebeId,
        cuentaHaberId
      });

      const gastoGuardado = await nuevoGasto.save();

      await sincronizarMovimientosGasto(gastoGuardado);

      const gastoPopulado = await GastoFamiliar.findById(gastoGuardado._id)
        .populate('cuentaDebeId', 'idCuenta nombre categoria')
        .populate('cuentaHaberId', 'idCuenta nombre categoria');

      return res.status(201).json({ mensaje: 'Gasto familiar creado exitosamente', gasto: gastoPopulado });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ mensaje: 'Error al crear gasto familiar', error });
    }
  }

  async updateGastoFamiliar(req, res) {
    try {
      const { id } = req.params;
      const { fecha, monto, tipoGasto, categoriaGasto, descripcion, observaciones, medioPago } = req.body;
      const tipoNormalizado = normalizarTipoGasto(tipoGasto);
      const fechaNormalizada = fecha ? normalizarFecha(fecha) : new Date();
      const medioPagoNormalizado = normalizarMedioPago(medioPago);

      if (!MEDIOS_PAGO_VALIDOS.includes(medioPagoNormalizado)) {
        return res.status(400).json({ mensaje: 'Medio de pago invalido. Usa efectivo o banco' });
      }

      const tipoExiste = await TipoGastoFamiliar.exists({ nombre: tipoNormalizado });
      if (!tipoExiste) {
        return res.status(400).json({ mensaje: 'El tipo de gasto no existe en el catalogo' });
      }

      if (fecha && !fechaNormalizada) {
        return res.status(400).json({ mensaje: 'fecha invalida. Usa formato YYYY-MM-DD' });
      }

      const cuentaDebeResult = await resolverCuentaDebeFija();
      if (!cuentaDebeResult.ok) {
        return res.status(400).json({ mensaje: cuentaDebeResult.mensaje });
      }
      const cuentaDebeId = String(cuentaDebeResult.cuentaDebe._id);

      const cuentaHaberResult = await resolverCuentaHaberPorMedioPago(medioPagoNormalizado);
      if (!cuentaHaberResult.ok) {
        return res.status(400).json({ mensaje: cuentaHaberResult.mensaje });
      }

      const cuentaHaberId = String(cuentaHaberResult.cuenta._id);

      if (String(cuentaDebeId) === String(cuentaHaberId)) {
        return res.status(400).json({ mensaje: 'Las cuentas deben ser diferentes' });
      }

      const gastoActualizado = await GastoFamiliar.findByIdAndUpdate(
        id,
        {
          fecha: fechaNormalizada,
          monto,
          tipoGasto: tipoNormalizado,
          categoriaGasto: categoriaGasto || tipoNormalizado,
          descripcion,
          observaciones,
          medioPago: medioPagoNormalizado,
          cuentaDebeId,
          cuentaHaberId
        },
        { returnDocument: 'after' }
      )
        .populate('cuentaDebeId', 'idCuenta nombre categoria')
        .populate('cuentaHaberId', 'idCuenta nombre categoria');

      if (!gastoActualizado) {
        return res.status(404).json({ mensaje: 'Gasto familiar no encontrado' });
      }

      await sincronizarMovimientosGasto(gastoActualizado);

      return res.status(200).json({ mensaje: 'Gasto familiar actualizado exitosamente', gasto: gastoActualizado });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ mensaje: 'Error al actualizar gasto familiar', error });
    }
  }

  async deleteGastoFamiliar(req, res) {
    try {
      const { id } = req.params;

      await MovimientoOrange.deleteMany({
        origenModelo: ORIGEN_MODELO_GASTOS_FAMILIARES,
        _idOrigen: id
      });

      const gastoEliminado = await GastoFamiliar.findByIdAndDelete(id);
      if (!gastoEliminado) {
        return res.status(404).json({ mensaje: 'Gasto familiar no encontrado' });
      }

      return res.status(200).json({ mensaje: 'Gasto familiar eliminado exitosamente' });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ mensaje: 'Error al eliminar gasto familiar', error });
    }
  }
}

module.exports = GastosFamiliaresController;
