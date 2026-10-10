import React from 'react';

export default function Sidebar({ currentView, setCurrentView, collapsed, setCollapsed }) {
  const navItems = [
    {
      group: 'PANEL PRINCIPAL',
      items: [
        {
          id: 'overview',
          label: 'Visión General',
          badge: null,
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
            </svg>
          ),
        },
        {
          id: 'transactions',
          label: 'Transacciones',
          badge: 'En vivo',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h10" />
            </svg>
          ),
        },
      ],
    },
    {
      group: 'OPERACIONES CQRS',
      items: [
        {
          id: 'commands',
          label: 'Terminal de Comandos',
          badge: ':3000',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
          ),
        },
        {
          id: 'eventstore',
          label: 'Event Store & Auditoría',
          badge: ':3001',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
            </svg>
          ),
        },
      ],
    },
    {
      group: 'INFRAESTRUCTURA',
      items: [
        {
          id: 'system',
          label: 'Nodos & Swagger',
          badge: null,
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          ),
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
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        </div>

        {!collapsed && (
          <div className="brand-text">
            <h2>EventCore</h2>
            <span>ADMIN CQRS CONSOLE</span>
          </div>
        )}

        <button
          type="button"
          className="btn-toggle-sidebar"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
          aria-label={collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            {collapsed ? (
              <polyline points="9 18 15 12 9 6" />
            ) : (
              <polyline points="15 18 9 12 15 6" />
            )}
          </svg>
        </button>
      </div>

      {/* Nav groups */}
      <nav className="sidebar-nav">
        {navItems.map((group, gIdx) => (
          <div key={gIdx} className="nav-group">
            {!collapsed && <span className="nav-group-title">{group.group}</span>}
            <ul className="nav-list">
              {group.items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`nav-item-btn ${currentView === item.id ? 'active' : ''}`}
                    onClick={() => setCurrentView(item.id)}
                    title={collapsed ? `${item.label} ${item.badge ? `(${item.badge})` : ''}` : undefined}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    {!collapsed && <span className="nav-label">{item.label}</span>}
                    {!collapsed && item.badge && (
                      <span className="nav-badge">{item.badge}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Operator User Card & Expand Shortcut */}
      <div className="sidebar-footer">
        <div className="operator-avatar" title="Operador Admin - Conectado">
          <span>OP</span>
          <span className="status-indicator-dot online" />
        </div>
        {!collapsed && (
          <div className="operator-info">
            <span className="operator-name">Operador Admin</span>
            <span className="operator-role">Event Sourcing Hub</span>
          </div>
        )}
        {collapsed && (
          <button
            type="button"
            className="btn-collapsed-expand"
            onClick={() => setCollapsed(false)}
            title="Expandir barra lateral"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )}
      </div>
    </aside>
  );
}
