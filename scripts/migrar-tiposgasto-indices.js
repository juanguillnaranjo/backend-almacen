'use strict';

const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DB_URI || 'mongodb://localhost:27017/almacen';

mongoose.connect(uri).then(async () => {
	const col = mongoose.connection.collection('tiposgastosorange');

	// 1. Eliminar documentos legacy que no tienen el campo 'clase' (esquema viejo)
	const legacyResult = await col.deleteMany({ clase: { $exists: false } });
	console.log('Docs legacy eliminados:', legacyResult.deletedCount);

	// 2. Eliminar el indice unico viejo sobre 'nombre' solo
	try {
		await col.dropIndex('nombre_1');
		console.log('Indice nombre_1 eliminado correctamente');
	} catch (e) {
		console.log('nombre_1 no existia o ya fue eliminado:', e.message);
	}

	// 3. Mostrar indices restantes
	const indexes = await col.indexes();
	console.log('Indices restantes:', indexes.map(i => i.name).join(', '));

	const count = await col.countDocuments();
	console.log('Docs restantes:', count);

	mongoose.disconnect();
	console.log('Migracion completada.');
}).catch(e => {
	console.error('Error de conexion:', e.message);
	process.exit(1);
});
