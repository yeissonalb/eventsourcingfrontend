import React, { useState, useEffect } from 'react';
import {
  getTransactionHistoryState,
  getTransactionHistoryEvents,
  requestPayment,
  approvePayment,
  rejectPayment,
  retryPayment,
  completeTransaction,
} from '../api';

export default function TransactionDrawer({
  transactionId,
  onClose,
  onTransactionUpdated,
  showNotification,
}) {
  const [txState, setTxState] = useState(null);
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'actions' | 'events'

  // Action form inputs
  const [paymentAmount, setPaymentAmount] = useState('');
  const [approvalCode, setApprovalCode] = useState('');
  const [rejectionReason, setRejectionReason] = useState('Fondos insuficientes');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!transactionId) return;

    let isMounted = true;
    setIsLoading(true);

    Promise.all([
      getTransactionHistoryState(transactionId),
      getTransactionHistoryEvents(transactionId),
    ])
      .then(([stateData, eventsData]) => {
        if (isMounted) {
          setTxState(stateData);
          setEvents(eventsData || []);
          if (stateData?.amount) {
            setPaymentAmount(stateData.amount.toString());
          }
        }
      })
      .catch((err) => {
        console.error('Error in drawer fetch:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [transactionId]);

  const reloadData = async () => {
    setIsLoading(true);
    try {
      const [stateData, eventsData] = await Promise.all([
        getTransactionHistoryState(transactionId),
        getTransactionHistoryEvents(transactionId),
      ]);
      setTxState(stateData);
      setEvents(eventsData || []);
      await onTransactionUpdated(transactionId);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Actions
  const handleRequestPayment = async () => {
    setIsSubmitting(true);
    try {
      await requestPayment(transactionId, {
        amount: paymentAmount ? Number(paymentAmount) : txState.amount,
        expectedVersion: txState.version,
      });
      showNotification('success', 'Pago solicitado exitosamente (PaymentRequested)');
      await reloadData();
    } catch (err) {
      showNotification('error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprovePayment = async () => {
    setIsSubmitting(true);
    try {
      const code = approvalCode.trim() || `AUTH-${Math.floor(100000 + Math.random() * 900000)}`;
      await approvePayment(transactionId, {
        approvalCode: code,
        expectedVersion: txState.version,
      });
      showNotification('success', `Pago aprobado con código ${code}`);
      await reloadData();
    } catch (err) {
      showNotification('error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectPayment = async () => {
    if (!rejectionReason.trim()) {
      showNotification('error', 'Debe especificar el motivo del rechazo');
      return;
    }
    setIsSubmitting(true);
    try {
      await rejectPayment(transactionId, {
        reason: rejectionReason.trim(),
        expectedVersion: txState.version,
      });
      showNotification('success', 'Pago rechazado exitosamente (PaymentRejected)');
      await reloadData();
    } catch (err) {
      showNotification('error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetryPayment = async () => {
    setIsSubmitting(true);
    try {
      const nextAttempt = (txState.attemptCount || 0) + 1;
      await retryPayment(transactionId, {
        attemptNumber: nextAttempt,
        expectedVersion: txState.version,
      });
      showNotification('success', `Reintento #${nextAttempt} registrado (PaymentRetried)`);
      await reloadData();
    } catch (err) {
      showNotification('error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteTransaction = async () => {
    setIsSubmitting(true);
    try {
      await completeTransaction(transactionId, {
        completedAt: new Date().toISOString(),
        expectedVersion: txState.version,
      });
      showNotification('success', 'Transacción completada exitosamente (TransactionCompleted)');
      await reloadData();
    } catch (err) {
      showNotification('error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!transactionId) return null;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="drawer-header">
          <div className="drawer-title-group">
            <span className="drawer-badge">Detalle de Agregado</span>
            <h3>{transactionId}</h3>
          </div>
          <button type="button" className="btn-drawer-close" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Drawer Tabs */}
        <div className="drawer-tabs">
          <button
            type="button"
            className={`drawer-tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveTab('summary')}
          >
            Estado Reconstruido
          </button>
          <button
            type="button"
            className={`drawer-tab-btn ${activeTab === 'actions' ? 'active' : ''}`}
            onClick={() => setActiveTab('actions')}
          >
            Transiciones de Ciclo
          </button>
          <button
            type="button"
            className={`drawer-tab-btn ${activeTab === 'events' ? 'active' : ''}`}
            onClick={() => setActiveTab('events')}
          >
            Eventos ({events.length})
          </button>
        </div>

        {/* Drawer Body */}
        <div className="drawer-body">
          {isLoading ? (
            <div className="drawer-loading">Consultando Event Store...</div>
          ) : !txState ? (
            <div className="drawer-error">No se pudo cargar la transacción.</div>
          ) : activeTab === 'summary' ? (
            <div className="drawer-summary-content">
              <div className="drawer-status-hero">
                <span className={`status-pill status-${txState.status}`}>
                  {txState.status}
                </span>
                <span className="tag-version">Versión actual: v{txState.version}</span>
              </div>

              <div className="summary-fields-grid">
                <div className="summary-field">
                  <span className="field-lbl">Monto Total</span>
                  <span className="field-val highlight">
                    {Number(txState.amount).toLocaleString('es-CR', { minimumFractionDigits: 2 })} {txState.currency}
                  </span>
                </div>
                <div className="summary-field">
                  <span className="field-lbl">Cliente</span>
                  <span className="field-val font-mono">{txState.customerId}</span>
                </div>
                <div className="summary-field">
                  <span className="field-lbl">Intentos de Pago</span>
                  <span className="field-val">{txState.attemptCount || 0}</span>
                </div>
                <div className="summary-field">
                  <span className="field-lbl">Código de Aprobación</span>
                  <span className="field-val font-mono text-success">
                    {txState.approvalCode || 'Pendiente'}
                  </span>
                </div>
                {txState.lastRejectionReason && (
                  <div className="summary-field col-span-2">
                    <span className="field-lbl">Último Rechazo</span>
                    <span className="field-val text-danger">{txState.lastRejectionReason}</span>
                  </div>
                )}
                {txState.completedAt && (
                  <div className="summary-field col-span-2">
                    <span className="field-lbl">Completado En</span>
                    <span className="field-val text-dim text-xs">
                      {new Date(txState.completedAt).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="drawer-callout-info">
                <h4>Replay Determinista</h4>
                <p>
                  Esta información se reconstruye ejecutando los {events.length} eventos del log append-only en memoria. No depende de una tabla mutada en SQL.
                </p>
              </div>
            </div>
          ) : activeTab === 'actions' ? (
            <div className="drawer-actions-content">
              {txState.status === 'CREATED' && (
                <div className="drawer-action-card">
                  <h4>1. Solicitar Cobro</h4>
                  <p className="text-xs text-muted">Avanza a PAYMENT_PENDING.</p>
                  <div className="form-field">
                    <label htmlFor="drawerPayAmt">Monto a cobrar:</label>
                    <input
                      id="drawerPayAmt"
                      type="number"
                      className="input-control font-mono"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn-command-execute"
                    onClick={handleRequestPayment}
                    disabled={isSubmitting}
                  >
                    Solicitar Cobro
                  </button>
                </div>
              )}

              {txState.status === 'PAYMENT_PENDING' && (
                <div className="drawer-action-card">
                  <h4>2. Resolución de Cobro</h4>
                  <div className="form-field">
                    <label htmlFor="drawerAuthCode">Código de Autorización (para Aprobar):</label>
                    <input
                      id="drawerAuthCode"
                      type="text"
                      className="input-control font-mono"
                      value={approvalCode}
                      onChange={(e) => setApprovalCode(e.target.value)}
                      placeholder="AUTH-982143"
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="drawerRejReason">Motivo (para Rechazar):</label>
                    <input
                      id="drawerRejReason"
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
                      onClick={handleApprovePayment}
                      disabled={isSubmitting}
                    >
                      Aprobar
                    </button>
                    <button
                      type="button"
                      className="btn-decision-reject"
                      onClick={handleRejectPayment}
                      disabled={isSubmitting}
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              )}

              {txState.status === 'PAYMENT_REJECTED' && (
                <div className="drawer-action-card">
                  <h4>3. Reintentar Cobro</h4>
                  <p className="text-xs text-muted">Avanza nuevamente a PAYMENT_PENDING incrementando el intento.</p>
                  <button
                    type="button"
                    className="btn-decision-retry"
                    onClick={handleRetryPayment}
                    disabled={isSubmitting}
                  >
                    Reintentar (Intento #{(txState.attemptCount || 0) + 1})
                  </button>
                </div>
              )}

              {txState.status === 'PAYMENT_APPROVED' && (
                <div className="drawer-action-card">
                  <h4>4. Completar Operación</h4>
                  <button
                    type="button"
                    className="btn-decision-complete"
                    onClick={handleCompleteTransaction}
                    disabled={isSubmitting}
                  >
                    Cerrar Transacción (COMPLETED)
                  </button>
                </div>
              )}

              {txState.status === 'COMPLETED' && (
                <div className="completed-state-card">
                  <div className="completed-check-icon">✓</div>
                  <h4>Transacción Cerrada</h4>
                  <p>Estado terminal. Auditoría completada con éxito.</p>
                </div>
              )}
            </div>
          ) : (
            /* Events Tab */
            <div className="drawer-events-timeline">
              {events.map((evt) => (
                <div key={evt.version} className="mini-event-row">
                  <div className="mini-event-meta">
                    <span className="tag-version">v{evt.version}</span>
                    <span className="mini-event-type">{evt.type}</span>
                    <span className="mini-event-time">
                      {new Date(evt.occurredAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <pre className="mini-event-json">
                    {JSON.stringify(evt.data, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
