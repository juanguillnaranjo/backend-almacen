'use strict'

var express = require('express');
var cors = require('cors');

var app = express();

// cargar archivos de rutas
var routesAuth = require('./routes/routes-auth.js');
var routesIntegrations = require('./routes/routes-integrations.js');
var routesCuentas = require('./routes/routes-cuentas');
var routesMovimientos = require('./routes/routes-movimientos.js');
var routesCierresDiarios = require('./routes/routes-cierresDiarios.js');
var routesDeudas = require('./routes/routes-deudas.js');
var routesProcesoSurtido = require('./routes/routes-procesoSurtido.js');
var routesCuentasMias = require('./routes/routes-cuentasMias.js');
var routesMovimientosMios = require('./routes/routes-movimientosMios.js');
var routesDeudasMias = require('./routes/routes-deudasMias.js');
var routesCobrarMias = require('./routes/routes-cobrarMias.js');
var routesCobrarAlmacen = require('./routes/routes-cobrarAlmacen.js');
var routesIngresosMios = require('./routes/routes-ingresosMios.js');
var routesGastosMios = require('./routes/routes-gastosMios.js');
var routesDashboardPersonal = require('./routes/routes-dashboardPersonal.js');
var mdAuth = require('./middlewares/authenticated');

//moddlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

//cors
app.use(cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'x-api-key']
}));

//rutas
app.use('/api', routesAuth);
app.use('/api', routesIntegrations);
app.use('/api', mdAuth.ensureAuth);
app.use('/api', routesCuentas);
app.use('/api', routesMovimientos);
app.use('/api', routesCierresDiarios);
app.use('/api', routesDeudas);
app.use('/api', routesProcesoSurtido);
app.use('/api', routesCuentasMias);
app.use('/api', routesMovimientosMios);
app.use('/api', routesDeudasMias);
app.use('/api', routesCobrarMias);
app.use('/api', routesCobrarAlmacen);
app.use('/api', routesIngresosMios);
app.use('/api', routesGastosMios);
app.use('/api', routesDashboardPersonal);


//exportar modulo
module.exports = app;

