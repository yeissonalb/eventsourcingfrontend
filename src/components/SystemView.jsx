import React, { useState } from 'react';
import {
  Sparkles,
  Zap,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Play,
  Layers,
  Building2,
  ShieldCheck,
  Server,
  Send,
  CreditCard,
} from 'lucide-react';
import {
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
  onGoToTimeline,
  onDeductBalance,
}) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentStepMessage, setCurrentStepMessage] = useState(null);
  const [activeSimulationType, setActiveSimulationType] = useState(null);

  // 1. Simulación Completa de Compensación Interbancaria (6 Pasos)
  const handleFullCycleDemo = async () => {
    setIsSimulating(true);
    setActiveSimulationType('full');
    showNotification('success', 'Iniciando simulación de transferencia interbancaria (6 pasos)...');

    try {
      const demoCust = `Comercio Proveedor #${Math.floor(100 + Math.random() * 900)}`;
      const demoAmount = 28500;

      // Paso 1: TransactionCreated
      setCurrentStepMessage('1/6: Generando orden de transferencia por ₡28,500...');
      const step1 = await createTransaction({
        amount: demoAmount,
        currency: 'CRC',
        customerId: demoCust,
      });
      const txId = step1.transactionId || step1.state?.transactionId || step1.event?.transactionId;
      if (!txId) {
        throw new Error('No se pudo obtener el identificador de la transacción');
      }

      // Paso 2: PaymentRequested
      await new Promise((r) => setTimeout(r, 700));
      setCurrentStepMessage('2/6: Conectando con la red bancaria y solicitando débito...');
      await requestPayment(txId, {
        amount: demoAmount,
        expectedVersion: 1,
      });

      // Paso 3: PaymentRejected
      await new Promise((r) => setTimeout(r, 700));
      setCurrentStepMessage('3/6: Banco emisor declina la operación ("Fondos insuficientes")...');
      await rejectPayment(txId, {
        reason: 'Fondos insuficientes en la cuenta origen',
        expectedVersion: 2,
      });

      // Paso 4: PaymentRetried
      await new Promise((r) => setTimeout(r, 700));
      setCurrentStepMessage('4/6: Cliente confirma fondos disponibles. Reintentando procesamiento...');
      await retryPayment(txId, {
        attemptNumber: 2,
        expectedVersion: 3,
      });

      // Paso 5: PaymentApproved
      await new Promise((r) => setTimeout(r, 700));
      setCurrentStepMessage('5/6: Banco autoriza la transferencia con código AUTH-982143...');
      await approvePayment(txId, {
        approvalCode: `AUTH-SINPE-${Math.floor(1000 + Math.random() * 9000)}`,
        expectedVersion: 4,
      });

      // Paso 6: TransactionCompleted
      await new Promise((r) => setTimeout(r, 700));
      setCurrentStepMessage('6/6: Fondos compensados y comprobante bancario emitido!');
      await completeTransaction(txId, {
        completedAt: new Date().toISOString(),
        expectedVersion: 5,
      });

      if (onDeductBalance) {
        onDeductBalance(demoAmount);
      }

      setCurrentStepMessage('¡Transferencia interbancaria completada con éxito!');
      await refreshTransactions(txId);
      showNotification('success', `¡Listo! Transferencia liquidada para ${demoCust}`);
    } catch (err) {
      showNotification('error', `Aviso en simulación bancaria: ${err.message}`);
    } finally {
      setIsSimulating(false);
      setTimeout(() => {
        setCurrentStepMessage(null);
        setActiveSimulationType(null);
      }, 4000);
    }
  };

  // 2. Simulación Pago Inmediato (Camino Feliz)
  const handleHappyPathDemo = async () => {
    setIsSimulating(true);
    setActiveSimulationType('happy');
    showNotification('success', 'Simulando pago inmediato aprobado...');

    try {
      const cust = `Supermercado Express #${Math.floor(10 + Math.random() * 90)}`;
      const amt = 16500;

      setCurrentStepMessage('1/4: Preparando pago en línea...');
      const s1 = await createTransaction({ amount: amt, currency: 'CRC', customerId: cust });
      const txId = s1.transactionId || s1.state?.transactionId || s1.event?.transactionId;
      if (!txId) {
        throw new Error('No se pudo obtener el identificador de la transacción');
      }

      await new Promise((r) => setTimeout(r, 600));
      setCurrentStepMessage('2/4: Transmitiendo a la red de tarjetas...');
      await requestPayment(txId, { amount: amt, expectedVersion: 1 });

      await new Promise((r) => setTimeout(r, 600));
      setCurrentStepMessage('3/4: Pago aprobado inmediatamente por el emisor...');
      await approvePayment(txId, {
        approvalCode: `AUTH-RAPIDA-${Math.floor(1000 + Math.random() * 9000)}`,
        expectedVersion: 2,
      });

      await new Promise((r) => setTimeout(r, 600));
      setCurrentStepMessage('4/4: Comprobante oficial emitido...');
      await completeTransaction(txId, {
        completedAt: new Date().toISOString(),
        expectedVersion: 3,
      });

      if (onDeductBalance) {
        onDeductBalance(amt);
      }

      setCurrentStepMessage('¡Pago acreditado de inmediato!');
      await refreshTransactions(txId);
      showNotification('success', 'Pago con tarjeta aprobado y liquidado.');
    } catch (err) {
      showNotification('error', `Error en simulación: ${err.message}`);
    } finally {
      setIsSimulating(false);
      setTimeout(() => {
        setCurrentStepMessage(null);
        setActiveSimulationType(null);
      }, 4000);
    }
  };

  // 3. Simulación Declinación por Seguridad
  const handleRejectDemo = async () => {
    setIsSimulating(true);
    setActiveSimulationType('reject');

    try {
      const cust = `Tienda Electrónica #${Math.floor(10 + Math.random() * 90)}`;
      const amt = 45000;

      setCurrentStepMessage('1/3: Solicitando débito...');
      const s1 = await createTransaction({ amount: amt, currency: 'CRC', customerId: cust });
      const txId = s1.transactionId || s1.state?.transactionId || s1.event?.transactionId;
      if (!txId) {
        throw new Error('No se pudo obtener el identificador de la transacción');
      }

      await new Promise((r) => setTimeout(r, 600));
      setCurrentStepMessage('2/3: Verificando fondos y políticas de fraude...');
      await requestPayment(txId, { amount: amt, expectedVersion: 1 });

      await new Promise((r) => setTimeout(r, 600));
      setCurrentStepMessage('3/3: Banco responde: "Tarjeta bloqueada por seguridad"...');
      await rejectPayment(txId, {
        reason: 'Tarjeta bloqueada preventivamente por seguridad o reporte de robo',
        expectedVersion: 2,
      });

      setCurrentStepMessage('¡Operación declinada registrada en el sistema!');
      await refreshTransactions(txId);
      showNotification('error', 'Operación Declinada por el Banco (Lista para reintentar).');
    } catch (err) {
      showNotification('error', `Error en simulación: ${err.message}`);
    } finally {
      setIsSimulating(false);
      setTimeout(() => {
        setCurrentStepMessage(null);
        setActiveSimulationType(null);
      }, 4000);
    }
  };

  return (
    <div className="bank-simulator-container">
      {/* Hero Banner */}
      <div className="bank-sim-hero">
        <div className="sim-badge">
          <Building2 size={14} />
          <span>Simulador de Operaciones Bancarias</span>
        </div>
        <h2>Pruebas de Pasarela y Compensación en 1 Clic</h2>
        <p>
          Genera escenarios reales de pagos con tarjeta y transferencias interbancarias para observar cómo la red de PayBank procesa autorizaciones en tiempo real, gestiona reintentos y asegura la disponibilidad de tus transacciones.
        </p>

        {currentStepMessage && (
          <div className="sim-status-banner">
            <div className="sim-spinner" />
            <span>{currentStepMessage}</span>
          </div>
        )}
      </div>

      {/* Simulator Cards */}
      <div className="bank-sim-scenarios-grid">
        {/* Escenario 1: 6 Pasos Completos */}
        <div className="sim-scenario-card highlight-card">
          <div className="scenario-top">
            <span className="scenario-tag">Caso Completo de Auditoría</span>
            <Building2 size={20} className="text-emerald" />
          </div>
          <h3>Compensación Interbancaria (6 Pasos)</h3>
          <p>
            Simula el flujo completo con rechazo y segundo intento exitoso:
          </p>
          <ul className="scenario-steps">
            <li>1. Solicitud de transferencia (v1)</li>
            <li>2. Transmisión a la red bancaria (v2)</li>
            <li>3. Declinación por falta de saldo (v3)</li>
            <li>4. Reintento de compensación (v4)</li>
            <li>5. Autorización con código bancario (v5)</li>
            <li>6. Liquidación y comprobante final (v6)</li>
          </ul>
          <button
            type="button"
            className="btn-sim-action btn-sim-primary"
            onClick={handleFullCycleDemo}
            disabled={isSimulating}
          >
            <Play size={16} />
            <span>{isSimulating && activeSimulationType === 'full' ? 'Simulando...' : 'Ejecutar Transferencia Completa'}</span>
          </button>
        </div>

        {/* Escenario 2: Camino Feliz */}
        <div className="sim-scenario-card">
          <div className="scenario-top">
            <span className="scenario-tag neutral">Pago Inmediato</span>
            <Zap size={20} className="text-amber" />
          </div>
          <h3>Pago Aprobado de Inmediato</h3>
          <p>
            Simula un pago donde la tarjeta cuenta con saldo y pasa en el primer intento:
          </p>
          <ul className="scenario-steps">
            <li>1. Preparar pago</li>
            <li>2. Enrutar a procesador</li>
            <li>3. Autorización confirmada</li>
            <li>4. Emisión de comprobante</li>
          </ul>
          <button
            type="button"
            className="btn-sim-action btn-sim-secondary"
            onClick={handleHappyPathDemo}
            disabled={isSimulating}
          >
            <Play size={16} />
            <span>{isSimulating && activeSimulationType === 'happy' ? 'Simulando...' : 'Simular Pago Inmediato'}</span>
          </button>
        </div>

        {/* Escenario 3: Rechazo */}
        <div className="sim-scenario-card">
          <div className="scenario-top">
            <span className="scenario-tag neutral">Fallo Bancario</span>
            <AlertTriangle size={20} className="text-rose" />
          </div>
          <h3>Simular Declinación Bancaria</h3>
          <p>
            Simula una tarjeta bloqueada por el banco emisor para practicar el reintento:
          </p>
          <ul className="scenario-steps">
            <li>1. Iniciar pago</li>
            <li>2. Enviar a validación</li>
            <li>3. Declinación por seguridad</li>
            <li>(Queda lista para reintentar)</li>
          </ul>
          <button
            type="button"
            className="btn-sim-action btn-sim-danger"
            onClick={handleRejectDemo}
            disabled={isSimulating}
          >
            <Play size={16} />
            <span>{isSimulating && activeSimulationType === 'reject' ? 'Simulando...' : 'Simular Declinación'}</span>
          </button>
        </div>
      </div>

      {/* Backend Infrastructure Nodes */}
      <div className="bank-nodes-status-card">
        <div className="nodes-title-row">
          <Server size={18} />
          <h4>Estado de Conexión de Servidores de Red</h4>
        </div>
        <div className="nodes-grid">
          <div className="node-box">
            <div className="node-info">
              <span className={`status-dot ${commandHealth.online ? 'online' : 'offline'}`} />
              <div>
                <strong>Servicio Transaccional (Command API)</strong>
                <span>Puerto 3000 · Procesamiento bancario en tiempo real</span>
              </div>
            </div>
            <span className={`badge-pill ${commandHealth.online ? 'healthy' : 'error'}`}>
              {commandHealth.online ? `En línea (${commandHealth.latency || 5}ms)` : 'Desconectado'}
            </span>
          </div>

          <div className="node-box">
            <div className="node-info">
              <span className={`status-dot ${historyHealth.online ? 'online' : 'offline'}`} />
              <div>
                <strong>Servicio de Extractos (History API)</strong>
                <span>Puerto 3001 · Historial y consulta de movimientos</span>
              </div>
            </div>
            <span className={`badge-pill ${historyHealth.online ? 'healthy' : 'error'}`}>
              {historyHealth.online ? `En línea (${historyHealth.latency || 5}ms)` : 'Desconectado'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
