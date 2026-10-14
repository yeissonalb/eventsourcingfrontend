import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  Send,
  Eye,
  EyeOff,
  Receipt,
  Sparkles,
  ShieldCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Building2,
  Smartphone,
  Lock,
  PlusCircle,
  Zap,
  Plus,
  X,
  Wallet,
  RotateCcw,
  History,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  getStatusInfo,
  formatMoney,
  formatDateTime,
  convertToCRC,
  getCurrencyInfo,
} from '../utils/statusHelpers';

export default function OverviewView({
  transactions = [],
  accountBalance = 150000,
  rechargeHistory = [],
  onRechargeBalance,
  onResetBalance,
  onSelectTransaction,
  onOpenCheckout,
  onOpenSimulator,
  onOpenTransactions,
}) {
  const [showBalance, setShowBalance] = useState(true);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('50000');
  const [rechargeMethod, setRechargeMethod] = useState('SINPE Móvil');
  const [rechargeNote, setRechargeNote] = useState('Abono a cuenta');
  const [movementFilter, setMovementFilter] = useState('all'); // 'all' | 'transfers' | 'recharges'

  // Financial statistics calculated in Colones (CRC)
  const completedList = transactions.filter((t) => t.status === 'COMPLETED' || t.status === 'PAYMENT_APPROVED');
  const pendingList = transactions.filter((t) => t.status === 'PAYMENT_PENDING' || t.status === 'CREATED');
  const rejectedList = transactions.filter((t) => t.status === 'PAYMENT_REJECTED');

  // Sum of all outgoing money (Salidas de dinero)
  const totalDebitedCRC = transactions
    .filter((t) => t.status !== 'PAYMENT_REJECTED')
    .reduce((acc, tx) => acc + convertToCRC(tx.amount, tx.currency), 0);

  // Sum of in-flight pending money
  const pendingSalesCRC = pendingList.reduce(
    (acc, tx) => acc + convertToCRC(tx.amount, tx.currency),
    0
  );

  // Sum of all incoming money (Ingresos / Recargas)
  const totalRechargedCRC = rechargeHistory.reduce(
    (acc, r) => acc + (Number(r.amount) || 0),
    0
  );

  // Quick 1-click recharge preset
  const handleApplyPreset = (amt) => {
    setRechargeAmount(amt.toString());
  };

  const handleQuickAdd = (amt) => {
    if (onRechargeBalance) {
      onRechargeBalance(amt, 'Recarga Rápida', `Acreditación directa de ₡${amt.toLocaleString('es-CR')}`);
    }
  };

  const handleConfirmRecharge = (e) => {
    e.preventDefault();
    if (!rechargeAmount || Number(rechargeAmount) <= 0) return;
    const ok = onRechargeBalance(rechargeAmount, rechargeMethod, rechargeNote);
    if (ok) {
      setShowRechargeModal(false);
    }
  };

  // Build unified chronologically sorted movements list
  const unifiedMovements = useMemo(() => {
    const list = [];
    const seenTxIds = new Set();
    const seenRecharges = [];

    // Map outgoing transactions (Salidas de dinero / Pagos)
    if (movementFilter === 'all' || movementFilter === 'transfers') {
      transactions.forEach((tx) => {
        if (!seenTxIds.has(tx.transactionId)) {
          seenTxIds.add(tx.transactionId);
          const eqCRC = convertToCRC(tx.amount, tx.currency);
          list.push({
            id: tx.transactionId,
            type: 'transfer',
            direction: 'out', // Salida de dinero
            title: `Pago a ${tx.customerId || 'Destinatario'}`,
            subtitle: `Ref: ${tx.transactionId.slice(0, 18)}...`,
            rawDate: tx.createdAt || new Date().toISOString(),
            amount: Number(tx.amount) || 0,
            amountCRC: eqCRC,
            currency: tx.currency || 'CRC',
            status: tx.status,
            approvalCode: tx.approvalCode,
            rejectionReason: tx.lastRejectionReason,
            originalTx: tx,
          });
        }
      });
    }

    // Map incoming recharges (Ingresos de dinero / Acreditaciones)
    if (movementFilter === 'all' || movementFilter === 'recharges') {
      rechargeHistory.forEach((r) => {
        const isDuplicate = seenRecharges.some((prev) => {
          if (prev.id === r.id) return true;
          const diff = Math.abs(new Date(prev.timestamp).getTime() - new Date(r.timestamp).getTime());
          return diff < 4000 && Number(prev.amount) === Number(r.amount);
        });

        if (!isDuplicate) {
          seenRecharges.push(r);
          list.push({
            id: r.id,
            type: 'recharge',
            direction: 'in', // Entrada de dinero
            title: `Depósito Acreditado (${r.method || 'Recarga'})`,
            subtitle: r.note || 'Ingreso de fondos a la cuenta',
            rawDate: r.timestamp || new Date().toISOString(),
            amount: Number(r.amount) || 0,
            amountCRC: Number(r.amount) || 0,
            currency: 'CRC',
            status: 'COMPLETED',
            balanceAfter: r.balanceAfter,
          });
        }
      });
    }

    // Sort descending by date
    list.sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());
    return list;
  }, [transactions, rechargeHistory, movementFilter]);

  const isAccountFunded = accountBalance > 0;

  return (
    <div className="bank-overview-container">
      {/* ======================================================================
          SECCIÓN PRINCIPAL: CUENTA CORRIENTE & TARJETA PLATINUM
          ====================================================================== */}
      <div className="bank-hero-section">
        {/* Left: Interactive Virtual Card */}
        <div className="bank-card-container">
          <div className="virtual-debit-card">
            <div className="card-top-row">
              <div className="card-chip-wrap">
                <div className="emv-chip" />
                <span className="contactless-icon">))))</span>
              </div>
              <span className="card-bank-brand">PayBank Platinum</span>
            </div>

            <div className="card-number-row">
              <span>••••</span>
              <span>••••</span>
              <span>••••</span>
              <span>4892</span>
            </div>

            <div className="card-bottom-row">
              <div className="card-holder-col">
                <span className="card-label">TITULAR DE LA CUENTA</span>
                <strong className="card-val">USUARIO PAYBANK / CUENTA CORRIENTE</strong>
              </div>
              <div className="card-expiry-col">
                <span className="card-label">EXPIRA</span>
                <strong className="card-val">10/28</strong>
              </div>
              <div className="card-network-badge">
                <span className="circle-red" />
                <span className="circle-orange" />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Apartado de Cuenta Corriente Principal */}
        <div className="bank-balance-card">
          <div className="balance-header">
            <div className="balance-title-wrap">
              <Building2 size={18} className="text-muted-foreground" />
              <div>
                <span className="account-type-title">Cuenta Corriente Principal (CRC ₡)</span>
                <span className="account-iban-sub">IBAN: CR05 0102 0000 9876 5432 10</span>
              </div>
            </div>
            <div className="balance-header-actions">
              <span className={`account-status-badge ${isAccountFunded ? 'status-active' : 'status-empty'}`}>
                <span className="status-dot-active" />
                {isAccountFunded ? 'Activa & con Fondos' : 'Sin Fondos Disponibles'}
              </span>

              <button
                type="button"
                className="btn-toggle-balance"
                onClick={() => setShowBalance(!showBalance)}
                title={showBalance ? 'Ocultar saldos' : 'Mostrar saldos'}
              >
                {showBalance ? <EyeOff size={15} /> : <Eye size={15} />}
                <span>{showBalance ? 'Ocultar' : 'Mostrar'}</span>
              </button>
            </div>
          </div>

          <div className="balance-amount-display">
            <div className="balance-main-row">
              <div className="balance-number-box">
                <span className="balance-number-label">SALDO DISPONIBLE EN CUENTA</span>
                {showBalance ? (
                  <h1 className="balance-big-number">
                    ₡{accountBalance.toLocaleString('es-CR', { minimumFractionDigits: 2 })}
                  </h1>
                ) : (
                  <h1 className="balance-big-number">••••••••••</h1>
                )}
              </div>

              {/* Botones de Recarga */}
              <div className="balance-action-buttons-group">
                <button
                  type="button"
                  className="btn-recharge-balance"
                  onClick={() => setShowRechargeModal(true)}
                  title="Ingresar fondos a la cuenta"
                >
                  <Plus size={16} strokeWidth={2.5} />
                  <span>Recargar Saldo</span>
                </button>

                {onResetBalance && (
                  <button
                    type="button"
                    className="btn-reset-balance"
                    onClick={() => onResetBalance(150000)}
                    title="Restablecer saldo a ₡150,000"
                  >
                    <RotateCcw size={14} />
                    <span>Reiniciar Saldo</span>
                  </button>
                )}
              </div>
            </div>

            {/* Chips de Recarga Rápida */}
            <div className="quick-recharge-presets-row">
              <span className="quick-recharge-label">Recarga Inmediata (+):</span>
              <button
                type="button"
                className="btn-quick-chip"
                onClick={() => handleQuickAdd(25000)}
                title="Acreditar ₡25,000"
              >
                +₡25k
              </button>
              <button
                type="button"
                className="btn-quick-chip"
                onClick={() => handleQuickAdd(50000)}
                title="Acreditar ₡50,000"
              >
                +₡50k
              </button>
              <button
                type="button"
                className="btn-quick-chip"
                onClick={() => handleQuickAdd(100000)}
                title="Acreditar ₡100,000"
              >
                +₡100k
              </button>
              <button
                type="button"
                className="btn-quick-chip"
                onClick={() => handleQuickAdd(250000)}
                title="Acreditar ₡250,000"
              >
                +₡250k
              </button>
              <button
                type="button"
                className="btn-quick-chip highlight"
                onClick={() => setShowRechargeModal(true)}
              >
                Otro Monto...
              </button>
            </div>

            {/* Regla de Fondos */}
            <div className="balance-badges-row">
              <div className="balance-rule-box">
                <Lock size={14} className="text-emerald" />
                <strong>Regla de Cuenta:</strong> Solo podrás transferir o pagar montos dentro del límite de este saldo disponible (₡{accountBalance.toLocaleString('es-CR')}). Pagos superiores se bloquearán automáticamente.
              </div>
            </div>
          </div>

          {/* Secondary stats row: ENTRADAS Y SALIDAS DE DINERO */}
          <div className="balance-substats-row">
            <div className="substat-item">
              <span className="substat-label">
                <TrendingDown size={14} className="text-rose inline-icon" /> Salidas Totales / Pagos:
              </span>
              <strong className="substat-value text-rose font-bold">
                {showBalance ? `- ₡${totalDebitedCRC.toLocaleString('es-CR', { minimumFractionDigits: 2 })}` : '••••'}
              </strong>
            </div>

            <div className="substat-item">
              <span className="substat-label">
                <TrendingUp size={14} className="text-emerald inline-icon" /> Ingresos / Recargas:
              </span>
              <strong className="substat-value text-emerald font-bold">
                {showBalance ? `+ ₡${totalRechargedCRC.toLocaleString('es-CR', { minimumFractionDigits: 2 })}` : '••••'}
              </strong>
            </div>

            <div className="substat-item">
              <span className="substat-label">En Tránsito / Por Procesar:</span>
              <strong className="substat-value text-amber">
                {showBalance ? `₡${pendingSalesCRC.toLocaleString('es-CR', { minimumFractionDigits: 2 })}` : '••••'}
              </strong>
            </div>
          </div>

          {/* Quick Bank Action Buttons */}
          <div className="bank-quick-actions-bar">
            <button type="button" className="bank-action-btn primary" onClick={onOpenCheckout}>
              <div className="action-icon-circle">
                <Send size={18} />
              </div>
              <span>Enviar Dinero / Pagar</span>
            </button>

            <button type="button" className="bank-action-btn" onClick={() => setShowRechargeModal(true)}>
              <div className="action-icon-circle">
                <Wallet size={18} />
              </div>
              <span>Ingresar Fondos</span>
            </button>

            <button type="button" className="bank-action-btn" onClick={onOpenSimulator}>
              <div className="action-icon-circle">
                <Zap size={18} />
              </div>
              <span>Simular Red</span>
            </button>

            {onOpenTransactions && (
              <button type="button" className="bank-action-btn" onClick={onOpenTransactions}>
                <div className="action-icon-circle">
                  <History size={18} />
                </div>
                <span>Ver Extracto</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================================
          APARTADO DE MOVIMIENTOS DENTRO DE INICIO Y CUENTAS
          (Salidas y Entradas reflejadas claramente)
          ====================================================================== */}
      <div className="bank-movements-section">
        <div className="movements-header">
          <div className="movements-header-info">
            <div className="movements-title-badge">
              <Receipt size={18} />
              <h3>Apartado de Movimientos de la Cuenta</h3>
            </div>
            <p>Historial en tiempo real de salidas de dinero, pagos con tarjeta y abonos de fondos</p>
          </div>

          {/* Filtros de Movimientos */}
          <div className="movements-filter-toolbar">
            <div className="movements-filter-tabs">
              <button
                type="button"
                className={`filter-tab-btn ${movementFilter === 'all' ? 'active' : ''}`}
                onClick={() => setMovementFilter('all')}
              >
                Todos ({transactions.length + rechargeHistory.length})
              </button>

              <button
                type="button"
                className={`filter-tab-btn filter-tab-out ${movementFilter === 'transfers' ? 'active' : ''}`}
                onClick={() => setMovementFilter('transfers')}
              >
                🔴 Salidas / Pagos ({transactions.length})
              </button>

              <button
                type="button"
                className={`filter-tab-btn filter-tab-in ${movementFilter === 'recharges' ? 'active' : ''}`}
                onClick={() => setMovementFilter('recharges')}
              >
                🟢 Ingresos / Recargas ({rechargeHistory.length})
              </button>
            </div>

            <button type="button" className="btn-new-movement" onClick={onOpenCheckout}>
              <PlusCircle size={15} />
              <span>Nueva Transferencia</span>
            </button>
          </div>
        </div>

        {/* Lista de Movimientos Unificada */}
        {unifiedMovements.length === 0 ? (
          <div className="empty-movements-card">
            <CreditCard size={42} />
            <h4>Aún no hay movimientos registrados en esta cuenta</h4>
            <p>Realiza tu primera transferencia o recarga tu saldo para comenzar a ver tus movimientos en tiempo real.</p>
            <div className="empty-actions-row">
              <button type="button" className="btn-first-movement" onClick={onOpenCheckout}>
                <Send size={15} />
                <span>Enviar Primer Pago</span>
              </button>
              <button
                type="button"
                className="btn-first-recharge"
                onClick={() => setShowRechargeModal(true)}
              >
                <Plus size={15} />
                <span>Recargar Fondos</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="movements-list-card">
            {unifiedMovements.map((item) => {
              const isRecharge = item.type === 'recharge';
              const st = !isRecharge && item.originalTx ? getStatusInfo(item.status) : null;
              const isCompleted = item.status === 'COMPLETED';
              const isApproved = item.status === 'PAYMENT_APPROVED';
              const isRejected = item.status === 'PAYMENT_REJECTED';
              const isPending = item.status === 'PAYMENT_PENDING' || item.status === 'CREATED';

              return (
                <div
                  key={item.id}
                  className={`movement-item-row ${
                    isRecharge ? 'movement-recharge-row' : 'movement-outgoing-row'
                  }`}
                  onClick={() => {
                    if (!isRecharge && onSelectTransaction) {
                      onSelectTransaction(item.id);
                    }
                  }}
                  title={isRecharge ? 'Abono acreditado' : 'Clic para ver comprobante bancario oficial'}
                >
                  {/* Left Icon: Rojo para salida, Verde para entrada */}
                  <div
                    className={`movement-icon-bubble ${
                      isRecharge
                        ? 'credit'
                        : isRejected
                        ? 'rejected'
                        : 'debit-out'
                    }`}
                  >
                    {isRecharge ? (
                      <ArrowDownLeft size={18} className="text-emerald" />
                    ) : isRejected ? (
                      <AlertTriangle size={18} className="text-rose" />
                    ) : (
                      <ArrowUpRight size={18} className="text-rose" />
                    )}
                  </div>

                  {/* Middle Info */}
                  <div className="movement-details-col">
                    <div className="movement-dest-name">
                      <strong>{item.title}</strong>
                      {isRecharge ? (
                        <span className="bank-status-chip chip-credit">
                          <CheckCircle2 size={12} />
                          <span>INGRESO ACREDITADO</span>
                        </span>
                      ) : isRejected ? (
                        <span className="bank-status-chip chip-rejected">
                          <AlertTriangle size={12} />
                          <span>PAGO RECHAZADO (FONDOS DEVUELTOS)</span>
                        </span>
                      ) : (
                        <span className="bank-status-chip chip-outgoing">
                          <ArrowUpRight size={12} />
                          <span>SALIDA DE DINERO · {st?.bankStatus || st?.label}</span>
                        </span>
                      )}
                    </div>

                    <div className="movement-subtext">
                      <span>{item.subtitle}</span>
                      <span className="movement-date-dot">•</span>
                      <span>{formatDateTime(item.rawDate)}</span>
                      {item.approvalCode && (
                        <span className="auth-code-pill">Aut: {item.approvalCode}</span>
                      )}
                      {item.rejectionReason && (
                        <span className="rejected-reason-pill">{item.rejectionReason}</span>
                      )}
                      {!isRecharge && item.currency !== 'CRC' && (
                        <span className="balance-after-pill">
                          Debitado: ₡{item.amountCRC.toLocaleString('es-CR')} CRC
                        </span>
                      )}
                      {isRecharge && item.balanceAfter !== undefined && (
                        <span className="balance-after-pill">
                          Saldo: ₡{item.balanceAfter.toLocaleString('es-CR')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Amount & Voucher action */}
                  <div className="movement-amount-col">
                    <strong
                      className={`movement-amount ${
                        isRecharge
                          ? 'text-credit-amount'
                          : isRejected
                          ? 'text-rejected'
                          : 'text-debit-amount font-bold'
                      }`}
                    >
                      {isRecharge ? '+' : '-'}
                      {formatMoney(item.amount, item.currency)}
                    </strong>

                    {!isRecharge ? (
                      <button type="button" className="btn-view-voucher">
                        <span>Ver Comprobante</span>
                        <ChevronRight size={14} />
                      </button>
                    ) : (
                      <span className="recharge-badge-check">
                        <CheckCircle2 size={13} />
                        <span>Acreditado</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Security Guarantee Banner */}
      <div className="bank-security-bar">
        <div className="security-icon-badge">
          <Lock size={16} />
        </div>
        <div className="security-text">
          <strong>Transacciones Bancarias Seguras:</strong> Todos tus pagos y recargas cuentan con verificación de saldo en tiempo real, protección de fondos y emisión de comprobantes digitales válidos.
        </div>
      </div>

      {/* ======================================================================
          MODAL DE RECARGA MANUAL DE DINERO
          ====================================================================== */}
      {showRechargeModal && (
        <div className="modal-backdrop" onClick={() => setShowRechargeModal(false)}>
          <div className="modal-recharge-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <div className="modal-icon-bubble">
                  <Wallet size={20} />
                </div>
                <div>
                  <h3>Ingresar Fondos a la Cuenta</h3>
                  <span>Aumenta tu saldo disponible para realizar pagos y transferencias</span>
                </div>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setShowRechargeModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmRecharge} className="modal-form">
              {/* Current balance indicator */}
              <div className="modal-current-balance">
                <span>Saldo disponible actual:</span>
                <strong>₡{accountBalance.toLocaleString('es-CR', { minimumFractionDigits: 2 })}</strong>
              </div>

              {/* Quick Preset Buttons */}
              <div className="form-group">
                <label className="form-label">Selecciona un monto rápido:</label>
                <div className="recharge-presets-grid">
                  {[10000, 25000, 50000, 100000, 250000, 500000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      className={`btn-recharge-preset ${rechargeAmount === amt.toString() ? 'active' : ''}`}
                      onClick={() => handleApplyPreset(amt)}
                    >
                      + ₡{amt.toLocaleString('es-CR')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Amount */}
              <div className="form-group">
                <label className="form-label">Monto a Recargar (₡ CRC):</label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  className="bank-input input-recharge-big"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  placeholder="50000"
                  required
                />
              </div>

              {/* Method */}
              <div className="form-group">
                <label className="form-label">Método de Recarga:</label>
                <select
                  className="bank-input bank-select"
                  value={rechargeMethod}
                  onChange={(e) => setRechargeMethod(e.target.value)}
                >
                  <option value="SINPE Móvil">📱 SINPE Móvil Inmediato</option>
                  <option value="Transferencia Externa">🏦 Transferencia Interbancaria (IBAN)</option>
                  <option value="Tarjeta de Débito Externa">💳 Tarjeta Externa (Visa / Mastercard)</option>
                  <option value="Depósito en Cajero ATM">💵 Depósito en Efectivo / ATM</option>
                </select>
              </div>

              {/* Note */}
              <div className="form-group">
                <label className="form-label">Referencia / Detalle:</label>
                <input
                  type="text"
                  className="bank-input"
                  value={rechargeNote}
                  onChange={(e) => setRechargeNote(e.target.value)}
                  placeholder="Ej: Depósito de nómina o ingreso de fondos"
                />
              </div>

              <div className="modal-actions-row">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setShowRechargeModal(false)}
                >
                  Cancelar
                </button>

                <button type="submit" className="btn-modal-confirm">
                  <CheckCircle2 size={16} />
                  <span>Acreditar +₡{Number(rechargeAmount || 0).toLocaleString('es-CR')} Ahora</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
