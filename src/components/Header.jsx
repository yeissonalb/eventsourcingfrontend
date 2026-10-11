import React from 'react';
import { Search, X, RefreshCw, Plus } from 'lucide-react';

export default function Header({
  currentView,
  onRefresh,
  isRefreshing,
  onOpenNewTransaction,
  searchQuery,
  setSearchQuery,
}) {
  const viewTitles = {
    overview: {
      title: 'Panel General',
      subtitle: 'Resumen de transacciones y demostración del patrón Event Sourcing',
    },
    transactions: {
      title: 'Historial de Pagos',
      subtitle: 'Consulta el listado completo y el estado actual de cada operación',
    },
    commands: {
      title: 'Procesar un Pago',
      subtitle: 'Generación controlada de los 6 eventos del ciclo de vida',
    },
    eventstore: {
      title: 'Auditoría y Eventos',
      subtitle: 'Secuencia de eventos inmutables y reconstrucción en vivo con replay',
    },
    system: {
      title: 'Simulador para Exposición',
      subtitle: 'Ejecuta en un solo clic el flujo de 6 eventos para la defensa del proyecto',
    },
  };

  const currentMeta = viewTitles[currentView] || {
    title: 'Auditoría de Transacciones',
    subtitle: 'Demostración de Event Sourcing',
  };

  return (
    <header className="admin-header">
      <div className="header-left">
        <h1 className="header-title">{currentMeta.title}</h1>
        <p className="header-subtitle">{currentMeta.subtitle}</p>
      </div>

      <div className="header-right">
        {/* Global Search Input */}
        <div className="header-search-box">
          <Search size={15} className="search-icon" />
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
              title="Limpiar búsqueda"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="header-actions">
          <button
            type="button"
            className="btn-header-refresh"
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Actualizar datos"
          >
            <RefreshCw size={14} className={isRefreshing ? 'icon-spin' : ''} />
            <span>{isRefreshing ? 'Cargando...' : 'Actualizar'}</span>
          </button>

          <button
            type="button"
            className="btn-header-create"
            onClick={onOpenNewTransaction}
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Nuevo Pago</span>
          </button>
        </div>
      </div>
    </header>
  );
}
