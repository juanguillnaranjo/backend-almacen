'use strict'

require('dotenv').config();

var mongoose = require('mongoose');
var app = require('./app');
var port = Number(process.env.PORT || 3700);
var mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/CuentasAlmacen';
var mongoRetryMs = Number(process.env.MONGO_RETRY_MS || 10000);

mongoose.Promise = global.Promise;

app.listen(port, () => {
    console.log(`Servidor corriendo en puerto ${port}`);
});

function connectMongoWithRetry() {
    mongoose.connect(mongoUri)
        .then(() => {
            console.log('Conexión a MongoDB exitosa');
        })
        .catch(err => {
            console.error('Error al conectar a MongoDB:', err?.message || err);
            console.log(`Reintentando conexión en ${mongoRetryMs / 1000} segundos...`);
            setTimeout(connectMongoWithRetry, mongoRetryMs);
        });
}

connectMongoWithRetry();

