import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  CheckCheck,
  CreditCard,
  AlertTriangle,
  Sparkles,
  Download,
  Share2,
  Lock,
  Send,
  Printer,
} from 'lucide-react';
import {
  getTransactionHistoryState,
  getTransactionHistoryEvents,
  requestPayment,
  approvePayment,
  rejectPayment,
  retryPayment,
  completeTransaction,
} from '../api';
import { getStatusInfo, getEventNarrative, formatMoney, formatDateTime, convertToCRC } from '../utils/statusHelpers';

export default function TransactionDrawer({
  transactionId,
  accountBalance = 150000,
  onDeductBalance,
  onClose,
  onTransactionUpdated,
  showNotification,
  isTechnicalMode,
}) {
  const [txState, setTxState] = useState(null);
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('Fondos insuficientes en la cuenta');
  const [activeTab, setActiveTab] = useState('voucher'); // 'voucher' | 'actions' | 'audit'

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
        }
      })
      .catch((err) => {
        console.error('Error fetching transaction drawer:', err);
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

  const statusInfo = txState ? getStatusInfo(txState.status) : null;

  // Actions
  const handleRequestPayment = async () => {
    setIsSubmitting(true);
    try {
      await requestPayment(transactionId, {
        amount: txState.amount,
        expectedVersion: txState.version,
      });
      showNotification('success', 'Operación enviada a la red bancaria.');
      await reloadData();
    } catch (err) {
      showNotification('error', `Error al transmitir: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprovePayment = async () => {
    if (!txState) return;

    // Multi-currency check against account balance
    const txCRC = convertToCRC(txState.amount, txState.currency);
    if (txCRC > accountBalance) {
      const diff = txCRC - accountBalance;
      showNotification(
        'error',
        `⚠️ Saldo insuficiente: Esta operación requiere ${formatMoney(txState.amount, txState.currency)} (≈ ₡${txCRC.toLocaleString('es-CR')} CRC), pero tu saldo es ₡${accountBalance.toLocaleString('es-CR')} CRC (Faltan ₡${diff.toLocaleString('es-CR')} CRC).`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const code = `AUTH-${Math.floor(100000 + Math.random() * 900000)}`;
      await approvePayment(transactionId, {
        approvalCode: code,
        expectedVersion: txState.version,
      });
      showNotification('success', `¡Pago autorizado por el banco! Código: ${code}`);
      await reloadData();
    } catch (err) {
      showNotification('error', `Error al autorizar: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectPayment = async () => {
    setIsSubmitting(true);
    try {
      await rejectPayment(transactionId, {
        reason: rejectionReason,
        expectedVersion: txState.version,
      });
      showNotification('error', `Declinación registrada: ${rejectionReason}`);
      await reloadData();
    } catch (err) {
      showNotification('error', `Error al rechazar: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetryPayment = async () => {
    setIsSubmitting(true);
    try {
      const nextAttempt = (txState.attemptCount || 1) + 1;
      await retryPayment(transactionId, {
        attemptNumber: nextAttempt,
        expectedVersion: txState.version,
      });
      showNotification('success', `Reintentando cobro (Intento #${nextAttempt})...`);
      await reloadData();
    } catch (err) {
      showNotification('error', `Error al reintentar: ${err.message}`);
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

      // Deduct equivalent CRC from account balance
      const txCRC = convertToCRC(txState.amount, txState.currency);
      if (onDeductBalance) {
        onDeductBalance(txCRC);
      }

      showNotification('success', `¡Transferencia bancaria liquidada! Se debitaron ₡${txCRC.toLocaleString('es-CR')} CRC (${formatMoney(txState.amount, txState.currency)}).`);
      await reloadData();
    } catch (err) {
      showNotification('error', `Error al liquidar: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintVoucher = () => {
    window.print();
  };

  if (!transactionId) return null;

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="bank-voucher-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="voucher-drawer-header">
          <div className="header-brand-block">
            <Building2 size={20} className="text-emerald" />
            <div>
              <h3>Comprobante Bancario Digital</h3>
              <span>PayBank Transferencia Segura</span>
            </div>
          </div>

          <button type="button" className="btn-close-voucher" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="voucher-loading">
            <div className="spinner-dot" />
            <span>Consultando datos del comprobante...</span>
          </div>
        ) : !txState ? (
          <div className="voucher-error">No se encontró la información del movimiento.</div>
        ) : (
          <div className="voucher-scroll-body">
            {/* Nav tabs inside drawer */}
            <div className="voucher-tabs-bar">
              <button
                type="button"
                className={`v-tab-btn ${activeTab === 'voucher' ? 'active' : ''}`}
                onClick={() => setActiveTab('voucher')}
              >
                <span>Comprobante Oficial</span>
              </button>
              <button
                type="button"
                className={`v-tab-btn ${activeTab === 'actions' ? 'active' : ''}`}
                onClick={() => setActiveTab('actions')}
              >
                <span>Gestión de Pasarela</span>
              </button>
              <button
                type="button"
                className={`v-tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
                onClick={() => setActiveTab('audit')}
              >
                <span>Trazabilidad ({events.length})</span>
              </button>
            </div>

            {/* TAB 1: COMPROBANTE OFICIAL (VOUCHER TICKET) */}
            {activeTab === 'voucher' && (
              <div className="voucher-ticket-wrap">
                <div className="ticket-paper">
                  {/* Watermark / Logo */}
                  <div className="ticket-top-badge">
                    <span
                      className="ticket-status-pill"
                      style={{ backgroundColor: statusInfo.bgColor, color: statusInfo.color }}
                    >
                      {statusInfo.bankStatus || statusInfo.label}
                    </span>
                  </div>

                  <div className="ticket-amount-header">
                    <span className="ticket-amount-label">Monto Transferido</span>
                    <h2 className="ticket-amount-number">
                      {formatMoney(txState.amount, txState.currency)}
                    </h2>
                  </div>

                  {/* Divider line */}
                  <div className="ticket-zigzag-divider" />

                  {/* Details grid */}
                  <div className="ticket-details-grid">
                    <div className="ticket-row">
                      <span className="row-label">Beneficiario:</span>
                      <strong className="row-value">{txState.customerId}</strong>
                    </div>

                    <div className="ticket-row">
                      <span className="row-label">Cuenta de Origen:</span>
                      <span className="row-value">PayBank Platinum (•••• 4892)</span>
                    </div>

                    <div className="ticket-row">
                      <span className="row-label">Referencia Bancaria:</span>
                      <span className="row-value mono-val">{transactionId}</span>
                    </div>

                    {txState.approvalCode && (
                      <div className="ticket-row highlight-row">
                        <span className="row-label">Código de Autorización:</span>
                        <strong className="row-value text-emerald">{txState.approvalCode}</strong>
                      </div>
                    )}

                    {txState.lastRejectionReason && (
                      <div className="ticket-row reject-row">
                        <span className="row-label">Motivo de Declinación:</span>
                        <strong className="row-value text-rose">{txState.lastRejectionReason}</strong>
                      </div>
                    )}

                    <div className="ticket-row">
                      <span className="row-label">Intentos de Cobro:</span>
                      <span className="row-value">{txState.attemptCount || 1} intento(s)</span>
                    </div>
                  </div>

                  {/* Bottom Security Slogan */}
                  <div className="ticket-security-note">
                    <Lock size={13} />
                    <span>Transacción respaldada por firma digital auditable (Event Sourcing)</span>
                  </div>
                </div>

                <div className="voucher-footer-actions">
                  <button type="button" className="btn-print-voucher" onClick={handlePrintVoucher}>
                    <Printer size={15} />
                    <span>Imprimir Comprobante</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: GESTIÓN DE PASARELA (ACCIONES) */}
            {activeTab === 'actions' && (
              <div className="voucher-actions-panel">
                <div className="status-tip-box" style={{ backgroundColor: statusInfo.bgColor, borderColor: statusInfo.borderColor }}>
                  <strong style={{ color: statusInfo.color }}>{statusInfo.description}</strong>
                  <p>{statusInfo.nextActionAdvice}</p>
                </div>

                {txState.status === 'CREATED' && (
                  <button
                    type="button"
                    className="btn-voucher-action btn-transmit"
                    onClick={handleRequestPayment}
                    disabled={isSubmitting}
                  >
                    <Send size={16} />
                    <span>Transmitir a la Red Bancaria</span>
                  </button>
                )}

                {txState.status === 'PAYMENT_PENDING' && (
                  <div className="action-pending-group">
                    <button
                      type="button"
                      className="btn-voucher-action btn-approve"
                      onClick={handleApprovePayment}
                      disabled={isSubmitting}
                    >
                      <CheckCircle2 size={16} />
                      <span>✅ Aprobar Débito Bancario</span>
                    </button>

                    <div className="reject-select-group">
                      <label>Motivo de la declinación:</label>
                      <select
                        className="v-reject-select"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                      >
                        <option value="Fondos insuficientes en la cuenta">Fondos insuficientes</option>
                        <option value="Tarjeta bloqueada por seguridad">Tarjeta bloqueada</option>
                        <option value="Límite diario superado">Límite superado</option>
                        <option value="Tarjeta vencida">Tarjeta vencida</option>
                      </select>
                      <button
                        type="button"
                        className="btn-voucher-action btn-reject"
                        onClick={handleRejectPayment}
                        disabled={isSubmitting}
                      >
                        <XCircle size={16} />
                        <span>❌ Declinación Bancaria</span>
                      </button>
                    </div>
                  </div>
                )}

                {txState.status === 'PAYMENT_REJECTED' && (
                  <button
                    type="button"
                    className="btn-voucher-action btn-retry"
                    onClick={handleRetryPayment}
                    disabled={isSubmitting}
                  >
                    <RotateCcw size={16} />
                    <span>🔁 Reintentar Cobro (Intento #{(txState.attemptCount || 1) + 1})</span>
                  </button>
                )}

                {txState.status === 'PAYMENT_APPROVED' && (
                  <button
                    type="button"
                    className="btn-voucher-action btn-settle"
                    onClick={handleCompleteTransaction}
                    disabled={isSubmitting}
                  >
                    <CheckCheck size={16} />
                    <span>🧾 Asentar y Liquidar Fondos</span>
                  </button>
                )}

                {txState.status === 'COMPLETED' && (
                  <div className="v-completed-notice">
                    <Sparkles size={24} className="text-emerald" />
                    <strong>¡Operación Liquidada con Éxito!</strong>
                    <p>Esta transferencia está asentada permanentemente.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: TRAZABILIDAD (AUDITORÍA HISTÓRICA) */}
            {activeTab === 'audit' && (
              <div className="voucher-audit-list">
                {events.map((evt, idx) => {
                  const narrative = getEventNarrative(evt, txState);
                  return (
                    <div key={idx} className="audit-item-row">
                      <div className="audit-item-header">
                        <span className="audit-title" style={{ color: narrative.color }}>
                          {narrative.title}
                        </span>
                        <span className="audit-date">{formatDateTime(evt.occurredAt)}</span>
                      </div>
                      <p className="audit-text">{narrative.story}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
