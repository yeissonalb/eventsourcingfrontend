import React, { useState, useMemo } from 'react';
import {
  Download,
  ArrowRight,
  PlusCircle,
  Search,
  X,
  CreditCard,
  FileSpreadsheet,
  Building2,
  Send,
  ArrowUpRight,
  Clock,
  AlertTriangle,
  Receipt,
  FileText,
  Copy,
  Check,
  Filter,
  Layers,
  ShieldCheck,
  TrendingUp,
  Eye,
  RotateCcw,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import {
  getStatusInfo,
  formatMoney,
  formatDateTime,
  convertToCRC,
  getCurrencyInfo,
} from '../utils/statusHelpers';

export default function TransactionsView({
  transactions = [],
  onSelectTransaction,
  searchQuery = '',
  setSearchQuery,
  onOpenNewTransaction,
  isTechnicalMode = false,
}) {
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedCurrency, setSelectedCurrency] = useState('ALL');
  const [sortBy, setSortBy] = useState('date-desc');
  const [copiedId, setCopiedId] = useState(null);

  // Summary Metrics for the Header
  const metrics = useMemo(() => {
    const total = transactions.length;
    const completed = transactions.filter(
      (t) => t.status === 'COMPLETED' || t.status === 'PAYMENT_APPROVED'
    );
    const pending = transactions.filter(
      (t) => t.status === 'PAYMENT_PENDING' || t.status === 'CREATED'
    );
    const rejected = transactions.filter((t) => t.status === 'PAYMENT_REJECTED');

    const totalLiquidatedCRC = completed.reduce(
      (acc, t) => acc + convertToCRC(t.amount, t.currency),
      0
    );

    return {
      totalCount: total,
      completedCount: completed.length,
      pendingCount: pending.length,
      rejectedCount: rejected.length,
      totalLiquidatedCRC,
    };
  }, [transactions]);

  // Filter and sort transactions
  const filteredAndSorted = useMemo(() => {
    return transactions
      .filter((tx) => {
        if (selectedStatus === 'COMPLETED_GROUP') {
          if (tx.status !== 'COMPLETED' && tx.status !== 'PAYMENT_APPROVED') return false;
        } else if (selectedStatus === 'PENDING_GROUP') {
          if (tx.status !== 'PAYMENT_PENDING' && tx.status !== 'CREATED') return false;
        } else if (selectedStatus !== 'ALL' && tx.status !== selectedStatus) {
          return false;
        }

        if (selectedCurrency !== 'ALL' && tx.currency !== selectedCurrency) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchId = (tx.transactionId || '').toLowerCase().includes(q);
          const matchCust = (tx.customerId || '').toLowerCase().includes(q);
          const matchAmt = (tx.amount || '').toString().includes(q);
          const matchAuth = (tx.approvalCode || '').toLowerCase().includes(q);
          return matchId || matchCust || matchAmt || matchAuth;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'amount-desc') return (b.amount || 0) - (a.amount || 0);
        if (sortBy === 'amount-asc') return (a.amount || 0) - (b.amount || 0);
        if (sortBy === 'version-desc') return (b.version || 1) - (a.version || 1);
        if (sortBy === 'id-asc') return (a.customerId || '').localeCompare(b.customerId || '');
        // default date-desc
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
  }, [transactions, selectedStatus, selectedCurrency, searchQuery, sortBy]);

  // Copy reference ID handler
  const handleCopyId = (e, id) => {
    e.stopPropagation();
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2200);
    }
  };

  // Export Bank Statement
  const handleExportCSV = () => {
    const headers = [
      'Referencia_Bancaria',
      'Beneficiario',
      'Monto',
      'Moneda',
      'Monto_Equivalente_CRC',
      'Estado_Bancario',
      'Version_Event_Sourcing',
      'Intentos_Procesamiento',
      'Codigo_Autorizacion',
      'Motivo_Rechazo',
      'Fecha_Registro',
    ];

    const rows = filteredAndSorted.map((t) => [
      t.transactionId,
      `"${(t.customerId || '').replace(/"/g, '""')}"`,
      t.amount,
      t.currency,
      convertToCRC(t.amount, t.currency),
      getStatusInfo(t.status).bankStatus || getStatusInfo(t.status).label,
      `v${t.version || 1}`,
      t.attemptCount || 1,
      t.approvalCode || '',
      `"${(t.lastRejectionReason || '').replace(/"/g, '""')}"`,
      t.createdAt || new Date().toISOString(),
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `extracto_bancario_paybank_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Avatar generator helper
  const getAvatarInitials = (name) => {
    if (!name) return 'PB';
    const clean = name.replace(/[^a-zA-Z0-9 ]/g, '').trim();
    const parts = clean.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase() || 'PB';
  };

  return (
    <div className="bank-transactions-container">
      {/* 1. Header Overview & Summary Metrics */}
      <div className="statement-metrics-grid">
        <div className="statement-metric-card">
          <div className="metric-icon-wrap bg-blue-subtle text-blue">
            <Receipt size={22} />
          </div>
          <div className="metric-content">
            <span className="metric-label">Total de Movimientos</span>
            <div className="metric-value-row">
              <strong className="metric-number">{metrics.totalCount}</strong>
              <span className="metric-pill pill-neutral">Event Store</span>
            </div>
            <span className="metric-subtext">Historial inmutable verificado</span>
          </div>
        </div>

        <div className="statement-metric-card">
          <div className="metric-icon-wrap bg-emerald-subtle text-emerald">
            <TrendingUp size={22} />
          </div>
          <div className="metric-content">
            <span className="metric-label">Monto Total Liquidado</span>
            <div className="metric-value-row">
              <strong className="metric-number">
                ₡{metrics.totalLiquidatedCRC.toLocaleString('es-CR', { minimumFractionDigits: 0 })}
              </strong>
            </div>
            <span className="metric-subtext">{metrics.completedCount} operaciones exitosas</span>
          </div>
        </div>

        <div className="statement-metric-card">
          <div className="metric-icon-wrap bg-amber-subtle text-amber">
            <Clock size={22} />
          </div>
          <div className="metric-content">
            <span className="metric-label">En Validación Bancaria</span>
            <div className="metric-value-row">
              <strong className="metric-number">{metrics.pendingCount}</strong>
              <span className="metric-pill pill-amber">En Tránsito</span>
            </div>
            <span className="metric-subtext">Esperando respuesta de red</span>
          </div>
        </div>

        <div className="statement-metric-card">
          <div className="metric-icon-wrap bg-rose-subtle text-rose">
            <AlertTriangle size={22} />
          </div>
          <div className="metric-content">
            <span className="metric-label">Declinadas por el Banco</span>
            <div className="metric-value-row">
              <strong className="metric-number">{metrics.rejectedCount}</strong>
              <span className="metric-pill pill-rose">Con Registro</span>
            </div>
            <span className="metric-subtext">Listas para reintento de cobro</span>
          </div>
        </div>
      </div>

      {/* 2. Top Statement Controls Card */}
      <div className="bank-toolbar-card">
        {/* Status filter tabs */}
        <div className="bank-filter-pills-row">
          {[
            { id: 'ALL', label: 'Todos los Movimientos', count: metrics.totalCount },
            { id: 'COMPLETED_GROUP', label: 'Liquidados / Aprobados', count: metrics.completedCount },
            { id: 'PENDING_GROUP', label: 'En Proceso', count: metrics.pendingCount },
            { id: 'PAYMENT_REJECTED', label: 'Declinados', count: metrics.rejectedCount },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              className={`bank-statement-pill ${selectedStatus === st.id ? 'active' : ''}`}
              onClick={() => setSelectedStatus(st.id)}
            >
              <span>{st.label}</span>
              <span className="pill-counter">{st.count}</span>
            </button>
          ))}
        </div>

        {/* Search, Sort, Currency and Actions */}
        <div className="bank-toolbar-sub">
          <div className="bank-search-wrap">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Buscar beneficiario, referencia o monto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bank-search-field"
            />
            {searchQuery && (
              <button
                type="button"
                className="btn-clear-search"
                onClick={() => setSearchQuery('')}
                title="Limpiar búsqueda"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="bank-toolbar-right">
            <div className="select-wrapper">
              <select
                className="bank-select-control"
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
              >
                <option value="ALL">Todas las Monedas</option>
                <option value="CRC">Colones (₡ CRC)</option>
                <option value="USD">Dólares ($ USD)</option>
                <option value="EUR">Euros (€ EUR)</option>
              </select>
            </div>

            <div className="select-wrapper">
              <select
                className="bank-select-control"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="date-desc">Más recientes primero</option>
                <option value="version-desc">Mayor versión (Event Sourcing)</option>
                <option value="amount-desc">Mayor monto</option>
                <option value="amount-asc">Menor monto</option>
                <option value="id-asc">Beneficiario (A-Z)</option>
              </select>
            </div>

            <button
              type="button"
              className="btn-download-statement"
              onClick={handleExportCSV}
              title="Descargar Extracto Bancario en formato Excel / CSV"
            >
              <FileSpreadsheet size={16} />
              <span>Descargar Extracto</span>
            </button>

            <button
              type="button"
              className="btn-bank-new-action"
              onClick={onOpenNewTransaction}
            >
              <Send size={15} />
              <span>Enviar Dinero</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Movements Table Card */}
      <div className="bank-movements-table-card">
        <div className="table-header-meta">
          <div className="meta-left">
            <h3 className="meta-title">Detalle de Operaciones y Auditoría</h3>
            <span className="meta-subtitle">
              Mostrando {filteredAndSorted.length} de {transactions.length} registros protegidos por Event Sourcing
            </span>
          </div>
          <div className="meta-right">
            <span className="audit-badge-chip">
              <ShieldCheck size={14} />
              <span>Log de Eventos Inmutable</span>
            </span>
          </div>
        </div>

        {filteredAndSorted.length === 0 ? (
          <div className="empty-statement-view">
            <div className="empty-icon-circle">
              <Receipt size={36} />
            </div>
            <h3>No se encontraron movimientos</h3>
            <p>
              No existen transacciones que coincidan con los filtros aplicados. Intenta cambiar el estado, moneda o término de búsqueda.
            </p>
            <button
              type="button"
              className="btn-clear-filters"
              onClick={() => {
                setSelectedStatus('ALL');
                setSelectedCurrency('ALL');
                setSearchQuery('');
              }}
            >
              <RotateCcw size={15} />
              <span>Restablecer Filtros</span>
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="bank-statement-table">
              <thead>
                <tr>
                  <th style={{ width: '28%' }}>Beneficiario / Destino</th>
                  <th style={{ width: '17%' }}>Monto Transferido</th>
                  <th style={{ width: '18%' }}>Estado de Operación</th>
                  <th style={{ width: '22%' }}>Auditoría Event Sourcing</th>
                  <th style={{ width: '15%', textAlign: 'right' }}>Comprobante</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSorted.map((tx) => {
                  const st = getStatusInfo(tx.status);
                  const isRejected = tx.status === 'PAYMENT_REJECTED';
                  const isCompleted = tx.status === 'COMPLETED' || tx.status === 'PAYMENT_APPROVED';
                  const isPending = tx.status === 'PAYMENT_PENDING' || tx.status === 'CREATED';
                  const initials = getAvatarInitials(tx.customerId);
                  const isCopied = copiedId === tx.transactionId;

                  return (
                    <tr
                      key={tx.transactionId}
                      className="statement-row"
                      onClick={() => onSelectTransaction(tx.transactionId)}
                    >
                      {/* Beneficiario */}
                      <td>
                        <div className="beneficiary-cell-flex">
                          <div className={`beneficiary-avatar-bubble ${isRejected ? 'avatar-rejected' : ''}`}>
                            {initials}
                          </div>
                          <div className="beneficiary-info">
                            <strong className="beneficiary-title">{tx.customerId || 'Destinatario'}</strong>
                            <div className="ref-copy-row">
                              <span className="ref-subtext" title={tx.transactionId}>
                                Ref: {tx.transactionId ? `${tx.transactionId.slice(0, 16)}...` : 'N/A'}
                              </span>
                              <button
                                type="button"
                                className={`btn-copy-ref ${isCopied ? 'copied' : ''}`}
                                onClick={(e) => handleCopyId(e, tx.transactionId)}
                                title="Copiar referencia bancaria"
                              >
                                {isCopied ? <Check size={12} /> : <Copy size={12} />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Monto */}
                      <td>
                        <div className="amount-cell-column">
                          <strong className={`amount-main ${isRejected ? 'amount-rejected' : 'amount-debit'}`}>
                            {formatMoney(tx.amount, tx.currency)}
                          </strong>
                          {tx.currency !== 'CRC' && (
                            <span className="amount-converted-sub">
                              ≈ ₡{convertToCRC(tx.amount, tx.currency).toLocaleString('es-CR', { minimumFractionDigits: 0 })}
                            </span>
                          )}
                          <span className="amount-direction-tag">
                            {isRejected ? 'No Acreditado' : 'Débito Bancario'}
                          </span>
                        </div>
                      </td>

                      {/* Estado */}
                      <td>
                        <div className="status-cell-wrap">
                          <span
                            className="bank-status-pill-table"
                            style={{
                              backgroundColor: st.bgColor,
                              color: st.color,
                              borderColor: st.borderColor,
                            }}
                          >
                            <span
                              className="status-dot-mini"
                              style={{ backgroundColor: st.color }}
                            />
                            {st.bankStatus || st.label}
                          </span>
                        </div>
                      </td>

                      {/* Auditoría Event Sourcing */}
                      <td>
                        <div className="audit-cell-info">
                          <div className="audit-version-badge">
                            <span className="version-pill">v{tx.version || 1}</span>
                            <span className="version-meta-text">
                              {tx.attemptCount && tx.attemptCount > 1
                                ? `${tx.attemptCount} intentos`
                                : '1 intento'}
                            </span>
                          </div>

                          {tx.status === 'PAYMENT_REJECTED' && (
                            <span className="text-rejected-small" title={tx.lastRejectionReason}>
                              {tx.lastRejectionReason || 'Declinada por el banco emisor'}
                            </span>
                          )}

                          {tx.approvalCode && (
                            <span className="text-approved-small">
                              Cod: <strong>{tx.approvalCode}</strong>
                            </span>
                          )}

                          {tx.status === 'COMPLETED' && !tx.approvalCode && (
                            <span className="text-completed-small">Liquidación confirmada</span>
                          )}

                          {isPending && (
                            <span className="text-pending-small">En verificación con la red</span>
                          )}
                        </div>
                      </td>

                      {/* Comprobante */}
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn-open-voucher-row"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTransaction(tx.transactionId);
                          }}
                          title="Abrir comprobante bancario e historial de eventos"
                        >
                          <span>Comprobante</span>
                          <ArrowRight size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
