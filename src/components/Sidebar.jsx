import React from 'react';
import {
  Building2,
  Send,
  Receipt,
  Clock,
  Sparkles,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  History,
} from 'lucide-react';

export default function Sidebar({ currentView, setCurrentView, collapsed, setCollapsed }) {
  const navItems = [
    {
      group: 'MI BANCA DIGITAL',
      items: [
        {
          id: 'overview',
          label: 'Inicio & Cuentas',
          icon: Building2,
        },
        {
          id: 'checkout',
          label: 'Transferir / Pagar',
          icon: Send,
        },
        {
          id: 'transactions',
          label: 'Extracto de Movimientos',
          icon: History,
        },
      ],
    },
    {
      group: 'SERVICIOS Y SEGUIMIENTO',
      items: [
        {
          id: 'timeline',
          label: 'Rastreo de Transferencias',
          icon: Clock,
        },
        {
          id: 'simulator',
          label: 'Simulador de Red',
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
          title={collapsed ? 'Haga clic para expandir menú' : undefined}
          style={{ cursor: collapsed ? 'pointer' : 'default' }}
        >
          <Building2 size={22} strokeWidth={2.2} />
        </div>

        {!collapsed && (
          <div className="brand-text">
            <h2>PayBank</h2>
            <span>BANCA DIGITAL & AUDITORÍA</span>
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
        <div className="operator-avatar" title="PayBank Digital">
          <span>PB</span>
          <span className="status-indicator-dot online" />
        </div>
        {!collapsed && (
          <div className="operator-info">
            <span className="operator-name">Banca Empresarial</span>
            <span className="operator-role">Event Sourcing Core</span>
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
