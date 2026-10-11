import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  CreditCard,
  Database,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

export default function Sidebar({ currentView, setCurrentView, collapsed, setCollapsed }) {
  const navItems = [
    {
      group: 'TRANSACCIONES',
      items: [
        {
          id: 'overview',
          label: 'Panel General',
          icon: LayoutDashboard,
        },
        {
          id: 'transactions',
          label: 'Historial de Pagos',
          icon: Receipt,
        },
        {
          id: 'commands',
          label: 'Procesar un Pago',
          icon: CreditCard,
        },
      ],
    },
    {
      group: 'EVENT SOURCING',
      items: [
        {
          id: 'eventstore',
          label: 'Auditoría y Eventos',
          icon: Database,
        },
        {
          id: 'system',
          label: 'Simulador para Exposición',
          icon: Sparkles,
        },
      ],
    },
  ];

  return (
    <aside className={`admin-sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div
          className="brand-logo-icon"
          onClick={() => collapsed && setCollapsed(false)}
          title={collapsed ? 'Haga clic para expandir barra lateral' : undefined}
          style={{ cursor: collapsed ? 'pointer' : 'default' }}
        >
          <ShieldCheck size={20} strokeWidth={2.2} />
        </div>

        {!collapsed && (
          <div className="brand-text">
            <h2>Auditoría de Pagos</h2>
            <span>EVENT SOURCING DEMO</span>
          </div>
        )}

        <button
          type="button"
          className="btn-toggle-sidebar"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
          aria-label={collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
        >
          {collapsed ? (
            <ChevronRight size={16} strokeWidth={2} />
          ) : (
            <ChevronLeft size={16} strokeWidth={2} />
          )}
        </button>
      </div>

      {/* Nav groups */}
      <nav className="sidebar-nav">
        {navItems.map((group, gIdx) => (
          <div key={gIdx} className="nav-group">
            {!collapsed && <span className="nav-group-title">{group.group}</span>}
            <ul className="nav-list">
              {group.items.map((item) => {
                const IconComponent = item.icon;
                const isActive = currentView === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`nav-item-btn ${isActive ? 'active' : ''}`}
                      onClick={() => setCurrentView(item.id)}
                      title={collapsed ? item.label : undefined}
                    >
                      <span className="nav-icon">
                        <IconComponent size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                      </span>
                      {!collapsed && <span className="nav-label">{item.label}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer Info */}
      <div className="sidebar-footer">
        <div className="operator-avatar" title="Proyecto Paradigmas de Programación">
          <span>ES</span>
          <span className="status-indicator-dot online" />
        </div>
        {!collapsed && (
          <div className="operator-info">
            <span className="operator-name">Equipo del Proyecto</span>
            <span className="operator-role">Event Sourcing · NestJS</span>
          </div>
        )}
        {collapsed && (
          <button
            type="button"
            className="btn-collapsed-expand"
            onClick={() => setCollapsed(false)}
            title="Expandir menú"
          >
            <ChevronRight size={16} strokeWidth={2} />
          </button>
        )}
      </div>
    </aside>
  );
}
