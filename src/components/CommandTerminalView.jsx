import React, { useState } from 'react';
import {
  PlusCircle,
  ArrowRightLeft,
  Play,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  Terminal,
  Trash2,
  CreditCard,
  CheckCheck,
} from 'lucide-react';
import {
  createTransaction,
  requestPayment,
  rejectPayment,
  retryPayment,
  approvePayment,
  completeTransaction,
} from '../api';

export default function CommandTerminalView({
  transactions,
  selectedTxId,
  setSelectedTxId,
  onTransactionUpdated,
  showNotification,
  commandHealth,
}) {
  const [activeMode, setActiveMode] = useState('create'); // 'create' | 'transition'

  // New Transaction State
  const [amount, setAmount] = useState('15000');
  const [currency, setCurrency] = useState('CRC');
  const [customerId, setCustomerId] = useState('cliente-demo');
  const [customTxId, setCustomTxId] = useState('');

  // Transition State
  const [paymentAmount, setPaymentAmount] = useState('');
  const [approvalCode, setApprovalCode] = useState('');
  const [rejectionReason, setRejectionReason] = useState('Fondos insuficientes en la cuenta');
  const [customExpectedVersion] = useState('');
  const [overrideVersion] = useState(false);

  // Loading & Execution Log State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState([]);

  const addConsoleLog = (action, status, details) => {
    const time = new Date().toLocaleTimeString();
    setConsoleLogs((prev) => [
      { time, action, status, details },
      ...prev.slice(0, 20),
    ]);
  };

  const selectedTx = transactions.find((t) => t.transactionId === selectedTxId) || transactions[0] || null;

  // Presets
  const applyPreset = (presetName) => {
    if (presetName === 'retail') {
      setAmount('12500');
      setCurrency('CRC');
      setCustomerId('cliente-tienda-cr');
    } else if (presetName === 'corporate') {
      setAmount('3500');
      setCurrency('USD');
      setCustomerId('empresa-corporativa');
    } else if (presetName === 'micro') {
      setAmount('1000');
      setCurrency('CRC');
      setCustomerId('usuario-app-movil');
    }
  };

  // Generate UUID
  const handleGenerateUUID = () => {
    const uuid = crypto.randomUUID ? crypto.randomUUID() : `tx-${Date.now()}`;
    setCustomTxId(uuid);
  };

  // Execute Create Transaction
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      showNotification('error', 'El monto debe ser un valor positivo mayor a 0');
      return;
    }
    if (!customerId.trim()) {
      showNotification('error', 'El identificador del cliente no puede estar vacío');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createTransaction({
        amount: Number(amount),
        currency,
        customerId,
        transactionId: customTxId.trim() || undefined,
      });

      addConsoleLog('Evento Guardado: TransactionCreated (Paso 1)', 'EXITO', `Transacción iniciada con ID: ${res.transactionId}`);
      showNotification('success', `Evento TransactionCreated guardado en el archivo (v1)`);
      setCustomTxId('');
      await onTransactionUpdated(res.transactionId);
      setActiveMode('transition');
    } catch (err) {
      addConsoleLog('Error al Crear', 'ERROR', err.message);
      showNotification('error', `Error al registrar transacción: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Execute State Transitions
  const handleExecuteTransition = async (actionType) => {
    if (!selectedTx) return;

    const versionToUse = overrideVersion && customExpectedVersion
      ? Number(customExpectedVersion)
      : selectedTx.version;

    setIsSubmitting(true);
    try {
      let res;
      if (actionType === 'REQUEST_PAYMENT') {
        const amt = paymentAmount ? Number(paymentAmount) : selectedTx.amount;
        res = await requestPayment(selectedTx.transactionId, {
          amount: amt,
          expectedVersion: versionToUse,
        });
        addConsoleLog(`Evento Guardado: PaymentRequested (v${res.version})`, 'EXITO', `Cobro solicitado por ${amt} ${selectedTx.currency}`);
        showNotification('success', `Evento PaymentRequested registrado (v${res.version})`);
      } else if (actionType === 'APPROVE_PAYMENT') {
        const code = approvalCode.trim() || `AUTH-${Math.floor(100000 + Math.random() * 900000)}`;
        res = await approvePayment(selectedTx.transactionId, {
          approvalCode: code,
          expectedVersion: versionToUse,
        });
        addConsoleLog(`Evento Guardado: PaymentApproved (v${res.version})`, 'EXITO', `Pago aprobado con código ${code}`);
        showNotification('success', `Evento PaymentApproved registrado (v${res.version})`);
        setApprovalCode('');
      } else if (actionType === 'REJECT_PAYMENT') {
        if (!rejectionReason.trim()) {
          showNotification('error', 'Debe especificar el motivo del rechazo');
          setIsSubmitting(false);
          return;
        }
        res = await rejectPayment(selectedTx.transactionId, {
          reason: rejectionReason.trim(),
          expectedVersion: versionToUse,
        });
        addConsoleLog(`Evento Guardado: PaymentRejected (v${res.version})`, 'EXITO', `Rechazo bancario: ${rejectionReason}`);
        showNotification('success', `Evento PaymentRejected registrado (v${res.version})`);
      } else if (actionType === 'RETRY_PAYMENT') {
        const nextAttempt = (selectedTx.attemptCount || 0) + 1;
        res = await retryPayment(selectedTx.transactionId, {
          attemptNumber: nextAttempt,
          expectedVersion: versionToUse,
        });
        addConsoleLog(`Evento Guardado: PaymentRetried (v${res.version})`, 'EXITO', `Reintento automático #${nextAttempt}`);
        showNotification('success', `Evento PaymentRetried registrado (v${res.version})`);
      } else if (actionType === 'COMPLETE_TRANSACTION') {
        res = await completeTransaction(selectedTx.transactionId, {
          completedAt: new Date().toISOString(),
          expectedVersion: versionToUse,
        });
        addConsoleLog(`Evento Guardado: TransactionCompleted (v${res.version})`, 'EXITO', `Transacción finalizada con éxito`);
        showNotification('success', `Evento TransactionCompleted registrado (v${res.version})`);
      }

      await onTransactionUpdated(selectedTx.transactionId);
    } catch (err) {
      addConsoleLog(`Regla de Negocio no permitida (${actionType})`, 'ERROR', err.message);
      showNotification('error', `Aviso: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="terminal-view-container">
      {/* Mode Switcher */}
      <div className="terminal-nav-bar">
        <button
          type="button"
          className={`terminal-nav-tab ${activeMode === 'create' ? 'active' : ''}`}
          onClick={() => setActiveMode('create')}
        >
          <PlusCircle size={15} />
          <span>1. Iniciar Nuevo Pago (TransactionCreated)</span>
        </button>
        <button
          type="button"
          className={`terminal-nav-tab ${activeMode === 'transition' ? 'active' : ''}`}
          onClick={() => setActiveMode('transition')}
        >
          <ArrowRightLeft size={15} />
          <span>2. Continuar el Proceso (Aprobar, Rechazar o Reintentar)</span>
        </button>
      </div>

      <div className="terminal-split-layout">
        {/* Left Form Box */}
        <div className="terminal-form-card">
          {activeMode === 'create' ? (
            <div className="command-form-body">
              <div className="form-legend-header">
                <h3>Paso 1: Iniciar la Transacción</h3>
                <p>Escribe el primer evento (<code>TransactionCreated</code>) en el archivo inmutable.</p>
              </div>

              {/* Presets */}
              <div className="presets-bar">
                <span className="presets-label">Datos rápidos:</span>
                <button type="button" className="btn-preset" onClick={() => applyPreset('retail')}>Compras Retail CRC</button>
                <button type="button" className="btn-preset" onClick={() => applyPreset('corporate')}>Pago Corporativo USD</button>
                <button type="button" className="btn-preset" onClick={() => applyPreset('micro')}>Pago Móvil CRC</button>
              </div>

              <form onSubmit={handleCreate} className="form-vertical">
                <div className="form-grid-2">
                  <div className="form-field">
                    <label htmlFor="termAmount">Monto a pagar *</label>
                    <input
                      id="termAmount"
                      type="number"
                      step="any"
                      className="input-control font-mono"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Ej. 15000"
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="termCurrency">Moneda *</label>
                    <select
                      id="termCurrency"
                      className="select-custom"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                    >
                      <option value="CRC">CRC - Colones Costarricenses</option>
                      <option value="USD">USD - Dólares Estadounidenses</option>
                      <option value="EUR">EUR - Euros</option>
                    </select>
                  </div>
                </div>

                <div className="form-field">
                  <label htmlFor="termCustomerId">Nombre o ID del Cliente *</label>
                  <input
                    id="termCustomerId"
                    type="text"
                    className="input-control"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    placeholder="Ej. cliente-ana"
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="termCustomId">ID de Transacción (Opcional)</label>
                  <div className="input-group-btn">
                    <input
                      id="termCustomId"
                      type="text"
                      className="input-control font-mono"
                      value={customTxId}
                      onChange={(e) => setCustomTxId(e.target.value)}
                      placeholder="Se genera automáticamente si se deja en blanco"
                    />
                    <button
                      type="button"
                      className="btn-action-outline"
                      onClick={handleGenerateUUID}
                    >
                      Generar UUID
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-command-execute"
                  disabled={isSubmitting || !commandHealth.online}
                >
                  <Play size={15} fill="currentColor" />
                  <span>{isSubmitting ? 'Guardando evento...' : 'Guardar Evento: TransactionCreated (v1)'}</span>
                </button>
              </form>
            </div>
          ) : (
            /* Mode Transition Form */
            <div className="command-form-body">
              <div className="form-legend-header">
                <h3>Avanzar el Ciclo de Vida del Pago</h3>
                <p>Las reglas de Event Sourcing impiden saltarse pasos (ej. no se puede completar sin aprobar primero).</p>
              </div>

              {/* Transaction Picker */}
              <div className="form-field">
                <label htmlFor="termSelectTx">Seleccionar pago a continuar:</label>
                <select
                  id="termSelectTx"
                  className="select-custom font-mono"
                  value={selectedTx?.transactionId || ''}
                  onChange={(e) => setSelectedTxId(e.target.value)}
                >
                  {transactions.map((t) => (
                    <option key={t.transactionId} value={t.transactionId}>
                      {t.transactionId} — {t.status} (v{t.version}) [{t.amount} {t.currency}]
                    </option>
                  ))}
                </select>
              </div>

              {selectedTx ? (
                <div className="transition-controls-area">
                  <div className="selected-tx-summary-banner">
                    <div className="summary-left">
                      <span className={`status-pill status-${selectedTx.status}`}>
                        {selectedTx.status}
                      </span>
                      <span className="tag-version">Eventos: {selectedTx.version}</span>
                    </div>
                    <div className="summary-right">
                      <strong>{selectedTx.amount.toLocaleString()} {selectedTx.currency}</strong>
                      <span className="text-dim">Cliente: {selectedTx.customerId}</span>
                    </div>
                  </div>

                  {/* Contextual Action Forms */}
                  {selectedTx.status === 'CREATED' && (
                    <div className="command-action-box">
                      <h4>Paso 2: Solicitar el Cobro al Banco (PaymentRequested)</h4>
                      <p className="text-xs text-muted">
                        Registra que se envió la solicitud de cobro. El monto debe ser el mismo de la transacción original.
                      </p>
                      <div className="form-field">
                        <label htmlFor="termReqAmount">Monto a cobrar ({selectedTx.currency}):</label>
                        <input
                          id="termReqAmount"
                          type="number"
                          className="input-control font-mono"
                          value={paymentAmount || selectedTx.amount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        className="btn-command-execute"
                        onClick={() => handleExecuteTransition('REQUEST_PAYMENT')}
                        disabled={isSubmitting}
                      >
                        <CreditCard size={15} />
                        <span>Emitir Evento: PaymentRequested</span>
                      </button>
                    </div>
                  )}

                  {selectedTx.status === 'PAYMENT_PENDING' && (
                    <div className="command-action-box">
                      <h4>Paso 3: Respuesta del Banco (Aprobación o Rechazo)</h4>
                      <p className="text-xs text-muted">
                        Simula lo que responde el procesador bancario. Puedes aprobar con código o rechazar con motivo.
                      </p>
                      <div className="form-field">
                        <label htmlFor="termApprovalCode">Código de Autorización (si se aprueba):</label>
                        <div className="input-group-btn">
                          <input
                            id="termApprovalCode"
                            type="text"
                            className="input-control font-mono"
                            value={approvalCode}
                            onChange={(e) => setApprovalCode(e.target.value)}
                            placeholder="AUTH-982143"
                          />
                          <button
                            type="button"
                            className="btn-action-outline"
                            onClick={() => setApprovalCode(`AUTH-${Math.floor(100000 + Math.random() * 900000)}`)}
                          >
                            <Sparkles size={13} />
                            <span>Generar Código</span>
                          </button>
                        </div>
                      </div>

                      <div className="form-field">
                        <label htmlFor="termRejectionReason">Motivo de Rechazo (si no pasa el pago):</label>
                        <input
                          id="termRejectionReason"
                          type="text"
                          className="input-control"
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Fondos insuficientes..."
                        />
                      </div>

                      <div className="dual-action-buttons">
                        <button
                          type="button"
                          className="btn-decision-approve"
                          onClick={() => handleExecuteTransition('APPROVE_PAYMENT')}
                          disabled={isSubmitting}
                        >
                          <CheckCircle2 size={15} />
                          <span>Aprobar Pago (PaymentApproved)</span>
                        </button>
                        <button
                          type="button"
                          className="btn-decision-reject"
                          onClick={() => handleExecuteTransition('REJECT_PAYMENT')}
                          disabled={isSubmitting}
                        >
                          <XCircle size={15} />
                          <span>Rechazar Pago (PaymentRejected)</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedTx.status === 'PAYMENT_REJECTED' && (
                    <div className="command-action-box">
                      <h4>Paso 4: Reintentar el Pago (PaymentRetried)</h4>
                      <div className="rejection-notice-box">
                        <strong>Motivo del rechazo registrado:</strong>
                        <p>{selectedTx.lastRejectionReason || 'No especificado'}</p>
                      </div>
                      <p className="text-xs text-muted">
                        Al reintentar, el sistema incrementa automáticamente el contador al intento #{(selectedTx.attemptCount || 0) + 1}.
                      </p>
                      <button
                        type="button"
                        className="btn-decision-retry"
                        onClick={() => handleExecuteTransition('RETRY_PAYMENT')}
                        disabled={isSubmitting}
                      >
                        <RotateCcw size={15} />
                        <span>Reintentar Cobro (Intento #{(selectedTx.attemptCount || 0) + 1})</span>
                      </button>
                    </div>
                  )}

                  {selectedTx.status === 'PAYMENT_APPROVED' && (
                    <div className="command-action-box">
                      <h4>Paso 5: Finalizar Operación (TransactionCompleted)</h4>
                      <p className="text-xs text-success font-semibold">
                        El pago fue aprobado exitosamente con código: <strong>{selectedTx.approvalCode}</strong>.
                      </p>
                      <button
                        type="button"
                        className="btn-decision-complete"
                        onClick={() => handleExecuteTransition('COMPLETE_TRANSACTION')}
                        disabled={isSubmitting}
                      >
                        <CheckCheck size={15} />
                        <span>Cerrar Transacción (TransactionCompleted)</span>
                      </button>
                    </div>
                  )}

                  {selectedTx.status === 'COMPLETED' && (
                    <div className="completed-state-card">
                      <CheckCheck size={28} className="text-emerald-600" />
                      <h4>Transacción Finalizada con Éxito</h4>
                      <p>Ha completado todo su ciclo auditable. No admite más eventos porque es un estado terminal.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="empty-selection-placeholder">
                  No hay transacciones registradas. Crea una primero con el botón superior.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Output Terminal */}
        <div className="terminal-console-card">
          <div className="console-header">
            <div className="console-title-group">
              <Terminal size={15} className="text-zinc-600" />
              <span className="console-title">Bitácora de Eventos Guardados</span>
            </div>
            <button
              type="button"
              className="btn-clear-console"
              onClick={() => setConsoleLogs([])}
            >
              <Trash2 size={13} />
              <span>Limpiar</span>
            </button>
          </div>

          <div className="console-body">
            {consoleLogs.length === 0 ? (
              <div className="console-idle">
                <p>&gt; Esperando acciones...</p>
                <p>&gt; Cada vez que ejecutas un paso, el <strong>Servicio de Escritura (Puerto 3000)</strong> agrega un evento inmutable a <code>data/event-store.jsonl</code>.</p>
                <p>&gt; Este panel te ayuda a ver qué evento se emitió para explicárselo al profesor.</p>
              </div>
            ) : (
              consoleLogs.map((log, index) => (
                <div key={index} className={`console-line ${log.status.toLowerCase()}`}>
                  <span className="log-time">[{log.time}]</span>
                  <span className={`log-badge badge-${log.status.toLowerCase()}`}>{log.status}</span>
                  <span className="log-action">{log.action}</span>
                  <div className="log-detail">{log.details}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
