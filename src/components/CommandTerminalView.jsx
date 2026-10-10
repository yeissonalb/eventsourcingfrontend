import React, { useState } from 'react';
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
  const [customerId, setCustomerId] = useState('cliente-alpha');
  const [customTxId, setCustomTxId] = useState('');

  // Transition State
  const [paymentAmount, setPaymentAmount] = useState('');
  const [approvalCode, setApprovalCode] = useState('');
  const [rejectionReason, setRejectionReason] = useState('Fondos insuficientes en la cuenta');
  const [customExpectedVersion, setCustomExpectedVersion] = useState('');
  const [overrideVersion, setOverrideVersion] = useState(false);

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
      setCustomerId('cliente-tienda-01');
    } else if (presetName === 'corporate') {
      setAmount('2500');
      setCurrency('USD');
      setCustomerId('empresa-corporativa');
    } else if (presetName === 'micro') {
      setAmount('500');
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
      showNotification('error', 'El Customer ID no puede estar vacío');
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

      addConsoleLog('POST /transactions (TransactionCreated)', 'SUCCESS', `Agregado v1 creado con ID: ${res.transactionId}`);
      showNotification('success', `Comando TransactionCreated ejecutado exitosamente (v1)`);
      setCustomTxId('');
      await onTransactionUpdated(res.transactionId);
      setActiveMode('transition');
    } catch (err) {
      addConsoleLog('POST /transactions', 'ERROR', err.message);
      showNotification('error', `Error al crear transacción: ${err.message}`);
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
        addConsoleLog(`POST /transactions/${selectedTx.transactionId}/request-payment`, 'SUCCESS', `PaymentRequested registrado (v${res.version})`);
        showNotification('success', `Evento PaymentRequested registrado (v${res.version})`);
      } else if (actionType === 'APPROVE_PAYMENT') {
        const code = approvalCode.trim() || `AUTH-${Math.floor(100000 + Math.random() * 900000)}`;
        res = await approvePayment(selectedTx.transactionId, {
          approvalCode: code,
          expectedVersion: versionToUse,
        });
        addConsoleLog(`POST /transactions/${selectedTx.transactionId}/approve-payment`, 'SUCCESS', `PaymentApproved registrado (v${res.version}) con código ${code}`);
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
        addConsoleLog(`POST /transactions/${selectedTx.transactionId}/reject-payment`, 'SUCCESS', `PaymentRejected registrado (v${res.version}). Motivo: ${rejectionReason}`);
        showNotification('success', `Evento PaymentRejected registrado (v${res.version})`);
      } else if (actionType === 'RETRY_PAYMENT') {
        const nextAttempt = (selectedTx.attemptCount || 0) + 1;
        res = await retryPayment(selectedTx.transactionId, {
          attemptNumber: nextAttempt,
          expectedVersion: versionToUse,
        });
        addConsoleLog(`POST /transactions/${selectedTx.transactionId}/retry-payment`, 'SUCCESS', `PaymentRetried registrado (v${res.version}). Intento #${nextAttempt}`);
        showNotification('success', `Evento PaymentRetried registrado (v${res.version})`);
      } else if (actionType === 'COMPLETE_TRANSACTION') {
        res = await completeTransaction(selectedTx.transactionId, {
          completedAt: new Date().toISOString(),
          expectedVersion: versionToUse,
        });
        addConsoleLog(`POST /transactions/${selectedTx.transactionId}/complete`, 'SUCCESS', `TransactionCompleted registrado (v${res.version}). Transacción cerrada.`);
        showNotification('success', `Evento TransactionCompleted registrado (v${res.version})`);
      }

      await onTransactionUpdated(selectedTx.transactionId);
    } catch (err) {
      addConsoleLog(`COMMAND ERROR (${actionType})`, 'ERROR', err.message);
      showNotification('error', `Violación de regla o error: ${err.message}`);
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
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          1. Crear Nueva Transacción (TransactionCreated)
        </button>
        <button
          type="button"
          className={`terminal-nav-tab ${activeMode === 'transition' ? 'active' : ''}`}
          onClick={() => setActiveMode('transition')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          2. Despachar Comandos de Ciclo de Vida (State Transitions)
        </button>
      </div>

      <div className="terminal-split-layout">
        {/* Left Form Box */}
        <div className="terminal-form-card">
          {activeMode === 'create' ? (
            <div className="command-form-body">
              <div className="form-legend-header">
                <h3>Registro de Transacción (Versión 1)</h3>
                <p>Escribe el evento append-only <code>TransactionCreated</code> en el Command Service (:3000).</p>
              </div>

              {/* Presets */}
              <div className="presets-bar">
                <span className="presets-label">Plantillas Rápidas:</span>
                <button type="button" className="btn-preset" onClick={() => applyPreset('retail')}>Retail CRC</button>
                <button type="button" className="btn-preset" onClick={() => applyPreset('corporate')}>Corporativo USD</button>
                <button type="button" className="btn-preset" onClick={() => applyPreset('micro')}>Micro CRC</button>
              </div>

              <form onSubmit={handleCreate} className="form-vertical">
                <div className="form-grid-2">
                  <div className="form-field">
                    <label htmlFor="termAmount">Monto de la Transacción *</label>
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
                    <label htmlFor="termCurrency">Moneda (ISO 4217) *</label>
                    <select
                      id="termCurrency"
                      className="input-control"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                    >
                      <option value="CRC">CRC - Colón Costarricense</option>
                      <option value="USD">USD - Dólar Estadounidense</option>
                      <option value="EUR">EUR - Euro</option>
                    </select>
                  </div>
                </div>

                <div className="form-field">
                  <label htmlFor="termCustomerId">Identificador del Cliente (customerId) *</label>
                  <input
                    id="termCustomerId"
                    type="text"
                    className="input-control font-mono"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    placeholder="cliente-456"
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="termCustomId">ID de Transacción Personalizado (UUID opcional)</label>
                  <div className="input-group-btn">
                    <input
                      id="termCustomId"
                      type="text"
                      className="input-control font-mono"
                      value={customTxId}
                      onChange={(e) => setCustomTxId(e.target.value)}
                      placeholder="Autogenerar UUID si se deja vacío..."
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
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  {isSubmitting ? 'Registrando en Event Store...' : 'Emitir Comando POST /transactions'}
                </button>
              </form>
            </div>
          ) : (
            /* Mode Transition Form */
            <div className="command-form-body">
              <div className="form-legend-header">
                <h3>Operaciones de Ciclo de Vida</h3>
                <p>Aplica comandos según el estado y valida el bloqueo optimista de versiones.</p>
              </div>

              {/* Transaction Picker */}
              <div className="form-field">
                <label htmlFor="termSelectTx">Seleccionar Transacción a Operar:</label>
                <select
                  id="termSelectTx"
                  className="input-control font-mono"
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
                      <span className="tag-version">Versión actual: v{selectedTx.version}</span>
                    </div>
                    <div className="summary-right">
                      <strong>{selectedTx.amount.toLocaleString()} {selectedTx.currency}</strong>
                      <span className="text-dim">Cliente: {selectedTx.customerId}</span>
                    </div>
                  </div>

                  {/* Optimistic Concurrency Controls */}
                  <div className="concurrency-section">
                    <div className="concurrency-header">
                      <span className="concurrency-title">Control de Concurrencia Optimista (expectedVersion)</span>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={overrideVersion}
                          onChange={(e) => setOverrideVersion(e.target.checked)}
                        />
                        Simular conflicto de versión (Testing 409)
                      </label>
                    </div>
                    {overrideVersion && (
                      <div className="override-input-box">
                        <label htmlFor="customVersionInput">expectedVersion manual:</label>
                        <input
                          id="customVersionInput"
                          type="number"
                          className="input-control font-mono"
                          value={customExpectedVersion}
                          onChange={(e) => setCustomExpectedVersion(e.target.value)}
                          placeholder={`Versión actual es ${selectedTx.version}`}
                        />
                        <span className="text-xs text-dim">
                          Envía un número diferente a {selectedTx.version} para verificar el rechazo HTTP 409 Conflict.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Contextual Action Forms */}
                  {selectedTx.status === 'CREATED' && (
                    <div className="command-action-box">
                      <h4>Comando: Solicitar Cobro (PaymentRequested)</h4>
                      <p className="text-xs text-muted">Avanza el estado de CREATED a PAYMENT_PENDING.</p>
                      <div className="form-field">
                        <label htmlFor="termReqAmount">Monto a cobrar (debe coincidir con la transacción):</label>
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
                        Despachar PaymentRequested
                      </button>
                    </div>
                  )}

                  {selectedTx.status === 'PAYMENT_PENDING' && (
                    <div className="command-action-box">
                      <h4>Resolución de Pago Pendiente</h4>
                      <div className="form-field">
                        <label htmlFor="termApprovalCode">Código de Autorización (para Aprobar):</label>
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
                            Generar Auth
                          </button>
                        </div>
                      </div>

                      <div className="form-field">
                        <label htmlFor="termRejectionReason">Motivo de Rechazo (para Rechazar):</label>
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
                          ✓ Aprobar Pago (PaymentApproved)
                        </button>
                        <button
                          type="button"
                          className="btn-decision-reject"
                          onClick={() => handleExecuteTransition('REJECT_PAYMENT')}
                          disabled={isSubmitting}
                        >
                          ✕ Rechazar Pago (PaymentRejected)
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedTx.status === 'PAYMENT_REJECTED' && (
                    <div className="command-action-box">
                      <h4>Reintento de Pago (PaymentRetried)</h4>
                      <div className="rejection-notice-box">
                        <strong>Motivo del rechazo anterior:</strong>
                        <p>{selectedTx.lastRejectionReason || 'No especificado'}</p>
                      </div>
                      <p className="text-xs text-muted">
                        El backend calculará de manera auditable el intento #{(selectedTx.attemptCount || 0) + 1}.
                      </p>
                      <button
                        type="button"
                        className="btn-decision-retry"
                        onClick={() => handleExecuteTransition('RETRY_PAYMENT')}
                        disabled={isSubmitting}
                      >
                        ↻ Registrar Reintento (Intento #{(selectedTx.attemptCount || 0) + 1})
                      </button>
                    </div>
                  )}

                  {selectedTx.status === 'PAYMENT_APPROVED' && (
                    <div className="command-action-box">
                      <h4>Cierre de Transacción (TransactionCompleted)</h4>
                      <p className="text-xs text-success">
                        El pago fue aprobado exitosamente con código <strong>{selectedTx.approvalCode}</strong>.
                      </p>
                      <button
                        type="button"
                        className="btn-decision-complete"
                        onClick={() => handleExecuteTransition('COMPLETE_TRANSACTION')}
                        disabled={isSubmitting}
                      >
                        ✓ Cerrar Transacción (COMPLETED)
                      </button>
                    </div>
                  )}

                  {selectedTx.status === 'COMPLETED' && (
                    <div className="completed-state-card">
                      <div className="completed-check-icon">✓</div>
                      <h4>Transacción en Estado Terminal</h4>
                      <p>El ciclo de vida ha concluido con éxito. Ningún otro evento puede anexarse a este agregado.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="empty-selection-placeholder">
                  No hay transacciones disponibles para operar. Crea una nueva primero.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Console Output Terminal */}
        <div className="terminal-console-card">
          <div className="console-header">
            <div className="console-title-group">
              <span className="console-dot-group">
                <span className="dot dot-red" />
                <span className="dot dot-yellow" />
                <span className="dot dot-green" />
              </span>
              <span className="console-title">Live CQRS Command Execution Console</span>
            </div>
            <button
              type="button"
              className="btn-clear-console"
              onClick={() => setConsoleLogs([])}
            >
              Limpiar
            </button>
          </div>

          <div className="console-body">
            {consoleLogs.length === 0 ? (
              <div className="console-idle">
                <p>&gt; Esperando emisión de comandos CQRS...</p>
                <p>&gt; Los comandos son enviados a <strong>http://localhost:3000</strong></p>
                <p>&gt; Las reglas de dominio validan inmutabilidad y orden estricto de eventos.</p>
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
