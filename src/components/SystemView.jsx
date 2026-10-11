import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  Terminal,
  Database,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
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
  showNotification,
  refreshTransactions,
}) {
  const [isSeeding, setIsSeeding] = useState(false);
  const [simulationStep, setSimulationStep] = useState(null);

  // Generate automated full lifecycle demo transaction (The 6 required events)
  const handleRunFullCycleDemo = async () => {
    setIsSeeding(true);
    showNotification('success', 'Iniciando demostración en vivo de los 6 eventos...');

    try {
      const demoCust = `cliente-exposicion-${Math.floor(100 + Math.random() * 900)}`;
      const demoAmount = 25000;

      // Paso 1: TransactionCreated (v1)
      setSimulationStep('1/6: Registrando TransactionCreated (v1)...');
      const step1 = await createTransaction({
        amount: demoAmount,
        currency: 'CRC',
        customerId: demoCust,
      });
      const txId = step1.transactionId;

      // Paso 2: PaymentRequested (v2)
      await new Promise((r) => setTimeout(r, 600));
      setSimulationStep('2/6: Registrando PaymentRequested (v2)...');
      await requestPayment(txId, {
        amount: demoAmount,
        expectedVersion: 1,
      });

      // Paso 3: PaymentRejected (v3)
      await new Promise((r) => setTimeout(r, 600));
      setSimulationStep('3/6: Simulando rechazo del banco: PaymentRejected (v3)...');
      await rejectPayment(txId, {
        reason: 'Fondos insuficientes en la cuenta bancaria',
        expectedVersion: 2,
      });

      // Paso 4: PaymentRetried (v4)
      await new Promise((r) => setTimeout(r, 600));
      setSimulationStep('4/6: Reintentando cobro automático: PaymentRetried (v4)...');
      await retryPayment(txId, {
        attemptNumber: 2,
        expectedVersion: 3,
      });

      // Paso 5: PaymentApproved (v5)
      await new Promise((r) => setTimeout(r, 600));
      setSimulationStep('5/6: Banco aprueba el pago: PaymentApproved (v5)...');
      await approvePayment(txId, {
        approvalCode: `AUTH-EXPO-${Math.floor(1000 + Math.random() * 9000)}`,
        expectedVersion: 4,
      });

      // Paso 6: TransactionCompleted (v6)
      await new Promise((r) => setTimeout(r, 600));
      setSimulationStep('6/6: Cerrando la operación: TransactionCompleted (v6)...');
      await completeTransaction(txId, {
        completedAt: new Date().toISOString(),
        expectedVersion: 5,
      });

      setSimulationStep('¡Completado con éxito!');
      await refreshTransactions(txId);
      showNotification('success', `¡Demostración lista! Se guardaron los 6 eventos de la transacción ${txId}`);
    } catch (err) {
      showNotification('error', `Aviso en simulación: ${err.message}`);
    } finally {
      setIsSeeding(false);
      setTimeout(() => setSimulationStep(null), 4000);
    }
  };

  return (
    <div className="system-view-container">
      {/* Demo Seeder Hero Box */}
      <div className="admin-box-card highlight-card">
        <div className="box-card-header">
          <div className="box-title-group">
            <span className="box-badge">Herramienta para la Exposición</span>
            <h3>Demostración Automática de los 6 Eventos Requeridos</h3>
          </div>
        </div>

        <div className="box-card-content">
          <p className="box-description font-medium">
            Con este botón demuestras al profesor en vivo exactamente cómo una transacción viaja por los 6 eventos requeridos en la rúbrica:
          </p>

          <div className="sequence-badge-flow">
            <span className="step-pill">1. TransactionCreated</span>
            <ArrowRight size={13} className="arrow-sep" />
            <span className="step-pill">2. PaymentRequested</span>
            <ArrowRight size={13} className="arrow-sep" />
            <span className="step-pill step-rejected">3. PaymentRejected</span>
            <ArrowRight size={13} className="arrow-sep" />
            <span className="step-pill">4. PaymentRetried</span>
            <ArrowRight size={13} className="arrow-sep" />
            <span className="step-pill step-approved">5. PaymentApproved</span>
            <ArrowRight size={13} className="arrow-sep" />
            <span className="step-pill step-completed">6. TransactionCompleted</span>
          </div>

          <div className="demo-trigger-wrapper">
            <button
              type="button"
              className="btn-command-execute max-w-sm"
              onClick={handleRunFullCycleDemo}
              disabled={isSeeding || !commandHealth.online}
            >
              <Sparkles size={16} />
              <span>{isSeeding ? 'Generando eventos en vivo...' : 'Ejecutar Flujo Completo (6 Eventos en Vivo)'}</span>
            </button>

            {simulationStep && (
              <span className="simulation-live-status">
                <CheckCircle2 size={14} className="text-emerald-600" />
                <span>{simulationStep}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Services Architecture Cards */}
      <div className="system-nodes-grid mt-6">
        {/* Node 1: Command Service */}
        <div className="system-node-card">
          <div className="node-card-header">
            <div className="node-icon-box">
              <Terminal size={18} />
            </div>
            <div>
              <h3>Servicio 1: Command API (Escritura)</h3>
              <span className="node-url font-mono">{COMMAND_API_BASE}</span>
            </div>
            <span className={`status-pill ${commandHealth.online ? 'status-COMPLETED' : 'status-PAYMENT_REJECTED'}`}>
              {commandHealth.online ? 'En línea' : 'Desconectado'}
            </span>
          </div>

          <div className="node-card-body">
            <p className="node-desc">
              <strong>Función principal:</strong> Recibe las acciones de los usuarios, valida las reglas del dominio y agrega eventos al final del archivo <code>data/event-store.jsonl</code>. No hace lecturas ni modifica registros anteriores.
            </p>
            <div className="node-specs">
              <div className="spec-row">
                <span className="spec-label">Puerto en el sistema:</span>
                <span className="spec-val font-mono">3000</span>
              </div>
              <div className="spec-row">
                <span className="spec-label">Documentación Swagger:</span>
                <a
                  href={`${COMMAND_API_BASE}/api/docs`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="spec-link"
                >
                  <span>Abrir Swagger UI (:3000/api/docs)</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Node 2: History Service */}
        <div className="system-node-card">
          <div className="node-card-header">
            <div className="node-icon-box">
              <Database size={18} />
            </div>
            <div>
              <h3>Servicio 2: History API (Lectura)</h3>
              <span className="node-url font-mono">{HISTORY_API_BASE}</span>
            </div>
            <span className={`status-pill ${historyHealth.online ? 'status-COMPLETED' : 'status-PAYMENT_REJECTED'}`}>
              {historyHealth.online ? 'En línea' : 'Desconectado'}
            </span>
          </div>

          <div className="node-card-body">
            <p className="node-desc">
              <strong>Función principal:</strong> Lee el archivo de eventos de solo-lectura y reconstruye el estado actual de cada transacción mediante la función <code>replay(eventos)</code>. Demuestra la separación estricta entre lectura y escritura (CQRS).
            </p>
            <div className="node-specs">
              <div className="spec-row">
                <span className="spec-label">Puerto en el sistema:</span>
                <span className="spec-val font-mono">3001</span>
              </div>
              <div className="spec-row">
                <span className="spec-label">Visor HTML integrado:</span>
                <a
                  href={`${HISTORY_API_BASE}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="spec-link"
                >
                  <span>Abrir Vista de Consulta (:3001/)</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
