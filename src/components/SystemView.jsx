import React, { useState } from 'react';
import {
  COMMAND_API_BASE,
  HISTORY_API_BASE,
  createTransaction,
  requestPayment,
  rejectPayment,
  retryPayment,
  approvePayment,
  completeTransaction,
} from '../api';

export default function SystemView({
  commandHealth,
  historyHealth,
  onRefresh,
  showNotification,
  refreshTransactions,
}) {
  const [isSeeding, setIsSeeding] = useState(false);

  // Generate automated full lifecycle demo transaction
  const handleRunFullCycleDemo = async () => {
    setIsSeeding(true);
    showNotification('success', 'Iniciando simulación de ciclo completo Event Sourcing...');

    try {
      const demoCust = `demo-user-${Math.floor(100 + Math.random() * 900)}`;
      const demoAmount = 18500;

      // 1. TransactionCreated (v1)
      const step1 = await createTransaction({
        amount: demoAmount,
        currency: 'CRC',
        customerId: demoCust,
      });
      const txId = step1.transactionId;

      // 2. PaymentRequested (v2)
      await new Promise((r) => setTimeout(r, 400));
      await requestPayment(txId, {
        amount: demoAmount,
        expectedVersion: 1,
      });

      // 3. PaymentRejected (v3)
      await new Promise((r) => setTimeout(r, 400));
      await rejectPayment(txId, {
        reason: 'Fondos temporalmente retenidos por el emisor',
        expectedVersion: 2,
      });

      // 4. PaymentRetried (v4)
      await new Promise((r) => setTimeout(r, 400));
      await retryPayment(txId, {
        attemptNumber: 2,
        expectedVersion: 3,
      });

      // 5. PaymentApproved (v5)
      await new Promise((r) => setTimeout(r, 400));
      await approvePayment(txId, {
        approvalCode: `AUTH-DEMO-${Math.floor(1000 + Math.random() * 9000)}`,
        expectedVersion: 4,
      });

      // 6. TransactionCompleted (v6)
      await new Promise((r) => setTimeout(r, 400));
      await completeTransaction(txId, {
        completedAt: new Date().toISOString(),
        expectedVersion: 5,
      });

      await refreshTransactions(txId);
      showNotification('success', `¡Simulación exitosa! Se generaron 6 eventos inmutables para ${txId}`);
    } catch (err) {
      showNotification('error', `Error en simulación: ${err.message}`);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="system-view-container">
      {/* Top Cards: Architecture Services */}
      <div className="system-nodes-grid">
        {/* Node 1: Command Service */}
        <div className="system-node-card">
          <div className="node-card-header">
            <div className="node-icon-box bg-command">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="4 17 10 11 4 5" />
                <line x1="12" y1="19" x2="20" y2="19" />
              </svg>
            </div>
            <div>
              <h3>Command Service (Escritura)</h3>
              <span className="node-url font-mono">{COMMAND_API_BASE}</span>
            </div>
            <span className={`status-pill ${commandHealth.online ? 'status-COMPLETED' : 'status-PAYMENT_REJECTED'}`}>
              {commandHealth.online ? 'En Línea' : 'Offline'}
            </span>
          </div>

          <div className="node-card-body">
            <p className="node-desc">
              Servicio NestJS responsable de aceptar comandos, validar reglas de dominio, inmutabilidad y escribir eventos en <code>data/event-store.jsonl</code>.
            </p>
            <div className="node-specs">
              <div className="spec-row">
                <span className="spec-label">Puerto:</span>
                <span className="spec-val font-mono">3000</span>
              </div>
              <div className="spec-row">
                <span className="spec-label">Latencia Ping:</span>
                <span className="spec-val font-mono">{commandHealth.latency ? `${commandHealth.latency} ms` : '—'}</span>
              </div>
              <div className="spec-row">
                <span className="spec-label">Documentación Swagger:</span>
                <a
                  href={`${COMMAND_API_BASE}/api/docs`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="spec-link"
                >
                  Abrir Swagger UI ↗
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Node 2: History Service */}
        <div className="system-node-card">
          <div className="node-card-header">
            <div className="node-icon-box bg-history">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
              </svg>
            </div>
            <div>
              <h3>History Service (Lectura / Query)</h3>
              <span className="node-url font-mono">{HISTORY_API_BASE}</span>
            </div>
            <span className={`status-pill ${historyHealth.online ? 'status-COMPLETED' : 'status-PAYMENT_REJECTED'}`}>
              {historyHealth.online ? 'En Línea' : 'Offline'}
            </span>
          </div>

          <div className="node-card-body">
            <p className="node-desc">
              Servicio de consulta desacoplado. Lee de forma solo-lectura el log de eventos y expone el estado reconstruido en memoria mediante la función de reducción <code>replay</code>.
            </p>
            <div className="node-specs">
              <div className="spec-row">
                <span className="spec-label">Puerto:</span>
                <span className="spec-val font-mono">3001</span>
              </div>
              <div className="spec-row">
                <span className="spec-label">Latencia Ping:</span>
                <span className="spec-val font-mono">{historyHealth.latency ? `${historyHealth.latency} ms` : '—'}</span>
              </div>
              <div className="spec-row">
                <span className="spec-label">Visor Nativo:</span>
                <a
                  href={`${HISTORY_API_BASE}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="spec-link"
                >
                  Abrir Historial HTML ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Seeder & Benchmarking */}
      <div className="admin-box-card mt-6">
        <div className="box-card-header">
          <div className="box-title-group">
            <span className="box-badge">Herramientas de Demostración</span>
            <h3>Generador de Flujo Completo Event Sourcing</h3>
          </div>
        </div>

        <div className="box-card-content">
          <p className="box-description">
            Genera automáticamente una transacción completa recorriendo todo el ciclo auditable con rechazo y reintento en tiempo real:
            <code> TransactionCreated (v1)</code> →
            <code> PaymentRequested (v2)</code> →
            <code> PaymentRejected (v3)</code> →
            <code> PaymentRetried (v4)</code> →
            <code> PaymentApproved (v5)</code> →
            <code> TransactionCompleted (v6)</code>.
          </p>

          <button
            type="button"
            className="btn-command-execute max-w-xs"
            onClick={handleRunFullCycleDemo}
            disabled={isSeeding || !commandHealth.online}
          >
            {isSeeding ? 'Emitiendo eventos en vivo...' : '⚡ Generar Transacción de Demostración (6 Eventos)'}
          </button>
        </div>
      </div>
    </div>
  );
}
