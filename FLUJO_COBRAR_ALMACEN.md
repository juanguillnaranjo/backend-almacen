# Flujo Completo: Cobrar Almacén

## 📋 Descripción General

**Módulo**: Gestión de ventas a crédito del almacén  
**Objetivo**: Registrar, controlar y hacer seguimiento a las ventas a crédito realizadas por el almacén, incluyendo pagos parciales (abonos) y generación automática de movimientos contables.

**Diferencia con CobroMías**:
- **CobroMías**: Deudas/cobros personales del usuario (cuentas personales)
- **CobraAlmacen**: Ventas de productos del almacén a clientes a crédito (cuentas del almacén)

---

## 📁 Estructura de Archivos

### Backend

```
backend/
├── modules/
│   └── module-cobrarAlmacen.js          # Modelo Mongoose
├── controllers/
│   ├── controller-cobrarAlmacen.js      # Controlador con métodos plantilla
│   └── services/
│       └── cobraalmacen.service.js      # Lógica de negocio
└── routes/
    └── routes-cobrarAlmacen.js          # Rutas REST API
```

### Frontend

```
frontend/src/app/
├── components/
│   └── cobrar-almacen/
│       ├── cobrar-almacen.ts            # Componente principal
│       ├── cobrar-almacen.html          # Template
│       └── cobrar-almacen.css           # Estilos
└── services/
    └── cobrar-almacen.service.ts        # Cliente HTTP
```

---

## 🏗️ Flujo de Datos

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Angular)                        │
│  CobraAlmacenComponent <--> CobraAlmacenService (HTTP)      │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP REST API
┌──────────────────────────▼──────────────────────────────────┐
│                    BACKEND (Express)                         │
│  routes-cobrarAlmacen.js                                     │
│         ↓                                                     │
│  controller-cobrarAlmacen.js (métodos vacíos)               │
│         ↓                                                     │
│  cobraalmacen.service.js (lógica de negocio)                │
│         ↓                                                     │
│  ┌────────────────────────────────────────────┐             │
│  │ module-cobrarAlmacen.js (Modelo Mongoose)  │             │
│  │ - CobroAlmacen (clientes)                  │             │
│  │   - VentaAlmacen (facturas/ventas)        │             │
│  │   - AbonoVentaAlmacen (pagos parciales)   │             │
│  └────────────────────────────────────────────┘             │
│         ↓                                                     │
│  MongoDB: colección 'cobraalmacen'                           │
│         ↓                                                     │
│  Si aplica: genera movimientos en module-movimientosMios.js │
│  (integración contable automática)                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔌 Integración Requerida

### 1. Registrar Rutas en app.js

En `backend/app.js`, agrega:

```javascript
const routesCobrarAlmacen = require('./routes/routes-cobrarAlmacen');
app.use('/api', routesCobrarAlmacen);
```

### 2. Importar Componente en app.routes.ts

En `frontend/src/app/app.routes.ts`, agrega la ruta:

```typescript
import { CobraAlmacenComponent } from './components/cobrar-almacen/cobrar-almacen';

export const routes: Routes = [
	// ... otras rutas
	{
		path: 'almacen/cobrar',
		component: CobraAlmacenComponent,
		canActivate: [AuthGuard]
	}
];
```

### 3. Contabilidad Automática

⚠️ **IMPORTANTE**: Cuando se implemente la lógica para crear ventas y abonos, debe integrarse con `module-movimientoMios.js`:

**Para agegar el origen en module-movimientoMios.js:**

```javascript
const ORIGENES_MODELO_VALIDOS = [
	// ... otros orígenes
	'cobraalmacen'  // ← Agregar esta línea
];
```

El origen debe usarse en controller-cobrarAlmacen.js:

```javascript
const ORIGEN_MODELO_COBRAR_ALMACEN = 'cobraalmacen';
// Cuando se crea una venta/abono, generar movimientos con ese origen
```

---

## 📊 Estructura de Datos (MongoDB)

### Documento Principal: CobroAlmacen

```json
{
	"_id": "ObjectId",
	"nombreCliente": "Tienda XYZ",          // ← Única
	"tipoVenta": "venta",                   // ← Categoría
	"nit": "123456",
	"telefono": "555-1234",
	"correo": "tienda@example.com",
	"direccion": "Calle 1 #123",
	"observaciones": "Cliente especial",

	"totalVentas": 5000,     // ← Suma de todos los montos de ventas
	"totalDeuda": 2000,      // ← Suma de saldos pendientes
	"totalAbonado": 3000,    // ← Suma de abonos registrados
	"totalPendiente": 2000,  // ← = totalDeuda

	"ventas": [
		{
			"numeroFactura": "FAL-001",
			"tipoVenta": "venta",
			"fechaVenta": "2026-03-19",
			"montoVenta": 2500,
			"montoAbonado": 1000,
			"saldoPendiente": 1500,
			"estado": "parcial",
			"cuentaDebeId": "ObjectId",      // Almacén
			"cuentaHaberId": "ObjectId",     // Cliente
			"abonos": [
				{
					"fecha": "2026-03-25",
					"monto": 500,
					"descripcion": "Primer abono",
					"cuentaDebeId": "ObjectId",
					"cuentaHaberId": "ObjectId"
				},
				{
					"fecha": "2026-04-01",
					"monto": 500,
					"descripcion": "Segundo abono",
					"cuentaDebeId": "ObjectId",
					"cuentaHaberId": "ObjectId"
				}
			]
		}
	],

	"createdAt": "2026-03-19T10:00:00Z",
	"updatedAt": "2026-04-01T15:30:00Z"
}
```

---

## 📝 Endpoints REST API

### Tipos de Venta

```
GET   /almacen/getTiposVentaAlmacen
POST  /almacen/createTipoVentaAlmacen
PUT   /almacen/updateTipoVentaAlmacen/:id
DELETE /almacen/deleteTipoVentaAlmacen/:id
```

### Clientes

```
GET    /almacen/getClientesCobroAlmacen
GET    /almacen/getResumenClientesCobroAlmacen    (consolidados)
GET    /almacen/getClienteCobroAlmacen/:id
POST   /almacen/createClienteCobroAlmacen
PUT    /almacen/updateClienteCobroAlmacen/:id
DELETE /almacen/deleteClienteCobroAlmacen/:id
```

### Ventas/Facturas

```
POST   /almacen/addVentaClienteAlmacen/:idCliente
DELETE /almacen/deleteVentaClienteAlmacen/:idCliente/:idVenta
```

### Abonos/Pagos

```
POST   /almacen/abonarVentaClienteAlmacen/:idCliente/:idVenta
DELETE /almacen/deleteAbonoVentaClienteAlmacen/:idCliente/:idVenta/:indexAbono
```

### Reportes

```
GET /almacen/getReporteVentasPendientesAlmacen
GET /almacen/getReporteVentasPorPeriodoAlmacen
GET /almacen/getEstadoCuentaClienteAlmacen/:idCliente
```

---

## 🛠️ Implementando Nuevos Procedimientos

El flujo está diseñado para ser fácil de extender. Pasos:

### 1. Agregar nueva operación en el **modelo** (module-cobrarAlmacen.js)
- Extender el subesquema `VentaAlmacenSchema` o crear uno nuevo si aplica

### 2. Agregar método en el **controller** (controller-cobrarAlmacen.js)
- Crear función `exports.nombreMetodo(req, res) { /* TODO */ }`

### 3. Crear **lógica** en el **servicio** (cobraalmacen.service.js)
- Implementar `async nombreMetodo(params) { /* lógica */ }`

### 4. Agregar **ruta** (routes-cobrarAlmacen.js)
- Conectar: `router.post('/almacen/ruta', controller.nombreMetodo)`

### 5. Agregar **método en servicio frontend** (cobrar-almacen.service.ts)
- HTTP request a la nueva ruta

### 6. Integrar en **componente** (cobrar-almacen.ts/html)
- UI + llamada al servicio

### 7. **Contabilidad** si aplica
- En el servicio backend, usar `MovimientoMio.insertMany()` con origen `'cobraalmacen'`

---

## ✅ Checklist de Implementación

- [ ] Rutas registradas en `backend/app.js`
- [ ] Componente Angular importado en `app.routes.ts`
- [ ] Origen `'cobraalmacen'` agregado en `module-movimientoMios.js`  
- [ ] Tests unitarios para cada método del servicio
- [ ] UI feedback para: carga, éxito, error (confirmaciones para operaciones sensibles)
- [ ] Validaciones en frontend y backend
- [ ] Middleware de autenticación aplicado a todas las rutas
- [ ] Documentación de API con ejemplos de payloads

---

## 📚 Referencias

- Patrón similar: [module-cobrarMias.js](/backend/modules/module-cobrarMias.js)
- Contabilidad: [memoria/cobrarmias-contabilidad.md](/memories/repo/cobrarmias-contabilidad.md)
- Fechas: Usar formato `YYYY-MM-DD` con validación local
- Números: Validar que sean positivos y mayores a 0.01

---

## 🚀 Estado Actual

✅ **Estructura lista**, ❌ **Métodos sin implementar (plantilla)**

Todos los métodos tienen `// TODO` comentarios y retornan `501 Not Implemented`.  
Próximo paso: Implementar la lógica según los requisitos del negocio.
