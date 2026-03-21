# 🔧 CHECKLIST: Integración de cobrarAlmacen al Proyecto

**Estado**: Estructura lista, métodos sin implementar (plantilla)  
**Fecha creación**: 19/03/2026  
**Próximo paso**: Registrar rutas e implementar métodos

---

## ✅ CHECKLIST PRE-INTEGRACIÓN

### Backend

- [ ] **1. Registrar rutas en `backend/app.js`**
  ```javascript
  const routesCobrarAlmacen = require('./routes/routes-cobrarAlmacen');
  app.use('/api', routesCobrarAlmacen);
  ```
  
- [ ] **2. Agregar origen en `backend/modules/module-movimientoMios.js`**
  ```javascript
  // En ORIGENES_MODELO_VALIDOS[], agregar:
  'cobraalmacen'
  ```
  
- [ ] **3. Verificar middleware de autenticación**
  - Las rutas deben estar protegidas con middleware `authenticated`
  - Agregar en `routes-cobrarAlmacen.js` si es necesario: `router.use(middlewareAuth)`

---

### Frontend

- [ ] **4. Importar componente en `app.routes.ts`**
  ```typescript
  import { CobraAlmacenComponent } from './components/cobrar-almacen/cobrar-almacen';
  
  export const routes: Routes = [
      // ...
      {
          path: 'almacen/cobrar',
          component: CobraAlmacenComponent,
          canActivate: [AuthGuard]
      }
  ];
  ```

- [ ] **5. Registrar HttpClientModule si no está**
  - En `app.config.ts`, verificar que `HttpClientModule` esté en dependencias

- [ ] **6. Agregar link de navegación en menú principal**
  - Incluir enlace a `/almacen/cobrar` en la barra de navegación

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

Una vez integrado, implementar:

### Servicio Backend (cobraalmacen.service.js)

- [ ] **Gestión de Clientes**
  - [ ] `obtenerTodosLosClientes()` - Filtrable por estado
  - [ ] `obtenerClientePorId()`
  - [ ] `crearCliente()` - Validar nombre único
  - [ ] `actualizarCliente()` - No permitir cambiar nombre
  - [ ] `eliminarCliente()` - Validar sin deudas pendientes
  - [ ] `recalcularTotalesCliente()` - Sumar ventas, abonos, etc.

- [ ] **Gestión de Ventas**
  - [ ] `agregarVenta()` - Validar cuentas existen, calcular saldos
  - [ ] `eliminarVenta()` - Validar sin abonos
  - [ ] Generar movimientos contables con origen `'cobraalmacen'`

- [ ] **Gestión de Abonos**
  - [ ] `agregarAbono()` - Validar monto <= saldoPendiente
  - [ ] `eliminarAbono()` - Revertir cambios de saldos
  - [ ] Actualizar estado automático (pendiente → parcial → pagada)
  - [ ] Generar movimientos contables

- [ ] **Reportes**
  - [ ] `obtenerVentasPendientes()` - Agrupar por estado
  - [ ] `obtenerVentasPorPeriodo()` - Con filtros de fecha
  - [ ] `obtenerClientesConMayorDeuda()` - Top N deudores
  - [ ] `obtenerResumenClientes()` - Totales consolidados

---

### Controller Backend (controller-cobrarAlmacen.js)

- [ ] **Validaciones**
  - [ ] Validar parámetros en cada endpoint
  - [ ] Manejo de errores consistente
  - [ ] Respuestas HTTP apropiadas (200, 400, 500, 501)

- [ ] **Seguridad**
  - [ ] Verificar autenticación en cada endpoint
  - [ ] Sanitizar inputs (trim, tipos correctos)
  - [ ] Validar URls y parámetros

---

### Componente Frontend (cobrar-almacen.ts)

- [ ] **Métodos de Carga**
  - [ ] `cargarClientes()` - GET inicial de datos
  - [ ] `cargarResumen()` - Totales consolidados
  - [ ] `cargarReportes()` - Datos para reportes

- [ ] **Diálogos**
  - [ ] Crear cliente (modal/diálogo)
  - [ ] Editar cliente
  - [ ] Agregar venta
  - [ ] Registrar abono
  - [ ] Confirmaciones para eliminar

- [ ] **Estados UI**
  - [ ] Loading spinners
  - [ ] Mensajes de éxito/error
  - [ ] Validación de formularios
  - [ ] Deshabilitar botones durante peticiones

---

### Template Frontend (cobrar-almacen.html)

- [ ] **Vistas**
  - [ ] Vista de clientes (tabla)
  - [ ] Vista de detalle de cliente (ventas y abonos)
  - [ ] Vista de reportes
  - [ ] Formularios de entrada

- [ ] **Componentes UI**
  - [ ] Tablas con ordenamiento y búsqueda
  - [ ] Paginación si hay muchos registros
  - [ ] Filtros (por estado, período, cliente)
  - [ ] Exportar a PDF/Excel (opcional)

---

## 📚 TESTS Y VALIDACIÓN

- [ ] **Tests Unitarios**
  - [ ] Servicio backend: métodos sin dependencias
  - [ ] Validaciones de entrada
  - [ ] Casos edge (montos negativos, NaN, duplicados)

- [ ] **Tests E2E**
  - [ ] Flujo completo: crear cliente → agregar venta → registrar abono
  - [ ] Eliminar operaciones y verificar reversiones
  - [ ] Generación de movimientos contables

- [ ] **Validación Manual**
  - [ ] Probar en navegadores diferentes
  - [ ] Responsive en mobile (si aplica)
  - [ ] Manejo de errores de red
  - [ ] Datos persistentes en DB

---

## 🧪 CASOS DE PRUEBA SUGERIDOS

### Básico
1. Crear cliente → verificar en lista
2. Agregar venta → verificar saldos
3. Abonar parcialmente → verificar estado "parcial"
4. Abonar completo → verificar estado "pagada"

### Validaciones
5. Crear cliente con nombre duplicado → rechazar
6. Agregar venta con monto negativo → rechazar
7. Abonar más de lo adeudado → rechazar
8. Eliminar cliente con deudas → rechazar

### Contabilidad (si aplica)
9. Crear venta → verificar movimiento generado
10. Abonar → verificar movimiento de ingreso

### Reportes
11. Generar reporte de pendientes → coincida con datos
12. Filtrar por período → solo incluya datos del rango

---

## 🚀 DEPLOYMENT

- [ ] **Antes de producción**
  - [ ] Build frontend: `ng build --prod`
  - [ ] Test backend: `npm test`
  - [ ] Verificar variables de entorno (DB_URL, etc.)
  - [ ] Backup de base de datos
  - [ ] Plan de rollback

- [ ] **Documentación**
  - [ ] API docs (Swagger o similar)
  - [ ] Manual de usuario
  - [ ] Guía de mantenimiento

---

## 📊 MÉTRICAS ESPERADAS

Después de implementar completamente:

- Endpoints funcionales: **14 GET/POST/DELETE**
- Colección MongoDB: **cobraalmacen**
- Componentes Angular: **1 principal + opcionales (modal, tabla)**
- Métodos de servicio: **18+**
- Casos de prueba: **20+**

---

## 🔗 REFERENCIAS

- Documentación: `FLUJO_COBRAR_ALMACEN.md`
- Guía de operaciones: `GUIA_AGREGAR_OPERACIONES_COBRAR_ALMACEN.js`
- Patrón similar: `/backend/modules/module-cobrarMias.js`
- Estructura de proyecto: `/` (root)

---

## ❓ FAQ / TROUBLESHOOTING

**P: ¿Qué pasa si no agrego 'cobraalmacen' a ORIGENES_MODELO_VALIDOS?**  
R: Los movimientos contables fallarán al insertarse (error 500).

**P: ¿Puedo usar el mismo modelo que cobrarMias?**  
R: No, son flujos diferentes (personal vs almacén). Mantener separados.

**P: ¿Cómo hago rollback si algo falla?**  
R: Los archivos están en git, hacer revert de commits o manual delete.

**P: ¿Necesito crear una tabla separada en MySQL?**  
R: No, es MongoDB. Collection `cobraalmacen` (se crea automáticamente).

---

**Última actualización**: 19/03/2026  
**Creado por**: Sistema de scaffolding
