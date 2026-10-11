import React, { useState, useMemo } from 'react';
import { Download, ArrowRight, Plus, SearchX } from 'lucide-react';

export default function TransactionsView({
  transactions,
  onSelectTransaction,
  searchQuery,
  onOpenNewTransaction,
}) {
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedCurrency, setSelectedCurrency] = useState('ALL');
  const [sortBy, setSortBy] = useState('version-desc');

  // Filter and sort transactions
  const filteredAndSorted = useMemo(() => {
    return transactions
      .filter((tx) => {
        if (selectedStatus !== 'ALL' && tx.status !== selectedStatus) return false;
        if (selectedCurrency !== 'ALL' && tx.currency !== selectedCurrency) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchId = tx.transactionId.toLowerCase().includes(q);
          const matchCust = tx.customerId.toLowerCase().includes(q);
          const matchAmt = tx.amount.toString().includes(q);
          return matchId || matchCust || matchAmt;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'amount-desc') return b.amount - a.amount;
        if (sortBy === 'amount-asc') return a.amount - b.amount;
        if (sortBy === 'version-desc') return b.version - a.version;
        if (sortBy === 'id-asc') return a.transactionId.localeCompare(b.transactionId);
        return 0;
      });
  }, [transactions, selectedStatus, selectedCurrency, searchQuery, sortBy]);

  // Export to JSON
  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(filteredAndSorted, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', url);
    dlAnchorElem.setAttribute('download', `transacciones_export_${Date.now()}.json`);
    document.body.appendChild(dlAnchorElem);
    dlAnchorElem.click();
    document.body.removeChild(dlAnchorElem);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['transactionId', 'customerId', 'amount', 'currency', 'status', 'version', 'attemptCount', 'approvalCode', 'lastRejectionReason'];
    const rows = filteredAndSorted.map((t) => [
      t.transactionId,
      t.customerId,
      t.amount,
      t.currency,
      t.status,
      t.version,
      t.attemptCount || 0,
      t.approvalCode || '',
      `"${(t.lastRejectionReason || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `transacciones_audit_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="transactions-view-container">
      {/* Top Filter Bar */}
      <div className="table-controls-bar">
        <div className="controls-left">
          {/* Status Filter */}
          <div className="filter-pill-group">
            {[
              { id: 'ALL', label: 'Todos' },
              { id: 'CREATED', label: 'Creadas' },
              { id: 'PAYMENT_PENDING', label: 'Pendientes' },
              { id: 'PAYMENT_REJECTED', label: 'Rechazadas' },
              { id: 'PAYMENT_APPROVED', label: 'Aprobadas' },
              { id: 'COMPLETED', label: 'Completadas' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                className={`control-pill ${selectedStatus === st.id ? 'active' : ''}`}
                onClick={() => setSelectedStatus(st.id)}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        <div className="controls-right">
          {/* Currency Filter */}
          <select
            className="select-custom"
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value)}
          >
            <option value="ALL">Todas las monedas</option>
            <option value="CRC">CRC (Colones)</option>
            <option value="USD">USD (Dólares)</option>
            <option value="EUR">EUR (Euros)</option>
          </select>

          {/* Sort By */}
          <select
            className="select-custom"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="version-desc">Más Recientes (Mayor Versión)</option>
            <option value="amount-desc">Mayor Monto</option>
            <option value="amount-asc">Menor Monto</option>
            <option value="id-asc">ID Alfabético</option>
          </select>

          {/* Export Dropdown */}
          <div className="export-btn-group">
            <button
              type="button"
              className="btn-export"
              onClick={handleExportCSV}
              title="Descargar reporte en formato CSV"
            >
              <Download size={13} />
              <span>CSV</span>
            </button>
            <button
              type="button"
              className="btn-export"
              onClick={handleExportJSON}
              title="Descargar datos en formato JSON"
            >
              <Download size={13} />
              <span>JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="table-wrapper-card">
        <table className="admin-data-table">
          <thead>
            <tr>
              <th>ID Transacción</th>
              <th>Cliente</th>
              <th>Monto</th>
              <th>Estado Actual</th>
              <th>Versión / Eventos</th>
              <th>Intentos</th>
              <th>Detalle de Auditoría</th>
              <th style={{ textAlign: 'right' }}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.length === 0 ? (
              <tr>
                <td colSpan="8">
                  <div className="table-empty-notice">
                    <SearchX size={32} strokeWidth={1.5} className="empty-icon" />
                    <p>No se encontraron transacciones con los filtros seleccionados.</p>
                    <button
                      type="button"
                      className="btn-primary-inline"
                      onClick={onOpenNewTransaction}
                    >
                      <Plus size={14} />
                      <span>Registrar Nueva Transacción</span>
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredAndSorted.map((tx) => (
                <tr
                  key={tx.transactionId}
                  className="table-data-row"
                  onClick={() => onSelectTransaction(tx.transactionId)}
                >
                  <td className="mono-code font-bold">
                    <div className="id-cell">
                      <span className="id-full" title={tx.transactionId}>
                        {tx.transactionId}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="customer-cell">
                      <span className="customer-avatar">
                        {tx.customerId ? tx.customerId.charAt(0).toUpperCase() : 'C'}
                      </span>
                      <span>{tx.customerId}</span>
                    </div>
                  </td>
                  <td className="amount-strong">
                    {Number(tx.amount).toLocaleString('es-CR', { minimumFractionDigits: 2 })} {tx.currency}
                  </td>
                  <td>
                    <span className={`status-pill status-${tx.status}`}>
                      {tx.status}
                    </span>
                  </td>
                  <td>
                    <span className="tag-version">v{tx.version} ({tx.version} ev)</span>
                  </td>
                  <td>
                    <span className="tag-attempts">{tx.attemptCount || 0}</span>
                  </td>
                  <td>
                    {tx.approvalCode && (
                      <span className="audit-detail-pill approved" title={`Código: ${tx.approvalCode}`}>
                        Aprobado: {tx.approvalCode}
                      </span>
                    )}
                    {tx.lastRejectionReason && (
                      <span className="audit-detail-pill rejected" title={tx.lastRejectionReason}>
                        Motivo: {tx.lastRejectionReason}
                      </span>
                    )}
                    {!tx.approvalCode && !tx.lastRejectionReason && (
                      <span className="text-dim text-xs">—</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="btn-row-action"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTransaction(tx.transactionId);
                      }}
                    >
                      <span>Historial</span>
                      <ArrowRight size={13} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Table Footer info */}
        <div className="table-footer-bar">
          <span>Mostrando <strong>{filteredAndSorted.length}</strong> de <strong>{transactions.length}</strong> pagos</span>
          <span>Técnica: <em>Event Sourcing (Reconstrucción en vivo)</em></span>
        </div>
      </div>
    </div>
  );
}
