# Guía: Corrección de Fechas con Zona Horaria - Frontend Angular

## 🔴 PROBLEMA

Las fechas guardan correctamente en MongoDB, pero en el frontend Angular aparecen **un día antes**.

### Por qué sucede
1. Backend guarda fechas a **medianoche UTC** (00:00:00Z) en MongoDB
2. Frontend parsea con `new Date('2026-03-20')` → JavaScript interpreta como UTC
3. Browser de Colombia (UTC-5): medianoche UTC = 19:00 del día anterior
4. Al mostrar, Angular date pipe muestra la hora local → **día anterior**

### Ejemplo
- Backend guarda: `2026-03-20T00:00:00Z`
- JavaScript parsea: 20 de marzo a las 00:00 UTC
- Colombia (UTC-5): 19 de marzo a las 19:00 ❌
- Resultado en pantalla: "19/03/2026"

---

## ✅ SOLUCIÓN

### 1. Nuevo Servicio Centralizado: `DateHandlerService`

Ubicación: `frontend/src/app/services/date-handler.service.ts`

**Métodos principales:**
```typescript
// Parsear fecha como HORA LOCAL (no UTC)
parseToLocalDate(valor: string) → Date

// Convertir a formato YYYY-MM-DD
toYYYYMMDD(fecha: Date | string) → string

// Validar si es fecha válida
isValidDate(valor: unknown) → boolean

// Filtrar por rango de fechas
filterByDateRange(items, desde, hasta) → any[]

// Ordenar por fecha
sortByDate(items, propiedadFecha, descendente) → any[]
```

### 2. Nuevo Pipe: `LocalDatePipe`

Ubicación: `frontend/src/app/pipes/local-date.pipe.ts`

Reemplaza el date pipe estándar en templates:

**Antes (❌ INCORRECTO):**
```html
{{ factura.fecha | date:'yyyy-MM-dd' }}
```

**Después (✅ CORRECTO):**
```html
{{ factura.fecha | localDate:'yyyy-MM-dd' }}
```

**Formatos soportados:**
- `yyyy-MM-dd` → "2026-03-20"
- `dd/MM/yyyy` → "20/03/2026"
- `long` → "20 de marzo de 2026"
- `short` → "20/03/2026"
- `medium` → "20 mar 2026"
- `time` → "14:30"

---

## 🔧 PASOS DE ACTUALIZACIÓN

### Paso 1: Importar DateHandlerService en el componente

```typescript
import { DateHandlerService } from '../../services/date-handler.service';

@Component({
  selector: 'app-deudas',
  standalone: true,
  imports: [CommonModule, FormsModule], // ← Agregar si falta
  templateUrl: './deudas.html',
  styleUrl: './deudas.css',
})
export class Deudas implements OnInit {
  constructor(private dateHandler: DateHandlerService) {} // ← Inyectar
}
```

### Paso 2: Importar LocalDatePipe en componentes que lo usen

```typescript
import { LocalDatePipe } from '../../pipes/local-date.pipe';

@Component({
  //...
  imports: [CommonModule, FormsModule, LocalDatePipe], // ← Agregar pipe
  //...
})
```

### Paso 3: Reemplazar validaciones de fecha

**Antes:**
```typescript
if (fecha && isNaN(new Date(fecha).getTime())) {
  this.errorMessage = 'La fecha no es valida.';
  return;
}
```

**Después:**
```typescript
if (fecha && !this.dateHandler.isValidDate(fecha)) {
  this.errorMessage = 'La fecha no es valida.';
  return;
}
```

### Paso 4: Reemplazar ordenamiento de fechas

**Antes:**
```typescript
this.facturas.sort((a, b) => 
  new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
);
```

**Después:**
```typescript
this.facturas = this.dateHandler.sortByDate(
  this.facturas,
  'fecha', // propiedad
  false    // ascendente
);
```

### Paso 5: Reemplazar filtros por fecha

**Antes (❌ INCORRECTO):**
```typescript
get facturasFiltradasPorFecha(): any[] {
  let data = [...this.facturas];
  if (this.filtroFechaDesde || this.filtroFechaHasta) {
    data = data.filter(f => {
      const fecha = new Date(f.fecha);
      const ymd = fecha.toISOString().split('T')[0]; // ← MAL: UTC
      if (this.filtroFechaDesde && ymd < this.filtroFechaDesde) return false;
      if (this.filtroFechaHasta && ymd > this.filtroFechaHasta) return false;
      return true;
    });
  }
  return data;
}
```

**Después (✅ CORRECTO):**
```typescript
get facturasFiltradasPorFecha(): any[] {
  return this.dateHandler.filterByDateRange(
    this.facturas,
    this.filtroFechaDesde,
    this.filtroFechaHasta,
    'fecha'
  );
}
```

### Paso 6: Reemplazar date pipe en templates

**Antes:**
```html
<!-- deudas.html línea 190, 207 -->
{{ factura.fecha | date:'yyyy-MM-dd' }}
{{ abono.fecha | date:'yyyy-MM-dd' }}
```

**Después:**
```html
{{ factura.fecha | localDate:'yyyy-MM-dd' }}
{{ abono.fecha | localDate:'yyyy-MM-dd' }}
```

### Paso 7: Obtener fecha actual correctamente

**Antes:**
```typescript
const hoy = new Date(); // ← Riesgo: UTC en servidor
fechaHoy.setHours(0, 0, 0, 0);
```

**Después:**
```typescript
const hoy = this.dateHandler.getTodayYYYYMMDD(); // ← SIEMPRE zona local
```

---

## 📋 COMPONENTES A ACTUALIZAR

Prioritario (más uso de fechas):
1. ✅ `ingresos-mios.ts` - Filtros de fecha y formato
2. ✅ `movimientos-mios.ts` - Parsing y ordenamiento
3. ✅ `gastos-mios.ts` - Igual estructura
4. ✅ `cobrar-mias.ts` - Facturas con fecha
5. ✅ `deudas.ts` & `deudas-mias.ts` - Abonos con fecha
6. ✅ `movimientos.ts` - Movimientos contables
7. ✅ `proceso-surtido.ts` - Procesos con fecha
8. ✅ `dashboard-personal.ts` - Resumen de movimientos

Templates a actualizar (reemplazar `date:` por `localDate:`):
- `deudas.html` líneas 190, 207
- `deudas-mias.html` líneas 450, 470
- `cobrar-mias.html` líneas 279, 298
- `ingresos-mios.html` línea 202
- `gastos-mios.html` línea 219
- `movimientos.html` línea 106
- `movimientos-mios.html` línea 107
- `proceso-surtido.html` línea 193
- `cierres-diarios.html` línea 35
- Todas las demás vistas con `| date:`

---

## 🧪 VALIDACIÓN POST-ACTUALIZACIÓN

1. **Ingresa una fecha de hoy** en cualquier formulario
2. **Guarda** y ve a MongoDB Atlas
3. **Recarga** la página del frontend
4. ✅ La fecha debe mostrar **HOY**, no ayer

Ejemplo:
- Hoy: 20 de marzo de 2026
- Ingresas: 2026-03-20
- MongoDB guarda: `2026-03-20T00:00:00Z`
- Frontend muestra: ✅ `2026-03-20` (NO `2026-03-19`)

---

## 💡 NOTA IMPORTANTE

El servicio `DateHandlerService` **siempre parsea como hora local**, no UTC. Esto es correcto porque:
- Medianoche UTC (00:00:00Z) se parsea como las 00:00 **local**
- En Colombia (UTC-5): se muestra como el día correcto
- No importa qué zona horaria tenga el navegador: siempre muestra correcto

---

## 🆘 TROUBLESHOOTING

**Problema: Sigue mostrando día anterior**
- ¿Reemplazaste `date:` por `localDate:` en el template? ✅
- ¿Importaste LocalDatePipe en el componente? ✅
- ¿Limpiaste caché del navegador (Ctrl+Shift+Del)? ✅

**Problema: Error "pipe not recognized"**
- Agrega `LocalDatePipe` al array `imports:` del componente

**Problema: Cambios no se ven**
- Rebuild del proyecto: `ng build`
- Redeploy a HostGator
