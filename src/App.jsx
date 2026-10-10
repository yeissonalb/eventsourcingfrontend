import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import {
  checkCommandHealth,
  checkHistoryHealth,
  getHistoryTransactions,
} from './api';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import OverviewView from './components/OverviewView';
import TransactionsView from './components/TransactionsView';
import CommandTerminalView from './components/CommandTerminalView';
import EventStoreView from './components/EventStoreView';
import SystemView from './components/SystemView';
import TransactionDrawer from './components/TransactionDrawer';
import Toast from './components/Toast';

function App() {
  // Navigation
  const [currentView, setCurrentView] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Health and Connectivity
  const [commandHealth, setCommandHealth] = useState({ online: false, checking: true, latency: null });
  const [historyHealth, setHistoryHealth] = useState({ online: false, checking: true, latency: null });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Data
  const [transactions, setTransactions] = useState([]);
  const [selectedTxId, setSelectedTxId] = useState(null);
  const [drawerTxId, setDrawerTxId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Notifications
  const [toasts, setToasts] = useState([]);

  const showNotification = useCallback((type, message) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5500);
  }, []);

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Verify health of services
  const verifyHealth = useCallback(async () => {
    const [cmdRes, histRes] = await Promise.all([
      checkCommandHealth(),
      checkHistoryHealth(),
    ]);

    setCommandHealth({
      online: cmdRes.ok,
      checking: false,
      latency: cmdRes.latency,
    });

    setHistoryHealth({
      online: histRes.ok,
      checking: false,
      latency: histRes.latency,
    });
  }, []);

  // Fetch transactions from History service
  const refreshTransactions = useCallback(async (selectId = null) => {
    try {
      const data = await getHistoryTransactions();
      const list = Array.isArray(data) ? data : [];
      setTransactions(list);

      if (selectId) {
        setSelectedTxId(selectId);
      } else if (!selectedTxId && list.length > 0) {
        setSelectedTxId(list[0].transactionId);
      }
    } catch (err) {
      console.warn('Error refreshing transactions:', err);
    }
  }, [selectedTxId]);

  // Combined Refresh
  const handleFullRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([verifyHealth(), refreshTransactions()]);
    setIsRefreshing(false);
    showNotification('success', 'Datos y estado de nodos sincronizados');
  };

  // Initial load & Polling
  useEffect(() => {
    verifyHealth();
    refreshTransactions();
    const interval = setInterval(verifyHealth, 12000);
    return () => clearInterval(interval);
  }, [verifyHealth, refreshTransactions]);

  // Callback when a transaction updates
  const handleTransactionUpdated = async (txId) => {
    await refreshTransactions(txId);
  };

  // Open transaction detail drawer
  const handleSelectTransaction = (txId) => {
    setSelectedTxId(txId);
    setDrawerTxId(txId);
  };

  // Open Command Terminal for new transaction
  const handleOpenNewTransaction = () => {
    setCurrentView('commands');
  };

  return (
    <div className="admin-app-layout">
      {/* Left Sidebar */}
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      {/* Main Content Area */}
      <div className={`admin-main-wrapper ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Header
          currentView={currentView}
          commandHealth={commandHealth}
          historyHealth={historyHealth}
          onRefresh={handleFullRefresh}
          isRefreshing={isRefreshing}
          onOpenNewTransaction={handleOpenNewTransaction}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        <main className="admin-view-content">
          {currentView === 'overview' && (
            <OverviewView
              transactions={transactions}
              onSelectTransaction={handleSelectTransaction}
              onOpenCommandTerminal={() => setCurrentView('commands')}
              onOpenAudit={() => setCurrentView('eventstore')}
            />
          )}

          {currentView === 'transactions' && (
            <TransactionsView
              transactions={transactions}
              onSelectTransaction={handleSelectTransaction}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onOpenNewTransaction={handleOpenNewTransaction}
            />
          )}

          {currentView === 'commands' && (
            <CommandTerminalView
              transactions={transactions}
              selectedTxId={selectedTxId}
              setSelectedTxId={setSelectedTxId}
              onTransactionUpdated={handleTransactionUpdated}
              showNotification={showNotification}
              commandHealth={commandHealth}
            />
          )}

          {currentView === 'eventstore' && (
            <EventStoreView
              transactions={transactions}
              selectedTxId={selectedTxId}
              setSelectedTxId={setSelectedTxId}
              showNotification={showNotification}
            />
          )}

          {currentView === 'system' && (
            <SystemView
              commandHealth={commandHealth}
              historyHealth={historyHealth}
              onRefresh={handleFullRefresh}
              showNotification={showNotification}
              refreshTransactions={refreshTransactions}
            />
          )}
        </main>
      </div>

      {/* Detail Slide-Over Drawer */}
      <TransactionDrawer
        transactionId={drawerTxId}
        onClose={() => setDrawerTxId(null)}
        onTransactionUpdated={handleTransactionUpdated}
        showNotification={showNotification}
      />

      {/* Floating Notifications */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
