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
var routesCuentasOrange = require('./routes/routes-cuentasOrange.js');
var routesMovimientosOrange = require('./routes/routes-movimientosOrange.js');
var routesCierresOrange = require('./routes/routes-cierresOrange.js');
var routesDeudasOrange = require('./routes/routes-deudasOrange.js');
var routesGastosOrange = require('./routes/routes-gastosOrange.js');
var routesRetirosOrange = require('./routes/routes-retirosOrange.js');
var routesInventarioOrange = require('./routes/routes-inventarioOrange.js');
var routesPosOrange = require('./routes/routes-posOrange.js');
var routesMovimientosMios = require('./routes/routes-movimientosMios.js');
var routesDeudasMias = require('./routes/routes-deudasMias.js');
var routesCobrarMias = require('./routes/routes-cobrarMias.js');
var routesCobrarAlmacen = require('./routes/routes-cobrarAlmacen.js');
var routesIngresosMios = require('./routes/routes-ingresosMios.js');
var routesGastosMios = require('./routes/routes-gastosMios.js');
var routesGastosFamiliares = require('./routes/routes-gastosFamiliares.js');
var routesDeudasFamiliares = require('./routes/routes-deudasFamiliares.js');
var routesDashboardPersonal = require('./routes/routes-dashboardPersonal.js');
var routesDashboardOrange = require('./routes/routes-dashboardOrange.js');
var routesInsumos = require('./routes/routes-insumos.js');
var routesVentas = require('./routes/routes-ventas.js');
var mdAuth = require('./middlewares/authenticated');
var mdRoles = require('./middlewares/authenticated');

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
/* ── Protección por rol (después de ensureAuth) ───────────────────────────── */
// Rutas del panel Orange: admin, orange y orange_pos
app.use('/api', (req, res, next) => {
    if (/^\/orange(\/|$)/.test(req.path)) {
        return mdRoles.requireRoles(['admin', 'orange', 'orange_pos'])(req, res, next);
    }
    next();
});

// Rutas del panel Personal: solo admin
app.use('/api', (req, res, next) => {
    if (/^\/personal(\/|$)/.test(req.path)) {
        return mdRoles.requireRoles(['admin'])(req, res, next);
    }
    next();
});

// Rutas del panel Almacén (todo lo demás, excepto auth): solo admin y almacen
app.use('/api', (req, res, next) => {
    const path = req.path;
    if (
        path.startsWith('/auth') ||
        path.startsWith('/orange') ||
        path.startsWith('/personal')
    ) {
        return next();
    }
    return mdRoles.requireRoles(['admin', 'almacen'])(req, res, next);
});

app.use('/api', routesCuentas);
app.use('/api', routesMovimientos);
app.use('/api', routesCierresDiarios);
app.use('/api', routesDeudas);
app.use('/api', routesProcesoSurtido);
app.use('/api', routesCuentasMias);
app.use('/api', routesCuentasOrange);
app.use('/api', routesMovimientosOrange);
app.use('/api', routesCierresOrange);
app.use('/api', routesDeudasOrange);
app.use('/api', routesGastosOrange);
app.use('/api', routesRetirosOrange);
app.use('/api', routesInventarioOrange);
app.use('/api', routesPosOrange);
app.use('/api', routesMovimientosMios);
app.use('/api', routesDeudasMias);
app.use('/api', routesCobrarMias);
app.use('/api', routesCobrarAlmacen);
app.use('/api', routesIngresosMios);
app.use('/api', routesGastosMios);
app.use('/api', routesGastosFamiliares);
app.use('/api', routesDeudasFamiliares);
app.use('/api', routesDashboardPersonal);
app.use('/api', routesDashboardOrange);
app.use('/api', routesInsumos);
app.use('/api', routesVentas);


//exportar modulo
module.exports = app;

