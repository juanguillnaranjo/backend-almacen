'use strict'

require('dotenv').config();

var mongoose = require('mongoose');
var app = require('./app');
var port = Number(process.env.PORT || 3700);
var mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/CuentasAlmacen';

mongoose.Promise = global.Promise;
mongoose.connect(mongoUri)
    .then(() =>{ 
        console.log('Conexión a MongoDB exitosa');

        // Iniciar el servidor después de la conexión a la base de datos
        app.listen(port, () => {
            console.log(`Servidor corriendo en http://localhost:${port}`);
        });
    })
    .catch(err => console.error('Error al conectar a MongoDB:', err));

