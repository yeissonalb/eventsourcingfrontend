import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Building2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Download,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Inbox,
  Code2,
  ShieldCheck,
  ArrowRight,
  Receipt,
  Lock,
} from 'lucide-react';
import { getTransactionHistoryEvents, getTransactionHistoryState } from '../api';
import { getStatusInfo, getEventNarrative, formatMoney, formatDateTime } from '../utils/statusHelpers';

export default function EventStoreView({
  transactions,
  selectedTxId,
  setSelectedTxId,
  showNotification,
  isTechnicalMode,
}) {
  const [events, setEvents] = useState([]);
  const [replayedState, setReplayedState] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedJson, setExpandedJson] = useState({});

  const currentTx = transactions.find((t) => t.transactionId === selectedTxId) || transactions[0] || null;
  const statusInfo = currentTx ? getStatusInfo(currentTx.status) : null;

  // Load events and state for selected transaction
  const loadData = useCallback(async (txId) => {
    if (!txId) return;
    setIsLoading(true);
    try {
      const [eventsData, stateData] = await Promise.all([
        getTransactionHistoryEvents(txId),
        getTransactionHistoryState(txId),
      ]);
      setEvents(Array.isArray(eventsData) ? eventsData : []);
      setReplayedState(stateData);
    } catch (err) {
      showNotification('error', `Error al consultar trazabilidad: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    if (currentTx?.transactionId) {
      loadData(currentTx.transactionId);
    }
  }, [currentTx?.transactionId, loadData]);

  const toggleJsonExpand = (version) => {
    setExpandedJson((prev) => ({
      ...prev,
      [version]: !prev[version],
    }));
  };

  const downloadHistoryJSON = () => {
    const dataStr = JSON.stringify({ transaction: replayedState, auditTrail: events }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comprobante_auditable_${currentTx?.transactionId || 'transferencia'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="bank-timeline-container">
      {/* Top Selector Card */}
      <div className="bank-timeline-selector-card">
        <div className="selector-left">
          <label className="selector-label">Seleccionar Transferencia a Rastrear:</label>
          <select
            className="bank-tx-select"
            value={currentTx?.transactionId || ''}
            onChange={(e) => setSelectedTxId(e.target.value)}
          >
            {transactions.map((tx) => (
              <option key={tx.transactionId} value={tx.transactionId}>
                {tx.customerId} — {formatMoney(tx.amount, tx.currency)} ({getStatusInfo(tx.status).bankStatus || getStatusInfo(tx.status).label})
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="btn-download-audit"
          onClick={downloadHistoryJSON}
          disabled={!currentTx}
        >
          <Download size={15} />
          <span>Descargar Trazabilidad</span>
        </button>
      </div>

      {!currentTx ? (
        <div className="bank-timeline-empty">
          <Inbox size={40} />
          <h3>No hay operaciones para rastrear</h3>
          <p>Realiza una transferencia primero para ver su compensación paso a paso.</p>
        </div>
      ) : (
        <div className="bank-timeline-grid">
          {/* Main Narrative Track */}
          <div className="timeline-main-column">
            <div className="timeline-card-box">
              <div className="timeline-header-row">
                <div>
                  <h3>Rastreo y Compensación Bancaria</h3>
                  <p>Cadena inmutable de acontecimientos registrados para esta operación</p>
                </div>
                <span className="events-count-pill">
                  {events.length} hitos registrados
                </span>
              </div>

              {isLoading ? (
                <div className="timeline-loading-state">
                  <div className="spinner-dot" />
                  <span>Consultando libro de auditoría...</span>
                </div>
              ) : events.length === 0 ? (
                <div className="timeline-empty-state">
                  <Clock size={32} />
                  <p>No se encontraron eventos para esta transferencia.</p>
                </div>
              ) : (
                <div className="bank-tracking-track">
                  {events.map((evt, idx) => {
                    const narrative = getEventNarrative(evt, currentTx);
                    const isLast = idx === events.length - 1;
                    return (
                      <div key={evt.eventId || idx} className={`tracking-item ${isLast ? 'is-current' : ''}`}>
                        {/* Dot & vertical line */}
                        <div className="tracking-line-col">
                          <div
                            className="tracking-circle"
                            style={{ backgroundColor: narrative.color }}
                          >
                            <span>{idx + 1}</span>
                          </div>
                          {!isLast && <div className="tracking-connector" />}
                        </div>

                        {/* Content box */}
                        <div className="tracking-bubble">
                          <div className="bubble-header">
                            <div>
                              <span
                                className="bubble-badge"
                                style={{ backgroundColor: `${narrative.color}15`, color: narrative.color }}
                              >
                                {narrative.badge}
                              </span>
                              <h4 className="bubble-title">{narrative.title}</h4>
                            </div>
                            <span className="bubble-time">
                              {formatDateTime(evt.occurredAt)}
                            </span>
                          </div>

                          <p className="bubble-story">{narrative.story}</p>

                          {isTechnicalMode && (
                            <div className="bubble-tech-zone">
                              <button
                                type="button"
                                className="btn-show-json"
                                onClick={() => toggleJsonExpand(evt.version)}
                              >
                                <Code2 size={13} />
                                <span>
                                  {expandedJson[evt.version] ? 'Ocultar Bloque JSON' : `Ver EventEnvelope JSON (v${evt.version})`}
                                </span>
                                {expandedJson[evt.version] ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                              </button>

                              {expandedJson[evt.version] && (
                                <pre className="json-pre">
                                  {JSON.stringify(evt, null, 2)}
                                </pre>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Summary Info */}
          <div className="timeline-side-column">
            <div className="bank-operation-card">
              <h4>Ficha de la Operación</h4>

              <div className="op-field">
                <span className="op-label">Beneficiario / Destino:</span>
                <strong className="op-value">{currentTx.customerId}</strong>
              </div>

              <div className="op-field">
                <span className="op-label">Monto Debitativo:</span>
                <strong className="op-value op-amount">{formatMoney(currentTx.amount, currentTx.currency)}</strong>
              </div>

              <div className="op-field">
                <span className="op-label">Estado de Compensación:</span>
                <span
                  className="bank-status-pill-table"
                  style={{
                    backgroundColor: statusInfo.bgColor,
                    color: statusInfo.color,
                    borderColor: statusInfo.borderColor,
                  }}
                >
                  {statusInfo.bankStatus || statusInfo.label}
                </span>
              </div>

              <div className="op-field">
                <span className="op-label">Intentos de Procesamiento:</span>
                <strong className="op-value">{currentTx.attemptCount || 1} intento(s)</strong>
              </div>

              {currentTx.approvalCode && (
                <div className="op-field">
                  <span className="op-label">Código de Autorización:</span>
                  <span className="bank-auth-code">{currentTx.approvalCode}</span>
                </div>
              )}

              {currentTx.lastRejectionReason && (
                <div className="op-field op-rejected-box">
                  <span className="op-label">Motivo de Declinación:</span>
                  <p>{currentTx.lastRejectionReason}</p>
                </div>
              )}

              <div className="op-security-box">
                <Lock size={15} />
                <p>
                  <strong>Seguridad Bancaria:</strong> Registro oficial inmutable y protegido contra alteraciones.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
