const GastoMio = require('../modules/module-gastosmios');
const TipoGastoMio = require('../modules/module-tiposGastosMios');
const MovimientoMio = require('../modules/module-movimientoMios');
const CuentaMia = require('../modules/module-cuentasMias');

const ORIGEN_MODELO_GASTOS_MIOS = 'gastosmios';
const TIPOS_GASTO_BASE = ['vivienda', 'alimentacion', 'transporte', 'salud', 'educacion', 'entretenimiento', 'utilidades', 'otros'];

function normalizarTipoGasto(valor) {
  return String(valor || '').trim().toLowerCase();
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

async function asegurarTiposBase() {
  for (const nombre of TIPOS_GASTO_BASE) {
    await TipoGastoMio.updateOne(
      { nombre },
      { $setOnInsert: { nombre } },
      { upsert: true }
    );
  }
}

function construirDescripcionGasto(gasto) {
  return `Gasto ${gasto.tipoGasto} - ${gasto.descripcion}`;
}

async function sincronizarMovimientosGasto(gasto) {
  try {
    // Eliminar movimientos previos si existen
    await MovimientoMio.deleteMany({
      origenModelo: ORIGEN_MODELO_GASTOS_MIOS,
      _idOrigen: gasto._id
    });

    const monto = Number(gasto.monto || 0);
    if (!(monto > 0)) return 0;

    const descripcion = construirDescripcionGasto(gasto);

    await MovimientoMio.insertMany([
      {
        cuentaId: gasto.cuentaDebeId,
        origenModelo: ORIGEN_MODELO_GASTOS_MIOS,
        _idOrigen: gasto._id,
        debe: monto,
        haber: 0,
        descripcion,
        fecha: gasto.fecha
      },
      {
        cuentaId: gasto.cuentaHaberId,
        origenModelo: ORIGEN_MODELO_GASTOS_MIOS,
        _idOrigen: gasto._id,
        debe: 0,
        haber: monto,
        descripcion,
        fecha: gasto.fecha
      }
    ]);

    return 2;
  } catch (error) {
    console.log('Error sincronizando movimientos:', error);
    return 0;
  }
}

class GastosMiosController {
  constructor() {}

  // GET: Catalogo de tipos de gasto
  async getTiposGastoMios(req, res) {
    try {
      await asegurarTiposBase();
      const tipos = await TipoGastoMio.find().sort({ nombre: 1 });
      return res.status(200).json({ tipos });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ mensaje: 'Error al obtener tipos de gasto', error });
    }
  }

  // POST: Crear tipo de gasto en catalogo
  async createTipoGastoMio(req, res) {
    try {
      const nombre = normalizarTipoGasto(req.body?.nombre);
      if (!nombre) {
        return res.status(400).json({ mensaje: 'El nombre del tipo de gasto es obligatorio' });
      }

      const existente = await TipoGastoMio.findOne({ nombre });
      if (existente) {
        return res.status(409).json({ mensaje: 'El tipo de gasto ya existe' });
      }

      const tipo = await TipoGastoMio.create({ nombre });
      return res.status(201).json({ mensaje: 'Tipo de gasto creado', tipo });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ mensaje: 'Error al crear tipo de gasto', error });
    }
  }

  // DELETE: Eliminar tipo de gasto del catalogo
  async deleteTipoGastoMio(req, res) {
    try {
      await asegurarTiposBase();
      const { id } = req.params;
      const tipo = await TipoGastoMio.findById(id);
      if (!tipo) {
        return res.status(404).json({ mensaje: 'Tipo de gasto no encontrado' });
      }

      const tipoNombre = normalizarTipoGasto(tipo.nombre);
      const enUso = await GastoMio.exists({ tipoGasto: tipoNombre });
      if (enUso) {
        return res.status(409).json({ mensaje: 'No se puede eliminar un tipo que ya esta en uso' });
      }

      const totalTipos = await TipoGastoMio.countDocuments();
      if (totalTipos <= 1) {
        return res.status(400).json({ mensaje: 'Debes mantener al menos un tipo de gasto' });
      }

      await TipoGastoMio.findByIdAndDelete(id);
      return res.status(200).json({ mensaje: 'Tipo de gasto eliminado' });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ mensaje: 'Error al eliminar tipo de gasto', error });
    }
  }

  // GET: Obtener todos los gastos
  async getGastosMios(req, res) {
    try {
      const gastos = await GastoMio.find()
        .populate('cuentaDebeId', 'idCuenta nombre categoria')
        .populate('cuentaHaberId', 'idCuenta nombre categoria')
        .sort({ fecha: -1 });
      
      if (!gastos || gastos.length === 0) {
        return res.status(404).json({ mensaje: 'No hay gastos personales para mostrar' });
      }
      
      res.status(200).json({ gastos });
    } catch (error) {
      console.log(error);
      res.status(500).json({ mensaje: 'Error al obtener gastos', error });
    }
  }

  // GET: Obtener un gasto por ID
  async getGastoMio(req, res) {
    try {
      const { id } = req.params;
      const gasto = await GastoMio.findById(id)
        .populate('cuentaDebeId', 'idCuenta nombre categoria')
        .populate('cuentaHaberId', 'idCuenta nombre categoria');
      
      if (!gasto) return res.status(404).json({ mensaje: 'Gasto no encontrado' });
      res.status(200).json({ gasto });
    } catch (error) {
      console.log(error);
      res.status(500).json({ mensaje: 'Error al obtener gasto', error });
    }
  }

  // GET: Obtener resumen de gastos por tipo
  async getResumenGastosMios(req, res) {
    try {
      const resumenGlobal = await GastoMio.aggregate([
        {
          $group: {
            _id: null,
            totalGastos: { $sum: 1 },
            montoTotal: { $sum: '$monto' }
          }
        }
      ]);

      const porTipo = await GastoMio.aggregate([
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

      res.status(200).json({
        resumen: resumenGlobal[0] || { totalGastos: 0, montoTotal: 0 },
        porTipo
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ mensaje: 'Error al obtener resumen', error });
    }
  }

  // POST: Crear nuevo gasto con asiento doble automático
  async createGastoMio(req, res) {
    try {
      const { fecha, monto, tipoGasto, categoriaGasto, descripcion, observaciones, cuentaDebeId, cuentaHaberId } = req.body;
      const tipoNormalizado = normalizarTipoGasto(tipoGasto);
      const fechaNormalizada = fecha ? normalizarFecha(fecha) : new Date();
      
      if (!monto || !tipoGasto || !descripcion || !cuentaDebeId || !cuentaHaberId) {
        return res.status(400).json({ mensaje: 'Campos requeridos incompletos' });
      }

      if (fecha && !fechaNormalizada) {
        return res.status(400).json({ mensaje: 'fecha invalida. Usa formato YYYY-MM-DD' });
      }

      const tipoExiste = await TipoGastoMio.exists({ nombre: tipoNormalizado });
      if (!tipoExiste) {
        return res.status(400).json({ mensaje: 'El tipo de gasto no existe en el catalogo' });
      }

      const nuevoGasto = new GastoMio({
        fecha: fechaNormalizada,
        monto,
        tipoGasto: tipoNormalizado,
        categoriaGasto: categoriaGasto || tipoNormalizado,
        descripcion,
        observaciones,
        cuentaDebeId,
        cuentaHaberId
      });

      const gastoGuardado = await nuevoGasto.save();
      
      // Sincronizar movimientos automáticos
      await sincronizarMovimientosGasto(gastoGuardado);
      
      const gastoPopulado = await GastoMio.findById(gastoGuardado._id)
        .populate('cuentaDebeId', 'idCuenta nombre categoria')
        .populate('cuentaHaberId', 'idCuenta nombre categoria');
      
      res.status(201).json({ mensaje: 'Gasto creado exitosamente', gasto: gastoPopulado });
    } catch (error) {
      console.log(error);
      res.status(500).json({ mensaje: 'Error al crear gasto', error });
    }
  }

  // PUT: Actualizar gasto
  async updateGastoMio(req, res) {
    try {
      const { id } = req.params;
      const { fecha, monto, tipoGasto, categoriaGasto, descripcion, observaciones, cuentaDebeId, cuentaHaberId } = req.body;
      const tipoNormalizado = normalizarTipoGasto(tipoGasto);
      const fechaNormalizada = fecha ? normalizarFecha(fecha) : new Date();

      const tipoExiste = await TipoGastoMio.exists({ nombre: tipoNormalizado });
      if (!tipoExiste) {
        return res.status(400).json({ mensaje: 'El tipo de gasto no existe en el catalogo' });
      }

      if (fecha && !fechaNormalizada) {
        return res.status(400).json({ mensaje: 'fecha invalida. Usa formato YYYY-MM-DD' });
      }
      
      const gastoActualizado = await GastoMio.findByIdAndUpdate(
        id,
        {
          fecha: fechaNormalizada,
          monto,
          tipoGasto: tipoNormalizado,
          categoriaGasto: categoriaGasto || tipoNormalizado,
          descripcion,
          observaciones,
          cuentaDebeId,
          cuentaHaberId
        },
        { new: true }
      )
      .populate('cuentaDebeId', 'idCuenta nombre categoria')
      .populate('cuentaHaberId', 'idCuenta nombre categoria');
      
      if (!gastoActualizado) return res.status(404).json({ mensaje: 'Gasto no encontrado' });
      
      // Resincronizar movimientos con nuevos datos
      await sincronizarMovimientosGasto(gastoActualizado);
      
      res.status(200).json({ mensaje: 'Gasto actualizado exitosamente', gasto: gastoActualizado });
    } catch (error) {
      console.log(error);
      res.status(500).json({ mensaje: 'Error al actualizar gasto', error });
    }
  }

  // DELETE: Eliminar gasto y sus movimientos asociados
  async deleteGastoMio(req, res) {
    try {
      const { id } = req.params;
      
      // Eliminar movimientos asociados
      await MovimientoMio.deleteMany({
        origenModelo: ORIGEN_MODELO_GASTOS_MIOS,
        _idOrigen: id
      });
      
      // Eliminar gasto
      const gastoEliminado = await GastoMio.findByIdAndDelete(id);
      if (!gastoEliminado) return res.status(404).json({ mensaje: 'Gasto no encontrado' });
      
      res.status(200).json({ mensaje: 'Gasto eliminado exitosamente' });
    } catch (error) {
      console.log(error);
      res.status(500).json({ mensaje: 'Error al eliminar gasto', error });
    }
  }
}

module.exports = GastosMiosController;
