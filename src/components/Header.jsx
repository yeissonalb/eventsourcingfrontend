import React from 'react';
import {
  Search,
  X,
  RefreshCw,
  Send,
  Code2,
  Building2,
  Lock,
} from 'lucide-react';

export default function Header({
  currentView,
  onRefresh,
  isRefreshing,
  onOpenNewTransaction,
  searchQuery,
  setSearchQuery,
  isTechnicalMode,
  setIsTechnicalMode,
}) {
  const viewTitles = {
    overview: {
      title: 'Banca Digital & Cuentas',
      subtitle: 'Resumen de saldo disponible, tarjeta platinum y movimientos en tiempo real',
    },
    checkout: {
      title: 'Transferir o Pagar con Tarjeta',
      subtitle: 'Envío de dinero y pasarela bancaria inmediata con verificación de fondos',
    },
    transactions: {
      title: 'Extracto de Movimientos',
      subtitle: 'Historial detallado de débitos, créditos y comprobantes bancarios',
    },
    timeline: {
      title: 'Rastreo de Transferencias',
      subtitle: 'Trazabilidad y compensación interbancaria paso a paso',
    },
    simulator: {
      title: 'Simulador de Red Bancaria',
      subtitle: 'Comprobación de pagos aprobados, rechazos de fondos y compensación',
    },
  };

  const currentMeta = viewTitles[currentView] || {
    title: 'PayBank Digital',
    subtitle: 'Banca Digital & Pagos Seguros en Tiempo Real',
  };

  return (
    <header className="admin-header">
      <div className="header-left">
        <h1 className="header-title">{currentMeta.title}</h1>
        <p className="header-subtitle">{currentMeta.subtitle}</p>
      </div>

      <div className="header-right">
        {/* Bank Security Status Badge */}
        <div className="bank-security-status-badge">
          <Lock size={13} />
          <span>Conexión Segura 256-bit</span>
        </div>

        {/* Action Buttons */}
        <div className="header-actions">
          <button
            type="button"
            className="btn-header-refresh"
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Actualizar saldo y movimientos"
          >
            <RefreshCw size={14} className={isRefreshing ? 'icon-spin' : ''} />
            <span>{isRefreshing ? 'Actualizando...' : 'Actualizar'}</span>
          </button>

          <button
            type="button"
            className="btn-header-create"
            onClick={onOpenNewTransaction}
          >
            <Send size={15} strokeWidth={2.2} />
            <span>Enviar Dinero</span>
          </button>
        </div>
      </div>
    </header>
  );
}
