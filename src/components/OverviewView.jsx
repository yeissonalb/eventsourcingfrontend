import React from 'react';

export default function OverviewView({
  transactions,
  onSelectTransaction,
  onOpenCommandTerminal,
  onOpenAudit,
}) {
  // Aggregate Financial metrics
  const totalCount = transactions.length;
  const completedCount = transactions.filter((t) => t.status === 'COMPLETED').length;
  const pendingCount = transactions.filter((t) => t.status === 'PAYMENT_PENDING' || t.status === 'CREATED').length;
  const rejectedCount = transactions.filter((t) => t.status === 'PAYMENT_REJECTED').length;
  const approvedCount = transactions.filter((t) => t.status === 'PAYMENT_APPROVED').length;

  const successRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Currencies volume
  const volumeByCurrency = transactions.reduce((acc, tx) => {
    const curr = tx.currency || 'CRC';
    acc[curr] = (acc[curr] || 0) + (Number(tx.amount) || 0);
    return acc;
  }, {});

  const statusCounts = {
    CREATED: transactions.filter((t) => t.status === 'CREATED').length,
    PAYMENT_PENDING: transactions.filter((t) => t.status === 'PAYMENT_PENDING').length,
    PAYMENT_REJECTED: rejectedCount,
    PAYMENT_APPROVED: approvedCount,
    COMPLETED: completedCount,
  };

  const statusColors = {
    CREATED: '#38bdf8',
    PAYMENT_PENDING: '#fbbf24',
    PAYMENT_REJECTED: '#fb7185',
    PAYMENT_APPROVED: '#34d399',
    COMPLETED: '#4ade80',
  };

  const recentTransactions = [...transactions].slice(0, 5);

  return (
    <div className="overview-container">
      {/* KPI Cards Row */}
      <div className="overview-kpi-grid">
        {/* KPI 1: Volumen Financiero */}
        <div className="kpi-card kpi-highlight">
          <div className="kpi-top">
            <span className="kpi-label">Volumen Acumulado en Store</span>
            <div className="kpi-icon-pill icon-indigo">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
          </div>
          <div className="kpi-amount">
            {Object.keys(volumeByCurrency).length === 0 ? (
              <span className="kpi-empty">0.00</span>
            ) : (
              Object.entries(volumeByCurrency).map(([curr, amt]) => (
                <div key={curr} className="currency-line">
                  <span className="currency-symbol">{curr}</span>
                  <span className="currency-value">{amt.toLocaleString('es-CR', { minimumFractionDigits: 2 })}</span>
                </div>
              ))
            )}
          </div>
          <span className="kpi-footnote">Calculado sumando montos de transacciones activas</span>
        </div>

        {/* KPI 2: Total Transacciones */}
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">Transacciones Registradas</span>
            <div className="kpi-icon-pill icon-blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
            </div>
          </div>
          <div className="kpi-metric-number">{totalCount}</div>
          <div className="kpi-split-stat">
            <span className="text-success">{completedCount} finalizadas</span>
            <span className="text-dim">·</span>
            <span className="text-warning">{pendingCount} en proceso</span>
          </div>
        </div>

        {/* KPI 3: Tasa de Finalización */}
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">Tasa de Finalización Exitosa</span>
            <div className="kpi-icon-pill icon-green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
          </div>
          <div className="kpi-metric-number">{successRate}%</div>
          <div className="kpi-progress-bar-bg">
            <div
              className="kpi-progress-bar-fill"
              style={{ width: `${successRate}%` }}
            />
          </div>
        </div>

        {/* KPI 4: Control de Rechazos */}
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">Pagos Rechazados / Reintentos</span>
            <div className="kpi-icon-pill icon-rose">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
          </div>
          <div className="kpi-metric-number">{rejectedCount}</div>
          <span className="kpi-footnote">Disponibles para emisión de comando <code>PaymentRetried</code></span>
        </div>
      </div>

      {/* Main Two Columns */}
      <div className="overview-split-grid">
        {/* Left: State Distribution & Architecture summary */}
        <div className="admin-box-card">
          <div className="box-card-header">
            <div className="box-title-group">
              <span className="box-badge">CQRS State Machine</span>
              <h3>Distribución por Estados del Dominio</h3>
            </div>
          </div>

          <div className="box-card-content">
            <p className="box-description">
              El estado actual de cada agregado se deriva únicamente mediante la función determinista <code>replay(events)</code> sobre el historial inmutable:
            </p>

            <div className="status-bars-container">
              {Object.entries(statusCounts).map(([status, count]) => {
                const percent = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
                return (
                  <div key={status} className="status-bar-item">
                    <div className="status-bar-info">
                      <span className={`status-pill status-${status}`}>{status}</span>
                      <span className="status-bar-count">
                        <strong>{count}</strong> ({percent}%)
                      </span>
                    </div>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${percent}%`,
                          backgroundColor: statusColors[status],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="event-sourcing-callout">
              <div className="callout-icon">💡</div>
              <div className="callout-text">
                <strong>Garantía de Inmutabilidad:</strong>
                <span> El sistema nunca actualiza ni elimina registros existentes; cada transición es un evento cronológico nuevo append-only en <code>data/event-store.jsonl</code>.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Recent Transactions Table & Quick Actions */}
        <div className="admin-box-card">
          <div className="box-card-header">
            <div className="box-title-group">
              <span className="box-badge">Tiempo Real</span>
              <h3>Actividad Reciente</h3>
            </div>
            <button
              type="button"
              className="btn-link-action"
              onClick={onOpenCommandTerminal}
            >
              + Nuevo Comando
            </button>
          </div>

          <div className="box-card-content p-0">
            {recentTransactions.length === 0 ? (
              <div className="empty-box-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                </svg>
                <p>No hay transacciones en el Event Store</p>
                <button
                  type="button"
                  className="btn-primary-inline"
                  onClick={onOpenCommandTerminal}
                >
                  Crear la primera transacción
                </button>
              </div>
            ) : (
              <table className="recent-activity-table">
                <thead>
                  <tr>
                    <th>ID Transacción</th>
                    <th>Cliente</th>
                    <th>Monto</th>
                    <th>Estado</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map((tx) => (
                    <tr key={tx.transactionId}>
                      <td className="mono-code">
                        <span title={tx.transactionId}>
                          {tx.transactionId.substring(0, 14)}...
                        </span>
                      </td>
                      <td>{tx.customerId}</td>
                      <td className="amount-cell">
                        {tx.amount.toLocaleString('es-CR')} {tx.currency}
                      </td>
                      <td>
                        <span className={`status-pill status-${tx.status}`}>
                          {tx.status}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-table-drill"
                          onClick={() => onSelectTransaction(tx.transactionId)}
                        >
                          Ver Detalle →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
