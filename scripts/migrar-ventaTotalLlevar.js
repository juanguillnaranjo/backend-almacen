'use strict';

/**
 * Script de migración: asigna ventaTotalLlevar = 0 a todos los cierres
 * Orange que no tengan ese campo (registros creados antes de agregarlo al schema).
 *
 * Uso:
 *   node backend/scripts/migrar-ventaTotalLlevar.js
 */

const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/almacen';

async function main() {
    await mongoose.connect(MONGO_URI);
    console.log('Conectado a MongoDB:', MONGO_URI);

    const resultado = await mongoose.connection.collection('cierresorange').updateMany(
        { ventaTotalLlevar: { $exists: false } },
        { $set: { ventaTotalLlevar: 0 } }
    );

    console.log(`Registros actualizados: ${resultado.modifiedCount}`);
    console.log(`Registros que ya tenían el campo: ${resultado.matchedCount - resultado.modifiedCount}`);
    await mongoose.disconnect();
    console.log('Listo.');
}

main().catch(err => {
    console.error('Error en migración:', err);
    process.exit(1);
});
