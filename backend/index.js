'use strict'

var mongoose = require('mongoose');
var app = require('./app');
var port = 3700;

mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost:27017/CuentasAlmacen')
    .then(() =>{ 
        console.log('Conexión a MongoDB exitosa');

        // Iniciar el servidor después de la conexión a la base de datos
        app.listen(port, () => {
            console.log(`Servidor corriendo en http://localhost:${port}`);
        });
    })
    .catch(err => console.error('Error al conectar a MongoDB:', err));

