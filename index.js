'use strict'

require('dotenv').config();

var mongoose = require('mongoose');
var app = require('./app');
var defaultCuentasService = require('./controllers/services/default-cuentas.service');
var defaultCuentasMiasService = require('./controllers/services/default-cuentas-mias.service');
var defaultCuentasOrangeService = require('./controllers/services/default-cuentas-orange.service');
var defaultTiposGastosMiosService = require('./controllers/services/default-tipos-gastos-mios.service');
var defaultTiposGastosOrangeService = require('./controllers/services/default-tipos-gastos-orange.service');
var defaultTiposGastosFamiliaresService = require('./controllers/services/default-tipos-gastos-familiares.service');
var defaultTiposDeudaMiosService = require('./controllers/services/default-tipos-deudas-mias.service');
var defaultTiposDeudaFamiliaresService = require('./controllers/services/default-tipos-deudas-familiares.service');
var defaultTiposCobrosMiosService = require('./controllers/services/default-tipos-cobros-mios.service');
var port = Number(process.env.PORT || 3700);
var mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/CuentasAlmacen';
var mongoRetryMs = Number(process.env.MONGO_RETRY_MS || 10000);
var datosDefaultInicializados = false;

mongoose.Promise = global.Promise;

app.listen(port, () => {
    console.log(`Servidor corriendo en puerto ${port}`);
});

function connectMongoWithRetry() {
    mongoose.connect(mongoUri)
        .then(async () => {
            console.log('Conexión a MongoDB exitosa');

            if (!datosDefaultInicializados) {
                try {
                    console.log('\n=== INICIALIZANDO DATOS POR DEFECTO ===\n');

                    // Cuentas - Almacén
                    const resultadoAlmacen = await defaultCuentasService.inicializarCuentasPorDefecto();
                    console.log(
                        `✓ Cuentas por defecto (almacen): creadas=${resultadoAlmacen.creadas}, actualizadas=${resultadoAlmacen.actualizadas}, sinCambios=${resultadoAlmacen.sinCambios}`
                    );

                    // Cuentas - Personal
                    const resultadoPersonal = await defaultCuentasMiasService.inicializarCuentasMiasPorDefecto();
                    console.log(
                        `✓ Cuentas por defecto (personal): creadas=${resultadoPersonal.creadas}, actualizadas=${resultadoPersonal.actualizadas}, sinCambios=${resultadoPersonal.sinCambios}`
                    );

                    // Cuentas - Orange
                    const resultadoOrange = await defaultCuentasOrangeService.inicializarCuentasOrangePorDefecto();
                    console.log(
                        `✓ Cuentas por defecto (orange): creadas=${resultadoOrange.creadas}, actualizadas=${resultadoOrange.actualizadas}, sinCambios=${resultadoOrange.sinCambios}`
                    );

                    // Tipos Gastos - Panel Personal
                    const resultadoTiposGastos = await defaultTiposGastosMiosService.inicializarTiposGastosMiosPorDefecto();
                    console.log(
                        `✓ Tipos de gasto (personal): creadas=${resultadoTiposGastos.creadas}, sinCambios=${resultadoTiposGastos.sinCambios}`
                    );

                    // Tipos Gastos - Panel Orange
                    const resultadoTiposGastosOrange = await defaultTiposGastosOrangeService.inicializarTiposGastosOrangePorDefecto();
                    console.log(
                        `✓ Tipos de gasto (orange): creadas=${resultadoTiposGastosOrange.creadas}, sinCambios=${resultadoTiposGastosOrange.sinCambios}`
                    );

                    // Tipos Deudas - Panel Personal
                    const resultadoTiposDeudas = await defaultTiposDeudaMiosService.inicializarTiposDeudaMiosPorDefecto();
                    console.log(
                        `✓ Tipos de deuda (personal): creadas=${resultadoTiposDeudas.creadas}, sinCambios=${resultadoTiposDeudas.sinCambios}`
                    );

                    // Tipos Cobros - Panel Personal
                    const resultadoTiposCobros = await defaultTiposCobrosMiosService.inicializarTiposCobrosMiosPorDefecto();
                    console.log(
                        `✓ Tipos de cobro (personal): creadas=${resultadoTiposCobros.creadas}, sinCambios=${resultadoTiposCobros.sinCambios}`
                    );

                    // Tipos Gastos - Panel Familiar
                    const resultadoTiposGastosFamiliares = await defaultTiposGastosFamiliaresService.inicializarTiposGastosFamiliaresPorDefecto();
                    console.log(
                        `✓ Tipos de gasto (familiar): creadas=${resultadoTiposGastosFamiliares.creadas}, sinCambios=${resultadoTiposGastosFamiliares.sinCambios}`
                    );

                    // Tipos Deudas - Panel Familiar
                    const resultadoTiposDeudaFamiliares = await defaultTiposDeudaFamiliaresService.inicializarTiposDeudaFamiliaresPorDefecto();
                    console.log(
                        `✓ Tipos de deuda (familiar): creadas=${resultadoTiposDeudaFamiliares.creadas}, sinCambios=${resultadoTiposDeudaFamiliares.sinCambios}`
                    );

                    console.log('\n=== INICIALIZACION COMPLETADA ===\n');

                    datosDefaultInicializados = true;
                } catch (seedErr) {
                    console.error('✗ Error al inicializar datos por defecto:', seedErr?.message || seedErr);
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

