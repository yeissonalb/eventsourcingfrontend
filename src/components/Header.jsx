import React from 'react';
import { COMMAND_API_BASE, HISTORY_API_BASE } from '../api';

export default function Header({
  currentView,
  commandHealth,
  historyHealth,
  onRefresh,
  isRefreshing,
  onOpenNewTransaction,
  searchQuery,
  setSearchQuery,
}) {
  const viewTitles = {
    overview: { title: 'Visión General', subtitle: 'Panel ejecutivo de volumen y métricas del Event Store' },
    transactions: { title: 'Gestión de Transacciones', subtitle: 'Listado interactivo de agregados y ciclos de vida' },
    commands: { title: 'Terminal de Comandos', subtitle: 'Emisión append-only de eventos hacia el servicio de escritura (:3000)' },
    eventstore: { title: 'Event Store Explorer', subtitle: 'Auditoría forense inmutable y trazabilidad de eventos (:3001)' },
    system: { title: 'Nodos & Diagnóstico CQRS', subtitle: 'Estado de servicios, Swagger y configuración de arquitectura' },
  };

  const currentMeta = viewTitles[currentView] || { title: 'Panel de Control', subtitle: 'Event Sourcing System' };

  return (
    <header className="admin-header">
      <div className="header-left">
        <div className="view-breadcrumb">
          <span className="breadcrumb-root">EventCore</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">{currentMeta.title}</span>
        </div>
        <h1 className="header-title">{currentMeta.title}</h1>
        <p className="header-subtitle">{currentMeta.subtitle}</p>
      </div>

      <div className="header-right">
        {/* Global Search Input */}
        <div className="header-search-box">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por ID, cliente, monto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="header-search-input"
          />
          {searchQuery && (
            <button
              type="button"
              className="btn-clear-search"
              onClick={() => setSearchQuery('')}
            >
              ×
            </button>
          )}
        </div>

        {/* Live Service Nodes Status */}
        <div className="header-nodes-status">
          {/* Command Service */}
          <div className="node-status-chip" title={`Command API: ${COMMAND_API_BASE}`}>
            <span className={`node-dot ${commandHealth.online ? 'online' : 'offline'}`} />
            <div className="node-info">
              <span className="node-name">Command :3000</span>
              <span className="node-sub">
                {commandHealth.online ? (
                  <span className="text-success">{commandHealth.latency ? `${commandHealth.latency}ms` : 'Activo'}</span>
                ) : (
                  <span className="text-danger">Offline</span>
                )}
              </span>
            </div>
          </div>

          {/* History Service */}
          <div className="node-status-chip" title={`History API: ${HISTORY_API_BASE}`}>
            <span className={`node-dot ${historyHealth.online ? 'online' : 'offline'}`} />
            <div className="node-info">
              <span className="node-name">History :3001</span>
              <span className="node-sub">
                {historyHealth.online ? (
                  <span className="text-success">{historyHealth.latency ? `${historyHealth.latency}ms` : 'Activo'}</span>
                ) : (
                  <span className="text-danger">Offline</span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="header-actions">
          <button
            type="button"
            className="btn-header-refresh"
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refrescar datos y verificar conectividad"
          >
            <svg
              className={isRefreshing ? 'icon-spin' : ''}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            <span>{isRefreshing ? 'Actualizando...' : 'Refrescar'}</span>
          </button>

          <button
            type="button"
            className="btn-header-create"
            onClick={onOpenNewTransaction}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>+ Nueva Transacción</span>
          </button>
        </div>
      </div>
    </header>
  );
}
