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
import CheckoutView from './components/CheckoutView';
import TransactionsView from './components/TransactionsView';
import EventStoreView from './components/EventStoreView';
import SystemView from './components/SystemView';
import TransactionDrawer from './components/TransactionDrawer';
import Toast from './components/Toast';

const INITIAL_BALANCE = 150000; // Saldo inicial por defecto en Colones (₡150,000)

function App() {
  // Navigation
  const [currentView, setCurrentView] = useState('overview'); // 'overview' | 'checkout' | 'transactions' | 'timeline' | 'simulator' | 'guide'
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isTechnicalMode, setIsTechnicalMode] = useState(false);

  // Health and Connectivity
  const [commandHealth, setCommandHealth] = useState({ online: false, checking: true, latency: null });
  const [historyHealth, setHistoryHealth] = useState({ online: false, checking: true, latency: null });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Account Balance State (Persisted in localStorage)
  // Account Balance State (Persisted in localStorage)
  const [accountBalance, setAccountBalance] = useState(() => {
    try {
      const saved = localStorage.getItem('paybank_account_balance');
      if (saved !== null) {
        const val = Number(saved);
        if (!isNaN(val) && val >= 0) return val;
      }
    } catch (e) {
      console.warn('Could not read balance from localStorage:', e);
    }
    return INITIAL_BALANCE;
  });

// Helper to filter out duplicate recharges (e.g. from React StrictMode duplicate execution)
function deduplicateRecharges(list) {
  if (!Array.isArray(list)) return [];
  const result = [];
  for (let i = 0; i < list.length; i++) {
    const curr = list[i];
    if (!curr) continue;
    const isDup = result.some((prev) => {
      if (prev.id && curr.id && prev.id === curr.id) return true;
      const t1 = new Date(prev.timestamp).getTime();
      const t2 = new Date(curr.timestamp).getTime();
      const timeDiff = Math.abs(t1 - t2);
      return (
        timeDiff < 4000 &&
        Number(prev.amount) === Number(curr.amount) &&
        prev.method === curr.method
      );
    });
    if (!isDup) {
      result.push(curr);
    }
  }
  return result;
}

  // Recharge History State (Persisted in localStorage with auto-deduplication)
  const [rechargeHistory, setRechargeHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('paybank_recharge_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return deduplicateRecharges(parsed);
        }
      }
    } catch (e) {
      console.warn('Could not read recharge history:', e);
    }
    return [
      {
        id: 'REC-INIT',
        timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
        amount: INITIAL_BALANCE,
        method: 'Apertura de Cuenta / Depósito Inicial',
        note: 'Saldo inicial de cortesía bancaria',
        balanceAfter: INITIAL_BALANCE,
      },
    ];
  });

  // Save balance to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('paybank_account_balance', accountBalance.toString());
    } catch (e) {
      console.warn('Could not save balance to localStorage:', e);
    }
  }, [accountBalance]);

  // Save recharge history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('paybank_recharge_history', JSON.stringify(rechargeHistory));
    } catch (e) {
      console.warn('Could not save recharge history:', e);
    }
  }, [rechargeHistory]);

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
    }, 5000);
  }, []);

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Recharge Balance Function (Fixed: no side-effects inside functional state updaters)
  const handleRechargeBalance = useCallback((amount, method = 'Depósito Manual', note = '') => {
    const num = Number(amount);
    if (isNaN(num) || num <= 0) {
      showNotification('error', 'Por favor ingresa un monto válido mayor a 0');
      return false;
    }

    const currentBal = accountBalance;
    const newTotal = currentBal + num;
    const formatted = num.toLocaleString('es-CR', { minimumFractionDigits: 2 });
    const formattedTotal = newTotal.toLocaleString('es-CR', { minimumFractionDigits: 2 });

    const newEntry = {
      id: `REC-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: new Date().toISOString(),
      amount: num,
      method,
      note: note || 'Recarga de fondos manual para pruebas',
      balanceBefore: currentBal,
      balanceAfter: newTotal,
    };

    // Update state independently
    setAccountBalance(newTotal);
    setRechargeHistory((prev) => deduplicateRecharges([newEntry, ...prev]));

    showNotification('success', `¡Depósito Acreditado! +₡${formatted} (${method}). Saldo disponible: ₡${formattedTotal}`);
    return true;
  }, [accountBalance, showNotification]);

  // Deduct Balance Function (when a transfer is finalized/approved)
  const handleDeductBalance = useCallback((amount) => {
    const num = Number(amount);
    if (isNaN(num) || num <= 0) return;

    const currentBal = accountBalance;
    const newTotal = Math.max(0, currentBal - num);
    const formatted = num.toLocaleString('es-CR', { minimumFractionDigits: 2 });
    const formattedTotal = newTotal.toLocaleString('es-CR', { minimumFractionDigits: 2 });

    setAccountBalance(newTotal);
    showNotification('success', `Débito aplicado en cuenta: -₡${formatted}. Saldo restante: ₡${formattedTotal}`);
  }, [accountBalance, showNotification]);

  // Reset Balance to default or specific amount
  const handleResetBalance = useCallback((amount = INITIAL_BALANCE) => {
    setAccountBalance(amount);
    const resetEntry = {
      id: `REC-RESET-${Date.now()}`,
      timestamp: new Date().toISOString(),
      amount,
      method: 'Restablecimiento de Fondos',
      note: 'Reinicio manual de saldo a valor inicial',
      balanceAfter: amount,
    };
    setRechargeHistory((prev) => deduplicateRecharges([resetEntry, ...prev]));
    showNotification('success', `Saldo reiniciado a ₡${amount.toLocaleString('es-CR', { minimumFractionDigits: 2 })}`);
  }, [showNotification]);

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
    showNotification('success', 'Datos bancarios sincronizados con éxito');
  };

  // Initial load & Polling
  useEffect(() => {
    verifyHealth();
    refreshTransactions();
    const interval = setInterval(verifyHealth, 15000);
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

  // Open Checkout for new transaction
  const handleOpenNewTransaction = () => {
    setCurrentView('checkout');
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
          onRefresh={handleFullRefresh}
          isRefreshing={isRefreshing}
          onOpenNewTransaction={handleOpenNewTransaction}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isTechnicalMode={isTechnicalMode}
          setIsTechnicalMode={setIsTechnicalMode}
        />

        <main className="admin-view-content">
          {currentView === 'overview' && (
            <OverviewView
              transactions={transactions}
              accountBalance={accountBalance}
              rechargeHistory={rechargeHistory}
              onRechargeBalance={handleRechargeBalance}
              onResetBalance={handleResetBalance}
              onSelectTransaction={handleSelectTransaction}
              onOpenCheckout={() => setCurrentView('checkout')}
              onOpenSimulator={() => setCurrentView('simulator')}
              onOpenTransactions={() => setCurrentView('transactions')}
            />
          )}

          {currentView === 'checkout' && (
            <CheckoutView
              transactions={transactions}
              selectedTxId={selectedTxId}
              setSelectedTxId={setSelectedTxId}
              accountBalance={accountBalance}
              onDeductBalance={handleDeductBalance}
              onRechargeBalance={handleRechargeBalance}
              onOpenRecharge={() => setCurrentView('overview')}
              onTransactionUpdated={handleTransactionUpdated}
              showNotification={showNotification}
            />
          )}

          {currentView === 'transactions' && (
            <TransactionsView
              transactions={transactions}
              onSelectTransaction={handleSelectTransaction}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onOpenNewTransaction={handleOpenNewTransaction}
              isTechnicalMode={false}
            />
          )}

          {currentView === 'timeline' && (
            <EventStoreView
              transactions={transactions}
              selectedTxId={selectedTxId}
              setSelectedTxId={setSelectedTxId}
              showNotification={showNotification}
              isTechnicalMode={false}
            />
          )}

          {currentView === 'simulator' && (
            <SystemView
              commandHealth={commandHealth}
              historyHealth={historyHealth}
              showNotification={showNotification}
              refreshTransactions={refreshTransactions}
              onGoToTimeline={() => setCurrentView('timeline')}
              onDeductBalance={handleDeductBalance}
            />
          )}
        </main>
      </div>

      {/* Detail Slide-Over Drawer */}
      <TransactionDrawer
        transactionId={drawerTxId}
        accountBalance={accountBalance}
        onDeductBalance={handleDeductBalance}
        onClose={() => setDrawerTxId(null)}
        onTransactionUpdated={handleTransactionUpdated}
        showNotification={showNotification}
        isTechnicalMode={isTechnicalMode}
      />

      {/* Floating Notifications */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
