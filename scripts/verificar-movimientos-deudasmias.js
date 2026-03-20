require('dotenv').config();
const mongoose = require('mongoose');
const DeudaMia = require('../modules/module-deudasMias');
const MovimientoMio = require('../modules/module-movimientoMios');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  console.log('[INICIO] Auditoria de movimientos de Deudas Mias');

  const conteoMovimientos = await MovimientoMio.aggregate([
    { $match: { origenModelo: 'deudasmias' } },
    { $group: { _id: '$_idOrigen', total: { $sum: 1 } } }
  ]);

  const mapaMovimientos = new Map(
    conteoMovimientos.map((item) => [String(item._id), Number(item.total || 0)])
  );

  const proveedores = await DeudaMia.find({});
  let totalFacturas = 0;
  let facturasConFaltantes = 0;

  for (const proveedor of proveedores) {
    for (const factura of (proveedor.facturas || [])) {
      totalFacturas += 1;
      const abonos = Array.isArray(factura.abonos) ? factura.abonos : [];
      const esperados = 2 + (abonos.length * 2);
      const reales = mapaMovimientos.get(String(factura._id)) || 0;

      if (reales !== esperados) {
        facturasConFaltantes += 1;
        console.log('---');
        console.log('Proveedor:', proveedor.nombreProveedor);
        console.log('Factura:', factura.numeroFactura);
        console.log('FacturaId:', String(factura._id));
        console.log('Esperados:', esperados, 'Reales:', reales, 'Diferencia:', (esperados - reales));
        console.log('DebeId:', String(factura.cuentaDebeId || ''));
        console.log('HaberId:', String(factura.cuentaHaberId || ''));
      }
    }
  }

  console.log('=============================');
  console.log('Total facturas revisadas:', totalFacturas);
  console.log('Facturas con diferencia:', facturasConFaltantes);
  console.log('Movimientos origen deudasmias:', conteoMovimientos.reduce((acc, x) => acc + Number(x.total || 0), 0));

  await mongoose.connection.close();
}

main().catch(async (err) => {
  console.error(err);
  try { await mongoose.connection.close(); } catch (_) {}
  process.exit(1);
});
