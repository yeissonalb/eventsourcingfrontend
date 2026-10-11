import React from 'react';
import {
  DollarSign,
  Layers,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  ArrowRight,
  Plus,
  Inbox,
} from 'lucide-react';

export default function OverviewView({
  transactions,
  onSelectTransaction,
  onOpenCommandTerminal,
}) {
  // Financial metrics
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

  const statusLabels = {
    CREATED: '1. Creada (CREATED)',
    PAYMENT_PENDING: '2. Cobro Pendiente (PAYMENT_PENDING)',
    PAYMENT_REJECTED: '3. Rechazada por Banco (PAYMENT_REJECTED)',
    PAYMENT_APPROVED: '4. Pago Aprobado (PAYMENT_APPROVED)',
    COMPLETED: '5. Finalizada (COMPLETED)',
  };

  const recentTransactions = [...transactions].slice(0, 5);

  return (
    <div className="overview-container">
      {/* Presentation Hero Banner - Perfect for defending the project */}
      <div className="presentation-hero-banner">
        <div className="hero-badge">Tema 4: Historial Auditable de Transacciones</div>
        <h2>¿Qué problema resuelve este proyecto y qué es Event Sourcing?</h2>
        <div className="hero-columns-explanation">
          <div className="hero-explanation-item">
            <div className="hero-item-header">
              <AlertCircle size={16} className="text-destructive-icon" />
              <span className="hero-item-title">El Problema Tradicional:</span>
            </div>
            <p>
              Si solo guardamos una fila en una base de datos con estado "COMPLETED", nadie sabe qué pasó antes: si hubo rechazos del banco, cuántos reintentos ocurrieron o quién lo autorizó. Se pierde toda la historia.
            </p>
          </div>
          <div className="hero-explanation-item">
            <div className="hero-item-header">
              <CheckCircle2 size={16} className="text-success-icon" />
              <span className="hero-item-title">La Solución con Event Sourcing:</span>
            </div>
            <p>
              Nunca sobreescribimos datos. Cada hecho relevante se guarda como un <strong>evento inmutable</strong> en el archivo append-only. El estado actual se calcula en tiempo real aplicando <code>replay(eventos)</code>.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="overview-kpi-grid">
        {/* KPI 1: Volumen Financiero */}
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">Monto Total Procesado</span>
            <div className="kpi-icon-pill">
              <DollarSign size={16} />
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
          <span className="kpi-footnote">Suma calculada desde los eventos del store</span>
        </div>

        {/* KPI 2: Total Transacciones */}
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">Transacciones Registradas</span>
            <div className="kpi-icon-pill">
              <Layers size={16} />
            </div>
          </div>
          <div className="kpi-metric-number">{totalCount}</div>
          <div className="kpi-split-stat">
            <span className="stat-highlight">{completedCount} finalizadas</span>
            <span className="stat-separator">·</span>
            <span className="stat-muted">{pendingCount} en proceso</span>
          </div>
        </div>

        {/* KPI 3: Tasa de Finalización */}
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">Tasa de Finalización</span>
            <div className="kpi-icon-pill">
              <CheckCircle2 size={16} />
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
            <span className="kpi-label">Rechazos Registrados</span>
            <div className="kpi-icon-pill">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="kpi-metric-number">{rejectedCount}</div>
          <span className="kpi-footnote">Registrados con motivo y listos para reintento</span>
        </div>
      </div>

      {/* Main Two Columns */}
      <div className="overview-split-grid">
        {/* Left: State Distribution */}
        <div className="admin-box-card">
          <div className="box-card-header">
            <div className="box-title-group">
              <span className="box-badge">Reconstrucción en Vivo</span>
              <h3>Distribución de Estados Actuales</h3>
            </div>
          </div>

          <div className="box-card-content">
            <p className="box-description">
              El sistema recorre el historial de eventos para deducir en qué estado se encuentra cada pago:
            </p>

            <div className="status-bars-container">
              {Object.entries(statusCounts).map(([status, count]) => {
                const percent = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
                return (
                  <div key={status} className="status-bar-item">
                    <div className="status-bar-info">
                      <span className={`status-pill status-${status}`}>{statusLabels[status] || status}</span>
                      <span className="status-bar-count">
                        <strong>{count}</strong> ({percent}%)
                      </span>
                    </div>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="event-sourcing-callout">
              <div className="callout-icon">
                <Info size={16} />
              </div>
              <div className="callout-text">
                <strong>Punto clave para la defensa:</strong>
                <span> Cada evento nuevo agrega una línea al archivo <code>data/event-store.jsonl</code>. No existen sentencias UPDATE ni DELETE.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Recent Transactions Table */}
        <div className="admin-box-card">
          <div className="box-card-header">
            <div className="box-title-group">
              <span className="box-badge">En Vivo</span>
              <h3>Últimas Transacciones Registradas</h3>
            </div>
            <button
              type="button"
              className="btn-link-action"
              onClick={onOpenCommandTerminal}
            >
              <Plus size={14} />
              <span>Nuevo Pago</span>
            </button>
          </div>

          <div className="box-card-content p-0">
            {recentTransactions.length === 0 ? (
              <div className="empty-box-placeholder">
                <Inbox size={32} strokeWidth={1.5} className="empty-icon" />
                <p>No hay transacciones registradas aún</p>
                <button
                  type="button"
                  className="btn-primary-inline"
                  onClick={onOpenCommandTerminal}
                >
                  <Plus size={14} />
                  <span>Registrar primer pago</span>
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
                          <span>Ver Historia</span>
                          <ArrowRight size={13} />
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
