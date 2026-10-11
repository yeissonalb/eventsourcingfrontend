import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  GitCommit,
  Code2,
  Download,
  Copy,
  ChevronDown,
  ChevronUp,
  Inbox,
  Check,
} from 'lucide-react';
import { getTransactionHistoryEvents, getTransactionHistoryState } from '../api';

export default function EventStoreView({
  transactions,
  selectedTxId,
  setSelectedTxId,
  showNotification,
}) {
  const [events, setEvents] = useState([]);
  const [replayedState, setReplayedState] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState({});
  const [viewFormat, setViewFormat] = useState('timeline'); // 'timeline' | 'raw'
  const [exportFormat, setExportFormat] = useState('json'); // 'json' | 'csv'
  const [copiedId, setCopiedId] = useState(null);

  const currentTx = transactions.find((t) => t.transactionId === selectedTxId) || transactions[0] || null;

  // Load events and state for selected transaction
  const loadData = useCallback(async (txId) => {
    if (!txId) return;
    setIsLoading(true);
    try {
      const [eventsData, stateData] = await Promise.all([
        getTransactionHistoryEvents(txId),
        getTransactionHistoryState(txId),
      ]);
      const list = Array.isArray(eventsData) ? eventsData : [];
      setEvents(list);
      setReplayedState(stateData);

      // Expand all by default
      const exp = {};
      list.forEach((e) => {
        exp[e.version] = true;
      });
      setExpandedEvents(exp);
    } catch (err) {
      console.error('Error cargando eventos:', err);
      showNotification('error', `Error al cargar eventos: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    if (currentTx?.transactionId) {
      loadData(currentTx.transactionId);
    }
  }, [currentTx?.transactionId, loadData]);

  // Toggle single event expansion
  const toggleExpand = (version) => {
    setExpandedEvents((prev) => ({
      ...prev,
      [version]: !prev[version],
    }));
  };

  // Expand / Collapse all
  const setAllExpanded = (expanded) => {
    const nextState = {};
    events.forEach((e) => {
      nextState[e.version] = expanded;
    });
    setExpandedEvents(nextState);
  };

  // Copy to clipboard helper
  const copyToClipboard = (text, label, idKey = null) => {
    navigator.clipboard.writeText(text);
    if (idKey) {
      setCopiedId(idKey);
      setTimeout(() => setCopiedId(null), 2000);
    }
    showNotification('success', `${label} copiado al portapapeles`);
  };

  // Robust file downloader
  const downloadFile = (content, filename, mimeType) => {
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showNotification('success', `Archivo descargado: ${filename}`);
    } catch (err) {
      showNotification('error', `Error al descargar: ${err.message}`);
    }
  };

  // Export Audit Handler
  const handleExportAudit = () => {
    if (!events || events.length === 0) {
      showNotification('error', 'No hay eventos disponibles para exportar');
      return;
    }

    const txId = currentTx?.transactionId || 'desconocido';

    if (exportFormat === 'json') {
      const exportPayload = {
        metadata: {
          exportedAt: new Date().toISOString(),
          transactionId: txId,
          totalEvents: events.length,
          reconstructedState: replayedState,
          source: 'EventCore Audit Log (Append-Only Event Store)',
        },
        events,
      };
      const jsonContent = JSON.stringify(exportPayload, null, 2);
      downloadFile(jsonContent, `auditoria_eventsourcing_${txId}.json`, 'application/json');
    } else {
      // CSV format
      const headers = ['version', 'type', 'occurredAt', 'eventId', 'transactionId', 'payload_data'];
      const rows = events.map((e) => [
        e.version,
        `"${e.type}"`,
        `"${e.occurredAt}"`,
        `"${e.eventId || ''}"`,
        `"${e.transactionId}"`,
        `"${JSON.stringify(e.data).replace(/"/g, '""')}"`,
      ]);
      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      downloadFile(csvContent, `auditoria_eventsourcing_${txId}.csv`, 'text/csv;charset=utf-8;');
    }
  };

  const getEventBadgeClass = (type) => {
    switch (type) {
      case 'TransactionCreated': return 'badge-type-created';
      case 'PaymentRequested': return 'badge-type-requested';
      case 'PaymentRejected': return 'badge-type-rejected';
      case 'PaymentRetried': return 'badge-type-retried';
      case 'PaymentApproved': return 'badge-type-approved';
      case 'TransactionCompleted': return 'badge-type-completed';
      default: return 'badge-type-default';
    }
  };

  return (
    <div className="eventstore-view-container">
      {/* Top Header & Selector */}
      <div className="eventstore-top-bar">
        <div className="selector-group">
          <label htmlFor="auditSelectTx">Transacción a Auditar:</label>
          <select
            id="auditSelectTx"
            className="select-custom font-mono"
            value={currentTx?.transactionId || ''}
            onChange={(e) => setSelectedTxId(e.target.value)}
          >
            {transactions.map((t) => (
              <option key={t.transactionId} value={t.transactionId}>
                {t.transactionId} — {t.status} (v{t.version})
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn-refresh-audit"
            onClick={() => currentTx && loadData(currentTx.transactionId)}
            title="Recargar eventos del event store"
          >
            <RefreshCw size={14} className={isLoading ? 'icon-spin' : ''} />
          </button>
        </div>

        {/* Action Controls Group */}
        <div className="audit-actions-group">
          {/* Segmented View Mode Switcher */}
          <div className="segmented-view-control">
            <button
              type="button"
              className={`segmented-btn ${viewFormat === 'timeline' ? 'active' : ''}`}
              onClick={() => setViewFormat('timeline')}
              id="btn-view-timeline"
            >
              <GitCommit size={14} />
              <span>Línea de Tiempo</span>
              <span className="count-pill">{events.length}</span>
            </button>

            <button
              type="button"
              className={`segmented-btn ${viewFormat === 'raw' ? 'active' : ''}`}
              onClick={() => setViewFormat('raw')}
              id="btn-view-raw-json"
            >
              <Code2 size={14} />
              <span>JSON Raw Log</span>
            </button>
          </div>

          {/* Export Audit Controls */}
          <div className="export-control-box">
            <select
              className="select-export-format"
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              title="Formato de exportación"
            >
              <option value="json">Formato JSON</option>
              <option value="csv">Formato CSV</option>
            </select>

            <button
              type="button"
              className="btn-download-audit"
              onClick={handleExportAudit}
              disabled={events.length === 0 || isLoading}
              id="btn-export-audit"
              title="Descargar archivo de auditoría inmutable"
            >
              <Download size={14} />
              <span>Exportar Auditoría ({exportFormat.toUpperCase()})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Left Replayed State Summary | Right Event Stream */}
      <div className="eventstore-grid">
        {/* Left: Replayed State Card */}
        <div className="replayed-state-card">
          <div className="card-top-header">
            <span className="card-badge-pill">Replay(Stream)</span>
            <h3>Estado Reconstruido</h3>
          </div>

          {isLoading ? (
            <div className="p-4 text-center text-dim">Cargando estado desde el log...</div>
          ) : replayedState ? (
            <div className="state-details-list">
              <div className="state-detail-row">
                <span className="detail-key">Estado Calculado:</span>
                <span className={`status-pill status-${replayedState.status}`}>
                  {replayedState.status}
                </span>
              </div>
              <div className="state-detail-row">
                <span className="detail-key">Versión del Agregado:</span>
                <span className="tag-version font-bold">v{replayedState.version}</span>
              </div>
              <div className="state-detail-row">
                <span className="detail-key">Monto y Moneda:</span>
                <span className="font-mono font-bold text-success">
                  {replayedState.amount?.toLocaleString('es-CR')} {replayedState.currency}
                </span>
              </div>
              <div className="state-detail-row">
                <span className="detail-key">Cliente ID:</span>
                <span className="font-mono">{replayedState.customerId}</span>
              </div>
              <div className="state-detail-row">
                <span className="detail-key">Intentos de Cobro:</span>
                <span className="tag-attempts">{replayedState.attemptCount || 0}</span>
              </div>
              {replayedState.approvalCode && (
                <div className="state-detail-row">
                  <span className="detail-key">Código de Aprobación:</span>
                  <span className="text-success font-mono font-bold">{replayedState.approvalCode}</span>
                </div>
              )}
              {replayedState.lastRejectionReason && (
                <div className="state-detail-row">
                  <span className="detail-key">Último Rechazo:</span>
                  <span className="text-danger">{replayedState.lastRejectionReason}</span>
                </div>
              )}
              {replayedState.completedAt && (
                <div className="state-detail-row">
                  <span className="detail-key">Completado En:</span>
                  <span className="text-dim text-xs">
                    {new Date(replayedState.completedAt).toLocaleString()}
                  </span>
                </div>
              )}

              <div className="audit-concept-box">
                <h4>Invariantes de Auditoría</h4>
                <p>
                  El estado superior no se almacena en una tabla fija. Se reconstruye en tiempo de ejecución recorriendo los {events.length} eventos inmutables del log.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 text-center text-dim">No hay información de estado disponible</div>
          )}
        </div>

        {/* Right: Chronological Event Stream or Raw JSON Log */}
        <div className="events-stream-card">
          <div className="stream-header">
            <div>
              <h3>
                {viewFormat === 'timeline'
                  ? `Flujo Inmutable Append-Only (${events.length} Eventos)`
                  : `Registro JSON Raw (${events.length} Eventos)`}
              </h3>
              <span className="text-xs text-muted">Fuente: <code>data/event-store.jsonl</code></span>
            </div>

            {viewFormat === 'timeline' && events.length > 0 && (
              <div className="stream-quick-actions">
                <button
                  type="button"
                  className="btn-text-action"
                  onClick={() => setAllExpanded(true)}
                >
                  Expandir Todos
                </button>
                <span className="text-dim">·</span>
                <button
                  type="button"
                  className="btn-text-action"
                  onClick={() => setAllExpanded(false)}
                >
                  Colapsar Todos
                </button>
              </div>
            )}

            {viewFormat === 'raw' && events.length > 0 && (
              <div className="stream-quick-actions">
                <button
                  type="button"
                  className="btn-action-outline-sm"
                  onClick={() => copyToClipboard(JSON.stringify(events, null, 2), 'JSON Completo')}
                >
                  <Copy size={13} />
                  <span>Copiar Todo el JSON</span>
                </button>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="loading-events-notice">
              <RefreshCw size={20} className="icon-spin text-zinc-500" />
              <span>Consultando y reconstruyendo eventos del Event Store...</span>
            </div>
          ) : events.length === 0 ? (
            <div className="empty-events-notice">
              <Inbox size={32} strokeWidth={1.5} className="empty-icon" />
              <p>No se encontraron eventos registrados para esta transacción.</p>
            </div>
          ) : viewFormat === 'timeline' ? (
            /* Visual Timeline View */
            <div className="audit-timeline-flow">
              {events.map((evt) => {
                const isExpanded = !!expandedEvents[evt.version];
                return (
                  <div key={evt.version} className="audit-timeline-step">
                    <div className="step-marker">
                      <span className="version-number">v{evt.version}</span>
                    </div>

                    <div className="step-content-card">
                      <div className="step-header">
                        <div className="step-title-group">
                          <span className={`event-type-tag ${getEventBadgeClass(evt.type)}`}>
                            {evt.type}
                          </span>
                          <span className="event-timestamp">
                            {new Date(evt.occurredAt).toLocaleDateString()} · {new Date(evt.occurredAt).toLocaleTimeString()}
                          </span>
                        </div>

                        <div className="step-actions">
                          <button
                            type="button"
                            className="btn-tiny-copy"
                            onClick={() => copyToClipboard(JSON.stringify(evt.data, null, 2), `Payload v${evt.version}`, `payload-${evt.version}`)}
                            title="Copiar JSON del payload"
                          >
                            {copiedId === `payload-${evt.version}` ? (
                              <Check size={12} className="text-emerald-600" />
                            ) : (
                              <Copy size={12} />
                            )}
                            <span>Copiar Payload</span>
                          </button>
                          <button
                            type="button"
                            className="btn-tiny-toggle"
                            onClick={() => toggleExpand(evt.version)}
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp size={12} />
                                <span>Ocultar</span>
                              </>
                            ) : (
                              <>
                                <ChevronDown size={12} />
                                <span>Ver Payload</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="payload-json-wrapper">
                          <pre className="json-code-block">
                            {JSON.stringify(evt.data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Raw JSON View */
            <div className="raw-json-container">
              <div className="raw-json-meta-bar">
                <span>Total de eventos: <strong>{events.length}</strong></span>
                <span>Tamaño aprox: <strong>{(new Blob([JSON.stringify(events)]).size / 1024).toFixed(2)} KB</strong></span>
              </div>
              <pre className="raw-json-code">
                {JSON.stringify(events, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
