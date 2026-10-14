import React, { useState } from 'react';
import {
  Send,
  CreditCard,
  Building2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Receipt,
  CheckCheck,
  Clock,
  User,
  Coffee,
  ShoppingBag,
  Smartphone,
  ChevronRight,
  Download,
  Wallet,
  Plus,
  Coins,
  ArrowDownUp,
  Globe,
} from 'lucide-react';
import {
  createTransaction,
  requestPayment,
  rejectPayment,
  retryPayment,
  approvePayment,
  completeTransaction,
} from '../api';
import {
  getStatusInfo,
  formatMoney,
  formatDateTime,
  CURRENCY_CONFIG,
  convertToCRC,
  getCurrencyInfo,
} from '../utils/statusHelpers';

export default function CheckoutView({
  transactions = [],
  selectedTxId,
  setSelectedTxId,
  accountBalance = 150000,
  onDeductBalance,
  onRechargeBalance,
  onOpenRecharge,
  onTransactionUpdated,
  showNotification,
}) {
  const [activeTab, setActiveTab] = useState('process'); // 'process' | 'new'

  // New Transfer Form State
  const [recipientName, setRecipientName] = useState('Juan Carlos Pérez');
  const [amount, setAmount] = useState('15000');
  const [currency, setCurrency] = useState('CRC');
  const [concept, setConcept] = useState('Pago de servicios y compras');

  // Gateway Simulation State
  const [rejectionReason, setRejectionReason] = useState('Fondos insuficientes en la cuenta');
  const [customApprovalCode, setCustomApprovalCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedTx =
    transactions.find((t) => t.transactionId === selectedTxId) || transactions[0] || null;
  const statusInfo = selectedTx ? getStatusInfo(selectedTx.status) : null;

  // Selected Transaction Multi-Currency Conversion
  const selectedTxCurrencyInfo = selectedTx ? getCurrencyInfo(selectedTx.currency) : null;
  const selectedTxCRC = selectedTx ? convertToCRC(selectedTx.amount, selectedTx.currency) : 0;
  const isTxExceeding = Boolean(selectedTx && selectedTxCRC > accountBalance);
  const txShortage = Math.max(0, selectedTxCRC - accountBalance);

  // New Transfer Form Real-Time Calculations
  const numericAmount = Number(amount) || 0;
  const currencyInfo = getCurrencyInfo(currency);
  const amountInCRC = convertToCRC(numericAmount, currency);
  const isExceedingBalance = amountInCRC > accountBalance;
  const balanceDifference = Math.max(0, amountInCRC - accountBalance);
  const remainingEstimated = Math.max(0, accountBalance - amountInCRC);

  // Presets of frequent bank transfers in multiple currencies
  const applyPreset = (type) => {
    if (type === 'sinpe') {
      setRecipientName('Carlos Méndez (SINPE Móvil)');
      setAmount('12500');
      setCurrency('CRC');
      setConcept('Cena con amigos');
    } else if (type === 'store') {
      setRecipientName('Supermercado El Rey');
      setAmount('34500');
      setCurrency('CRC');
      setConcept('Compras semanales del hogar');
    } else if (type === 'usd') {
      setRecipientName('Amazon Web Services Inc');
      setAmount('45');
      setCurrency('USD');
      setConcept('Suscripción mensual de servidores cloud');
    } else if (type === 'eur') {
      setRecipientName('Hetzner Online GmbH');
      setAmount('30');
      setCurrency('EUR');
      setConcept('Alojamiento web en servidores europeos');
    } else if (type === 'gbp') {
      setRecipientName('London Tech Licensing Ltd');
      setAmount('25');
      setCurrency('GBP');
      setConcept('Licencia anual de herramientas de desarrollo');
    }
  };

  // Submit New Transfer
  const handleCreateTransfer = async (e) => {
    e?.preventDefault();
    if (!amount || Number(amount) <= 0) {
      showNotification('error', 'Por favor ingresa un monto válido mayor a 0');
      return;
    }
    if (!recipientName.trim()) {
      showNotification('error', 'Por favor indica el beneficiario o comercio destino');
      return;
    }

    // Restriction: Cannot spend more than account balance in equivalent CRC
    if (amountInCRC > accountBalance) {
      const formattedDiff = balanceDifference.toLocaleString('es-CR', { minimumFractionDigits: 2 });
      const formattedReq = amountInCRC.toLocaleString('es-CR', { minimumFractionDigits: 2 });
      const formattedBal = accountBalance.toLocaleString('es-CR', { minimumFractionDigits: 2 });
      showNotification(
        'error',
        `⚠️ Saldo insuficiente: Deseas transferir ${formatMoney(amount, currency)} (equivalente a ₡${formattedReq} CRC), pero tu saldo disponible es ₡${formattedBal} CRC (Faltan ₡${formattedDiff} CRC). Por favor recarga tu cuenta primero.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createTransaction({
        amount: Number(amount),
        currency: currency.toUpperCase(),
        customerId: recipientName.trim(),
      });

      // Deduct funds immediately from account balance
      if (onDeductBalance) {
        onDeductBalance(amountInCRC);
      }

      const conversionNote =
        currency !== 'CRC'
          ? ` (≈ ₡${amountInCRC.toLocaleString('es-CR')} CRC debitados)`
          : '';

      showNotification(
        'success',
        `Transferencia enviada por ${formatMoney(amount, currency)}${conversionNote} para ${recipientName}`
      );
      await onTransactionUpdated(res.transactionId);
      setSelectedTxId(res.transactionId);
      setActiveTab('process');
    } catch (err) {
      showNotification('error', `Error al generar transferencia: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bank Gateway Steps
  const handleTransmitToBank = async () => {
    if (!selectedTx) return;
    setIsSubmitting(true);
    try {
      await requestPayment(selectedTx.transactionId, {
        amount: selectedTx.amount,
        expectedVersion: selectedTx.version,
      });
      showNotification('success', 'Operación transmitida a la red bancaria. Verificando saldo...');
      await onTransactionUpdated(selectedTx.transactionId);
    } catch (err) {
      showNotification('error', `Error al transmitir al banco: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveByBank = async () => {
    if (!selectedTx) return;

    // Check if amount exceeds balance in equivalent CRC
    if (selectedTxCRC > accountBalance) {
      showNotification(
        'error',
        `⚠️ No puedes autorizar este pago: El monto (${formatMoney(
          selectedTx.amount,
          selectedTx.currency
        )} ≈ ₡${selectedTxCRC.toLocaleString('es-CR')} CRC) supera tu saldo disponible en cuenta (₡${accountBalance.toLocaleString(
          'es-CR'
        )} CRC). Faltan ₡${txShortage.toLocaleString('es-CR')} CRC. Debes recargar tu cuenta o rechazar el cobro por fondos insuficientes.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const code =
        customApprovalCode.trim() || `AUTH-${Math.floor(100000 + Math.random() * 900000)}`;
      await approvePayment(selectedTx.transactionId, {
        approvalCode: code,
        expectedVersion: selectedTx.version,
      });
      showNotification('success', `¡Pago autorizado por el banco emisor! Código: ${code}`);
      setCustomApprovalCode('');
      await onTransactionUpdated(selectedTx.transactionId);
    } catch (err) {
      showNotification('error', `Error al autorizar: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectByBank = async () => {
    if (!selectedTx) return;
    setIsSubmitting(true);
    try {
      const reasonToUse = isTxExceeding
        ? `Fondos insuficientes en cuenta (Requerido: ₡${selectedTxCRC.toLocaleString('es-CR')} CRC, Disponible: ₡${accountBalance.toLocaleString('es-CR')} CRC)`
        : rejectionReason;

      await rejectPayment(selectedTx.transactionId, {
        reason: reasonToUse,
        expectedVersion: selectedTx.version,
      });

      // Reimburse funds back to account balance since payment was declined
      if (onRechargeBalance) {
        onRechargeBalance(
          selectedTxCRC,
          'Reintegro Bancario',
          `Reembolso por pago declinado a ${selectedTx.customerId} (#${selectedTx.transactionId.slice(0, 8)})`
        );
      }

      showNotification('error', `Declinación registrada por el banco. Fondos devueltos a la cuenta: +₡${selectedTxCRC.toLocaleString('es-CR')} CRC.`);
      await onTransactionUpdated(selectedTx.transactionId);
    } catch (err) {
      showNotification('error', `Error al rechazar: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetryBank = async () => {
    if (!selectedTx) return;
    const nextAttempt = (selectedTx.attemptCount || 1) + 1;
    setIsSubmitting(true);
    try {
      await retryPayment(selectedTx.transactionId, {
        attemptNumber: nextAttempt,
        expectedVersion: selectedTx.version,
      });
      showNotification(
        'success',
        `Reintentando procesamiento interbancario (Intento #${nextAttempt})...`
      );
      await onTransactionUpdated(selectedTx.transactionId);
    } catch (err) {
      showNotification('error', `Error al reintentar: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteTransfer = async () => {
    if (!selectedTx) return;

    setIsSubmitting(true);
    try {
      await completeTransaction(selectedTx.transactionId, {
        completedAt: new Date().toISOString(),
        expectedVersion: selectedTx.version,
      });

      showNotification(
        'success',
        `¡Transferencia bancaria liquidada! Comprobante emitido para ${selectedTx.customerId}.`
      );
      await onTransactionUpdated(selectedTx.transactionId);
    } catch (err) {
      showNotification('error', `Error al liquidar: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bank-checkout-container">
      {/* Top Navigation & Available Balance Banner */}
      <div className="checkout-top-status-row">
        <div className="bank-nav-pills">
          <button
            type="button"
            className={`bank-pill-btn ${activeTab === 'process' ? 'active' : ''}`}
            onClick={() => setActiveTab('process')}
          >
            <CreditCard size={17} />
            <span>Pasarela y Estado del Pago</span>
          </button>

          <button
            type="button"
            className={`bank-pill-btn ${activeTab === 'new' ? 'active' : ''}`}
            onClick={() => setActiveTab('new')}
          >
            <Send size={17} />
            <span>Hacer Nueva Transferencia</span>
          </button>
        </div>

        {/* Live Balance Card */}
        <div className="available-balance-chip">
          <div className="balance-chip-left">
            <span>Saldo Disponible:</span>
            <strong>₡{accountBalance.toLocaleString('es-CR', { minimumFractionDigits: 2 })}</strong>
          </div>
          <button
            type="button"
            className="btn-quick-recharge-chip"
            onClick={onOpenRecharge}
            title="Ir a Inicio y Cuentas para recargar saldo"
          >
            <Plus size={14} />
            <span>Recargar</span>
          </button>
        </div>
      </div>

      {/* ======================================================================
          TAB 1: PROCESAR TRANSFERENCIA ACTUAL (PASARELA)
          ====================================================================== */}
      {activeTab === 'process' && (
        <div className="bank-process-grid">
          {/* Main Card: Digital Voucher / Gateway */}
          <div className="bank-process-main">
            {!selectedTx ? (
              <div className="bank-empty-voucher">
                <CreditCard size={40} />
                <h3>No hay operaciones activas</h3>
                <p>Inicia una nueva transferencia bancaria para ver el flujo en tiempo real.</p>
                <button
                  type="button"
                  className="btn-create-transfer-now"
                  onClick={() => setActiveTab('new')}
                >
                  <Send size={16} />
                  <span>Realizar Transferencia</span>
                </button>
              </div>
            ) : (
              <div className="bank-voucher-card">
                {/* Voucher Top Bank Header */}
                <div className="voucher-bank-header">
                  <div className="voucher-brand">
                    <div className="voucher-logo-icon">
                      <Building2 size={20} />
                    </div>
                    <div>
                      <h3>PayBank Digital</h3>
                      <span>COMPROBANTE DE OPERACIÓN INTERBANCARIA</span>
                    </div>
                  </div>

                  <span
                    className="voucher-status-pill"
                    style={{
                      backgroundColor: statusInfo.bgColor,
                      color: statusInfo.color,
                      borderColor: statusInfo.borderColor,
                    }}
                  >
                    {statusInfo.bankStatus || statusInfo.label}
                  </span>
                </div>

                {/* Amount Display with Multi-Currency Conversion Info */}
                <div className="voucher-amount-box">
                  <span className="voucher-amount-label">Monto de la Operación</span>
                  <h1 className="voucher-amount-value">
                    {formatMoney(selectedTx.amount, selectedTx.currency)}
                  </h1>

                  {/* Multi-currency conversion pill if not CRC */}
                  {selectedTx.currency !== 'CRC' && (
                    <div className="voucher-conversion-pill">
                      <Coins size={14} />
                      <span>
                        Equivalente en Colones:{' '}
                        <strong>₡{selectedTxCRC.toLocaleString('es-CR', { minimumFractionDigits: 2 })} CRC</strong>
                        {' '}(T.C. 1 {selectedTx.currency} = ₡{selectedTxCurrencyInfo?.rateToCRC || 1})
                      </span>
                    </div>
                  )}

                  <span className="voucher-ref-code">
                    Ref. Bancaria: <span className="mono-code">{selectedTx.transactionId}</span>
                  </span>
                </div>

                {/* Sender & Beneficiary Row */}
                <div className="voucher-parties-row">
                  <div className="party-box">
                    <span className="party-title">CUENTA ORIGEN</span>
                    <strong>PayBank Platinum (•••• 4892)</strong>
                    <span className="party-sub">Cuenta Corriente Principal en Colones (₡)</span>
                  </div>

                  <div className="party-arrow">➔</div>

                  <div className="party-box">
                    <span className="party-title">BENEFICIARIO / DESTINO</span>
                    <strong>{selectedTx.customerId}</strong>
                    <span className="party-sub">Cuenta Externa o Comercio Receptor</span>
                  </div>
                </div>

                {/* Stepper Track */}
                <div className="bank-stepper-box">
                  <span className="stepper-section-title">Rastreo de la Compensación Bancaria:</span>
                  <div className="bank-stepper-track">
                    {/* Paso 1: Solicitud */}
                    <div className="bank-step completed">
                      <div className="bank-step-dot">1</div>
                      <span>Solicitada</span>
                    </div>
                    <div className={`bank-step-line ${selectedTx.status !== 'CREATED' ? 'completed' : ''}`} />

                    {/* Paso 2: Red Bancaria */}
                    <div
                      className={`bank-step ${
                        selectedTx.status === 'PAYMENT_PENDING'
                          ? 'current'
                          : selectedTx.status === 'PAYMENT_REJECTED'
                          ? 'rejected'
                          : selectedTx.status !== 'CREATED'
                          ? 'completed'
                          : ''
                      }`}
                    >
                      <div className="bank-step-dot">2</div>
                      <span>{selectedTx.status === 'PAYMENT_REJECTED' ? 'Declinada' : 'En Red'}</span>
                    </div>
                    <div
                      className={`bank-step-line ${
                        selectedTx.status === 'PAYMENT_APPROVED' || selectedTx.status === 'COMPLETED'
                          ? 'completed'
                          : ''
                      }`}
                    />

                    {/* Paso 3: Autorizada */}
                    <div
                      className={`bank-step ${
                        selectedTx.status === 'PAYMENT_APPROVED'
                          ? 'current'
                          : selectedTx.status === 'COMPLETED'
                          ? 'completed'
                          : ''
                      }`}
                    >
                      <div className="bank-step-dot">3</div>
                      <span>Autorizada</span>
                    </div>
                    <div className={`bank-step-line ${selectedTx.status === 'COMPLETED' ? 'completed' : ''}`} />

                    {/* Paso 4: Liquidada */}
                    <div className={`bank-step ${selectedTx.status === 'COMPLETED' ? 'completed' : ''}`}>
                      <div className="bank-step-dot">4</div>
                      <span>Liquidada</span>
                    </div>
                  </div>
                </div>

                {/* Insufficient Funds Warning Banner in Gateway */}
                {isTxExceeding && selectedTx.status !== 'COMPLETED' && (
                  <div className="insufficient-funds-banner">
                    <AlertTriangle size={20} className="text-rose" />
                    <div>
                      <strong>⚠️ Monto Supera el Saldo Disponible en Cuenta</strong>
                      <p>
                        Esta orden requiere <strong>{formatMoney(selectedTx.amount, selectedTx.currency)}</strong>
                        {selectedTx.currency !== 'CRC' && (
                          <> (equivalente a <strong>₡{selectedTxCRC.toLocaleString('es-CR')} CRC</strong>)</>
                        )}
                        , pero tu saldo actual es de <strong>₡{accountBalance.toLocaleString('es-CR')} CRC</strong>.
                        Te faltan <strong>₡{txShortage.toLocaleString('es-CR')} CRC</strong>. No es posible autorizar este pago a menos que recargues saldo o rechaces por falta de fondos.
                      </p>
                    </div>
                  </div>
                )}

                {/* Contextual Action Center */}
                <div className="bank-action-console">
                  <h4 className="console-title">Acciones de Pasarela Bancaria</h4>

                  {/* ESTADO 1: CREATED */}
                  {selectedTx.status === 'CREATED' && (
                    <div className="console-step-box">
                      <p className="console-hint">
                        La transferencia está registrada y lista para ser transmitida al procesador interbancario:
                      </p>
                      <button
                        type="button"
                        className="btn-bank-primary-action btn-transmit"
                        onClick={handleTransmitToBank}
                        disabled={isSubmitting}
                      >
                        <Send size={18} />
                        <span>🔒 Transmitir a la Red Bancaria ({formatMoney(selectedTx.amount, selectedTx.currency)})</span>
                      </button>
                    </div>
                  )}

                  {/* ESTADO 2: PAYMENT_PENDING */}
                  {selectedTx.status === 'PAYMENT_PENDING' && (
                    <div className="console-step-box">
                      <p className="console-hint">
                        La orden está en validación con el banco emisor. Simula la respuesta que devuelve la red:
                      </p>
                      <div className="gateway-decisions-grid">
                        <div className={`gateway-decision-card approve-card ${isTxExceeding ? 'card-disabled' : ''}`}>
                          <div className="decision-top">
                            <CheckCircle2 size={20} className="text-emerald" />
                            <strong>1. Fondos Suficientes</strong>
                          </div>
                          <p>
                            {isTxExceeding
                              ? `Bloqueado: Se requieren ₡${selectedTxCRC.toLocaleString('es-CR')} CRC pero solo dispones de ₡${accountBalance.toLocaleString('es-CR')} CRC.`
                              : 'El banco emisor aprueba el débito y emite el código de autorización.'}
                          </p>
                          <button
                            type="button"
                            className="btn-gateway-action btn-green"
                            onClick={handleApproveByBank}
                            disabled={isSubmitting || isTxExceeding}
                            title={isTxExceeding ? 'Saldo insuficiente en cuenta para autorizar' : 'Aprobar pago'}
                          >
                            <CheckCircle2 size={16} />
                            <span>{isTxExceeding ? '⚠️ Saldo Insuficiente' : 'Autorizar Pago'}</span>
                          </button>
                        </div>

                        <div className="gateway-decision-card reject-card">
                          <div className="decision-top">
                            <XCircle size={20} className="text-rose" />
                            <strong>2. Declinación Bancaria</strong>
                          </div>
                          <select
                            className="gateway-select"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                          >
                            <option value="Fondos insuficientes en la cuenta">Fondos insuficientes</option>
                            <option value="Tarjeta bloqueada por seguridad">Tarjeta bloqueada</option>
                            <option value="Límite diario superado">Límite diario superado</option>
                            <option value="Tarjeta vencida o CVV erróneo">Tarjeta vencida</option>
                          </select>
                          <button
                            type="button"
                            className="btn-gateway-action btn-red"
                            onClick={handleRejectByBank}
                            disabled={isSubmitting}
                          >
                            <XCircle size={16} />
                            <span>Rechazar Pago</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ESTADO 3: PAYMENT_REJECTED */}
                  {selectedTx.status === 'PAYMENT_REJECTED' && (
                    <div className="console-step-box rejected-box">
                      <div className="bank-reject-alert">
                        <AlertTriangle size={22} />
                        <div>
                          <strong>Transacción Declinada por el Banco</strong>
                          <p>Motivo: "{selectedTx.lastRejectionReason || 'Fondos insuficientes'}"</p>
                        </div>
                      </div>
                      <p className="console-hint">
                        Puedes reintentar el procesamiento bancario cuando confirmes que tienes saldo suficiente:
                      </p>
                      <button
                        type="button"
                        className="btn-bank-primary-action btn-retry"
                        onClick={handleRetryBank}
                        disabled={isSubmitting}
                      >
                        <RotateCcw size={18} />
                        <span>Reintentar Cobro (Intento #{(selectedTx.attemptCount || 1) + 1})</span>
                      </button>
                    </div>
                  )}

                  {/* ESTADO 4: PAYMENT_APPROVED */}
                  {selectedTx.status === 'PAYMENT_APPROVED' && (
                    <div className="console-step-box approved-box">
                      <div className="bank-approve-alert">
                        <CheckCheck size={24} />
                        <div>
                          <strong>¡Fondos Aprobados por el Banco!</strong>
                          <p>
                            Código de Autorización: <code>{selectedTx.approvalCode || 'AUTH-OK'}</code>
                            {selectedTx.currency !== 'CRC' && (
                              <span className="block-subtext">
                                Se debitarán ₡{selectedTxCRC.toLocaleString('es-CR')} CRC de tu saldo disponible.
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn-bank-primary-action btn-liquidate"
                        onClick={handleCompleteTransfer}
                        disabled={isSubmitting}
                      >
                        <ShieldCheck size={18} />
                        <span>
                          💳 Liquidar y Debitar ₡{selectedTxCRC.toLocaleString('es-CR')} de la Cuenta
                        </span>
                      </button>
                    </div>
                  )}

                  {/* ESTADO 5: COMPLETED */}
                  {selectedTx.status === 'COMPLETED' && (
                    <div className="console-step-box completed-box">
                      <div className="bank-completed-alert">
                        <CheckCircle2 size={24} />
                        <div>
                          <strong>Transferencia Liquidada con Éxito</strong>
                          <p>
                            Los fondos fueron debitados de la cuenta y asentados en el libro contable digital.
                            {selectedTx.currency !== 'CRC' && (
                              <span className="block-subtext">
                                Total debitado: ₡{selectedTxCRC.toLocaleString('es-CR')} CRC ({formatMoney(selectedTx.amount, selectedTx.currency)}).
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn-bank-secondary-action"
                        onClick={() => setActiveTab('new')}
                      >
                        <Send size={16} />
                        <span>Hacer Otra Transferencia</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar: Active Operations List */}
          <div className="bank-process-sidebar">
            <div className="sidebar-card">
              <h4>Operaciones Activas</h4>
              <p className="sidebar-subtext">Selecciona un movimiento para gestionar su estado:</p>

              <div className="bank-sidebar-list">
                {transactions.length === 0 ? (
                  <div className="sidebar-empty">No hay operaciones registradas</div>
                ) : (
                  transactions.slice(0, 8).map((tx) => {
                    const st = getStatusInfo(tx.status);
                    const isSelected = tx.transactionId === selectedTx?.transactionId;
                    const eqCRC = convertToCRC(tx.amount, tx.currency);
                    return (
                      <div
                        key={tx.transactionId}
                        className={`bank-sidebar-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedTxId(tx.transactionId)}
                      >
                        <div className="item-top">
                          <span className="item-name">{tx.customerId}</span>
                          <span className="item-amount">{formatMoney(tx.amount, tx.currency)}</span>
                        </div>
                        <div className="item-bottom">
                          <span
                            className="item-chip"
                            style={{
                              backgroundColor: st.bgColor,
                              color: st.color,
                              borderColor: st.borderColor,
                            }}
                          >
                            {st.bankStatus || st.shortLabel}
                          </span>
                          {tx.currency !== 'CRC' && (
                            <span className="item-crc-sub">≈ ₡{eqCRC.toLocaleString('es-CR')}</span>
                          )}
                          <span className="item-ver">v{tx.version}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================
          TAB 2: NUEVA TRANSFERENCIA BANCARIA (MULTIDIVISA CON LÍMITE ESTRICTO)
          ====================================================================== */}
      {activeTab === 'new' && (
        <div className="bank-new-transfer-wrap">
          <div className="bank-transfer-form-card">
            <div className="form-card-header">
              <Send size={22} className="text-primary-color" />
              <div>
                <h2>Enviar Dinero / Pagar</h2>
                <p>Transferencia bancaria inmediata en Colones o Divisas Extranjeras (USD, EUR, GBP)</p>
              </div>
            </div>

            {/* Account Balance Highlight Banner */}
            <div className="account-balance-notice">
              <div className="notice-left">
                <Wallet size={20} className="text-emerald" />
                <div>
                  <span className="notice-label">Saldo Disponible en tu Cuenta:</span>
                  <strong className="notice-amount">
                    ₡{accountBalance.toLocaleString('es-CR', { minimumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>
              <button
                type="button"
                className="btn-notice-recharge"
                onClick={onOpenRecharge}
              >
                + Recargar Dinero
              </button>
            </div>

            {/* Quick Beneficiaries Presets */}
            <div className="quick-contacts-row">
              <span className="contacts-label">Contactos y Servicios Frecuentes:</span>
              <button type="button" className="btn-contact-preset" onClick={() => applyPreset('sinpe')}>
                <Smartphone size={14} />
                <span>📱 SINPE (₡12.5k)</span>
              </button>
              <button type="button" className="btn-contact-preset" onClick={() => applyPreset('store')}>
                <ShoppingBag size={14} />
                <span>🛒 Supermercado (₡34.5k)</span>
              </button>
              <button type="button" className="btn-contact-preset" onClick={() => applyPreset('usd')}>
                <CreditCard size={14} />
                <span>🇺🇸 AWS Cloud ($45 USD)</span>
              </button>
              <button type="button" className="btn-contact-preset" onClick={() => applyPreset('eur')}>
                <Globe size={14} />
                <span>🇪🇺 Hetzner (€30 EUR)</span>
              </button>
              <button type="button" className="btn-contact-preset" onClick={() => applyPreset('gbp')}>
                <Coins size={14} />
                <span>🇬🇧 Software UK (£25 GBP)</span>
              </button>
            </div>

            <form onSubmit={handleCreateTransfer} className="bank-form">
              {/* Account from */}
              <div className="form-group">
                <label className="form-label">Cuenta de Origen:</label>
                <div className="bank-source-account">
                  <div className="source-icon">
                    <Building2 size={18} />
                  </div>
                  <div>
                    <strong>PayBank Platinum (•••• 4892)</strong>
                    <span>
                      Cuenta Corriente Principal en Colones · Saldo Disponible: ₡
                      {accountBalance.toLocaleString('es-CR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recipient */}
              <div className="form-group">
                <label className="form-label">Destinatario o Comercio Beneficiario:</label>
                <input
                  type="text"
                  className="bank-input"
                  placeholder="Ej: Carlos Méndez, Supermercado, Amazon, o IBAN..."
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  required
                />
              </div>

              {/* Amount and currency selector */}
              <div className="form-row-grid">
                <div className="form-group">
                  <label className="form-label">Monto a Transferir:</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    className={`bank-input input-large-amount ${
                      isExceedingBalance ? 'input-error' : ''
                    }`}
                    placeholder="15000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Moneda de Pago:</label>
                  <select
                    className="bank-input bank-select"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    {Object.values(CURRENCY_CONFIG).map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code} - {c.name} ({c.symbol}) {c.code !== 'CRC' ? `[1 ${c.code} = ₡${c.rateToCRC}]` : '(Base)'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* MULTI-CURRENCY CONVERSION & FINANCIAL CALCULATION CARD */}
              <div className="currency-conversion-card">
                <div className="conv-top-row">
                  <div className="conv-rate-pill">
                    <Coins size={14} className="text-emerald" />
                    <span>
                      Tipo de Cambio Oficial:{' '}
                      <strong>
                        1 {currency} = ₡{currencyInfo.rateToCRC.toLocaleString('es-CR', { minimumFractionDigits: 2 })} CRC
                      </strong>
                    </span>
                  </div>
                  <span className="conv-flag-badge">{currencyInfo.flag} {currency}</span>
                </div>

                <div className="conv-calc-grid">
                  <div className="conv-calc-item">
                    <span className="conv-label">Monto en {currency}:</span>
                    <strong className="conv-val">{formatMoney(numericAmount, currency)}</strong>
                  </div>

                  <div className="conv-arrow">➔</div>

                  <div className="conv-calc-item highlight-calc">
                    <span className="conv-label">A Debitar en Colones (₡):</span>
                    <strong className="conv-val text-primary font-bold">
                      ₡{amountInCRC.toLocaleString('es-CR', { minimumFractionDigits: 2 })} CRC
                    </strong>
                  </div>

                  <div className="conv-calc-item">
                    <span className="conv-label">Saldo Disponible:</span>
                    <strong className="conv-val">
                      ₡{accountBalance.toLocaleString('es-CR', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>

                  <div className="conv-calc-item">
                    <span className="conv-label">
                      {isExceedingBalance ? 'Fondos Faltantes:' : 'Saldo Restante Estimado:'}
                    </span>
                    <strong
                      className={`conv-val ${
                        isExceedingBalance ? 'text-rose font-bold' : 'text-emerald'
                      }`}
                    >
                      {isExceedingBalance
                        ? `- ₡${balanceDifference.toLocaleString('es-CR', { minimumFractionDigits: 2 })}`
                        : `₡${remainingEstimated.toLocaleString('es-CR', { minimumFractionDigits: 2 })}`}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Alert if amount exceeds balance */}
              {isExceedingBalance && (
                <div className="amount-exceeds-alert">
                  <AlertTriangle size={20} className="text-rose shrink-0" />
                  <div>
                    <strong>⚠️ Saldo Insuficiente en Cuenta</strong>
                    <p>
                      Deseas transferir <strong>{formatMoney(numericAmount, currency)}</strong>
                      {currency !== 'CRC' && (
                        <> (equivalente a <strong>₡{amountInCRC.toLocaleString('es-CR', { minimumFractionDigits: 2 })} CRC</strong>)</>
                      )}
                      , pero tu cuenta corriente solo dispone de{' '}
                      <strong>₡{accountBalance.toLocaleString('es-CR', { minimumFractionDigits: 2 })} CRC</strong>.
                      Te faltan{' '}
                      <strong>
                        ₡{balanceDifference.toLocaleString('es-CR', { minimumFractionDigits: 2 })} CRC
                      </strong>{' '}
                      para cubrir este pago. Recarga fondos antes de continuar.
                    </p>
                  </div>
                </div>
              )}

              {/* Concept */}
              <div className="form-group">
                <label className="form-label">Detalle o Motivo de la Transferencia:</label>
                <input
                  type="text"
                  className="bank-input"
                  placeholder="Ej: Pago de factura, compra de software, o servicio internacional"
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                />
              </div>

              {/* Submit Button (Strictly Disabled if Exceeding Balance) */}
              <button
                type="submit"
                className={`btn-confirm-transfer ${isExceedingBalance ? 'btn-disabled' : ''}`}
                disabled={isSubmitting || isExceedingBalance}
                title={
                  isExceedingBalance
                    ? `Saldo insuficiente. Te faltan ₡${balanceDifference.toLocaleString('es-CR')} CRC`
                    : 'Confirmar y generar transferencia'
                }
              >
                <ShieldCheck size={18} />
                <span>
                  {isExceedingBalance
                    ? `⚠️ Saldo Insuficiente (Faltan ₡${balanceDifference.toLocaleString('es-CR')})`
                    : isSubmitting
                    ? 'Procesando en Red Bancaria...'
                    : `🔒 Confirmar y Transferir ${formatMoney(numericAmount, currency)}${
                        currency !== 'CRC'
                          ? ` (Debita ₡${amountInCRC.toLocaleString('es-CR')})`
                          : ''
                      }`}
                </span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
