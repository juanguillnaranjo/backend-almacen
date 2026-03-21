/**
 * GUÍA RÁPIDA: Cómo agregar nuevas operaciones al flujo cobrarAlmacen
 * 
 * Ejemplo: Queremos agregar una nueva operación "Transferir deuda entre clientes"
 */

// ============================================================================
// PASO 1: MODELO (backend/modules/module-cobrarAlmacen.js)
// ============================================================================

// Si necesitas agregar nuevos campos o subesquemas:

// Opción A: Agregar campo simple al esquema
// VentaAlmacenSchema = Schema({
//     ...existente...
//     numeroReferencia: { type: String, trim: true, default: '' }  // ← NUEVO
// });

// Opción B: Crear subesquema para nueva estructura si es compleja
// var TransferenciaDeudaSchema = Schema({
//     clienteOrigen: String,
//     clienteDestino: String,
//     monto: Number,
//     fecha: Date,
//     motivo: String
// }, { _id: false });


// ============================================================================
// PASO 2: CONTROLLER (backend/controllers/controller-cobrarAlmacen.js)
// ============================================================================

// Agregar nuevo método exportado:

/*
exports.transferirDeudaAlmacen = function(req, res) {
	const { clienteOrigenId, clienteDestinoId, monto, motivo } = req.body;
	
	// Validación básica
	if (!clienteOrigenId || !clienteDestinoId || !monto) {
		return res.status(400).json({ 
			error: 'Parámetros faltantes' 
		});
	}
	
	// Llamar al servicio
	CobraAlmacenService.transferirDeuda(
		clienteOrigenId, 
		clienteDestinoId, 
		monto, 
		motivo
	)
	.then(resultado => {
		res.json({ 
			message: 'Transferencia realizada',
			data: resultado 
		});
	})
	.catch(error => {
		res.status(500).json({ 
			error: error.message 
		});
	});
};
*/


// ============================================================================
// PASO 3: SERVICIO (backend/controllers/services/cobraalmacen.service.js)
// ============================================================================

// Agregar método a la clase:

/*
async transferirDeuda(clienteOrigenId, clienteDestinoId, monto, motivo) {
	try {
		// Validación
		if (monto <= 0) {
			throw new Error('Monto debe ser positivo');
		}
		
		// Obtener clientes
		const clienteOrigen = await CobroAlmacen.findById(clienteOrigenId);
		const clienteDestino = await CobroAlmacen.findById(clienteDestinoId);
		
		if (!clienteOrigen || !clienteDestino) {
			throw new Error('Cliente no encontrado');
		}
		
		if (clienteOrigen.totalPendiente < monto) {
			throw new Error('Monto insuficiente');
		}
		
		// Actualizar saldos
		clienteOrigen.totalPendiente -= monto;
		clienteDestino.totalPendiente += monto;
		
		await clienteOrigen.save();
		await clienteDestino.save();
		
		// Si aplica: generar movimiento contable
		// await MovimientoMio.insertMany([{
		//     fecha: new Date(),
		//     origen: 'cobraalmacen',
		//     concepto: 'Transferencia de deuda',
		//     ...
		// }]);
		
		return {
			clienteOrigen,
			clienteDestino,
			montoTransferido: monto,
			motivo
		};
	} catch (error) {
		throw error;
	}
}
*/


// ============================================================================
// PASO 4: RUTAS (backend/routes/routes-cobrarAlmacen.js)
// ============================================================================

// Agregar nueva ruta:

/*
router.post('/almacen/transferirDeudaAlmacen', 
	controllerCobrarAlmacen.transferirDeudaAlmacen
);
*/


// ============================================================================
// PASO 5: SERVICIO FRONTEND (frontend/src/app/services/cobrar-almacen.service.ts)
// ============================================================================

// Agregar método HTTP:

/*
transferirDeuda(clienteOrigenId: string, clienteDestinoId: string, 
                monto: number, motivo: string): Observable<any> {
	const body = {
		clienteOrigenId,
		clienteDestinoId,
		monto,
		motivo
	};
	return this.http.post(
		`${this.apiUrl}/almacen/transferirDeudaAlmacen`, 
		body
	);
}
*/


// ============================================================================
// PASO 6: COMPONENTE (frontend/src/app/components/cobrar-almacen/cobrar-almacen.ts)
// ============================================================================

// Agregar método de UI:

/*
transferirDeuda(): void {
	// Validar selecciones
	if (!this.clienteOrigen || !this.clienteDestino || !this.montoTransferencia) {
		alert('Complete los campos requeridos');
		return;
	}
	
	// Confirmación
	if (!confirm('¿Confirma la transferencia de deuda?')) {
		return;
	}
	
	// Llamar servicio
	this.cobraAlmacenService.transferirDeuda(
		this.clienteOrigen._id,
		this.clienteDestino._id,
		this.montoTransferencia,
		this.motivoTransferencia
	).subscribe(
		(respuesta) => {
			alert('Transferencia realizada exitosamente');
			this.cargarClientes(); // Recargar datos
		},
		(error) => {
			alert('Error: ' + error.error.error);
		}
	);
}
*/


// ============================================================================
// PASO 7: TEMPLATE (frontend/src/app/components/cobrar-almacen/cobrar-almacen.html)
// ============================================================================

// Agregar UI:

/*
<div class="seccion-transferencia">
	<h4>Transferir Deuda</h4>
	
	<label>
		Cliente Origen:
		<select [(ngModel)]="clienteOrigen">
			<option *ngFor="let c of clientes" [value]="c">
				{{ c.nombreCliente }}
			</option>
		</select>
	</label>
	
	<label>
		Cliente Destino:
		<select [(ngModel)]="clienteDestino">
			<option *ngFor="let c of clientes" [value]="c">
				{{ c.nombreCliente }}
			</option>
		</select>
	</label>
	
	<label>
		Monto:
		<input type="number" [(ngModel)]="montoTransferencia" 
		       min="0.01" step="0.01">
	</label>
	
	<label>
		Motivo:
		<input type="text" [(ngModel)]="motivoTransferencia">
	</label>
	
	<button (click)="transferirDeuda()" class="btn-secondary">
		Transferir
	</button>
</div>
*/


// ============================================================================
// PASO 8: VALIDACIONES Y TESTS (OPCIONAL PERO RECOMENDADO)
// ============================================================================

// Crear tests unitarios:
/*
describe('CobraAlmacenService.transferirDeuda', () => {
	it('debe transferir deuda entre clientes', async () => {
		// Preparar datos
		// Ejecutar
		// Verificar
	});
	
	it('debe rechazar transferencia con monto > deuda del origen', async () => {
		// Preparar aserciones
	});
	
	it('debe generar movimiento contable', async () => {
		// Verificar que se agregó a movimientos
	});
});
*/


// ============================================================================
// CHECKLIST RÁPIDO
// ============================================================================

/*
☐ 1. Actualizar modelo (schema) si es necesario
☐ 2. Crear método en controller
☐ 3. Implementar lógica en servicio
☐ 4. Agregar ruta
☐ 5. Crear método en servicio HTTP (frontend)
☐ 6. Implementar método de UI en componente
☐ 7. Agregar elementos en template HTML
☐ 8. Agregar tests unitarios
☐ 9. Validar flujo completo (E2E)
☐ 10. Documentar en código

IMPORTANTE:
- Si genera movimientos: usar origen 'cobraalmacen'
- Validar en backend (nunca confiar solo en frontend)
- Usar try-catch en promesas async/await
- Mostrar confirmación para operaciones sensibles
- Manejo de errores en UI (alerts o toast)
*/
