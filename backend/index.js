'use strict'

require('dotenv').config();

var mongoose = require('mongoose');
var app = require('./app');
var defaultCuentasService = require('./controllers/services/default-cuentas.service');
var port = Number(process.env.PORT || 3700);
var mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/CuentasAlmacen';
var mongoRetryMs = Number(process.env.MONGO_RETRY_MS || 10000);
var cuentasDefaultInicializadas = false;

mongoose.Promise = global.Promise;

app.listen(port, () => {
    console.log(`Servidor corriendo en puerto ${port}`);
});

function connectMongoWithRetry() {
    mongoose.connect(mongoUri)
        .then(async () => {
            console.log('Conexión a MongoDB exitosa');

            if (!cuentasDefaultInicializadas) {
                try {
                    const resultado = await defaultCuentasService.crearCuentasPorDefectoSiVacia();
                    if (resultado.inicializada) {
                        console.log(`Cuentas por defecto creadas automaticamente: ${resultado.totalCreadas}`);
                    } else {
                        console.log(`Inicialización de cuentas omitida: ${resultado.motivo}`);
                    }
                    cuentasDefaultInicializadas = true;
                } catch (seedErr) {
                    console.error('Error al inicializar cuentas por defecto:', seedErr?.message || seedErr);
                }
            }
        })
        .catch(err => {
            console.error('Error al conectar a MongoDB:', err?.message || err);
            console.log(`Reintentando conexión en ${mongoRetryMs / 1000} segundos...`);
            setTimeout(connectMongoWithRetry, mongoRetryMs);
        });
}

connectMongoWithRetry();

