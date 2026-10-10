// Advanced API Client for Command Service and History Service

const cleanUrl = (url, fallback) => {
  const target = url || fallback;
  return target.trim().replace(/\/+$/, '');
};

export const COMMAND_API_BASE = cleanUrl(import.meta.env.VITE_API_URL, 'http://localhost:3000');
export const HISTORY_API_BASE = cleanUrl(import.meta.env.VITE_HISTORY_API_URL, 'http://localhost:3001');

async function handleResponse(res) {
  if (!res.ok) {
    let errorDetail = '';
    try {
      const errorJson = await res.json();
      if (Array.isArray(errorJson.message)) {
        errorDetail = errorJson.message.join(', ');
      } else if (errorJson.message) {
        errorDetail = errorJson.message;
      } else {
        errorDetail = JSON.stringify(errorJson);
      }
    } catch {
      errorDetail = await res.text().catch(() => res.statusText);
    }
    const err = new Error(errorDetail || `Error HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// Health checks with latency measurement
export async function checkCommandHealth() {
  const start = performance.now();
  try {
    const res = await fetch(`${COMMAND_API_BASE}/transactions`, { method: 'GET' });
    const latency = Math.round(performance.now() - start);
    return { ok: res.ok, status: res.status, latency };
  } catch (error) {
    return { ok: false, error: error.message, latency: null };
  }
}

export async function checkHistoryHealth() {
  const start = performance.now();
  try {
    const res = await fetch(`${HISTORY_API_BASE}/history/transactions`, { method: 'GET' });
    const latency = Math.round(performance.now() - start);
    return { ok: res.ok, status: res.status, latency };
  } catch (error) {
    return { ok: false, error: error.message, latency: null };
  }
}

// Command API Operations (Port 3000)
export async function createTransaction({ transactionId, amount, currency, customerId }) {
  const payload = {
    amount: Number(amount),
    currency: currency.trim().toUpperCase(),
    customerId: customerId.trim(),
  };
  if (transactionId && transactionId.trim()) {
    payload.transactionId = transactionId.trim();
  }

  const res = await fetch(`${COMMAND_API_BASE}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function requestPayment(id, { paymentId, amount, expectedVersion }) {
  const payload = {};
  if (paymentId && paymentId.trim()) payload.paymentId = paymentId.trim();
  if (amount !== undefined && amount !== null && amount !== '') payload.amount = Number(amount);
  if (expectedVersion !== undefined && expectedVersion !== null) payload.expectedVersion = Number(expectedVersion);

  const res = await fetch(`${COMMAND_API_BASE}/transactions/${encodeURIComponent(id)}/request-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function rejectPayment(id, { reason, expectedVersion }) {
  const payload = { reason };
  if (expectedVersion !== undefined && expectedVersion !== null) payload.expectedVersion = Number(expectedVersion);

  const res = await fetch(`${COMMAND_API_BASE}/transactions/${encodeURIComponent(id)}/reject-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function retryPayment(id, { attemptNumber, expectedVersion }) {
  const payload = {};
  if (attemptNumber) payload.attemptNumber = Number(attemptNumber);
  if (expectedVersion !== undefined && expectedVersion !== null) payload.expectedVersion = Number(expectedVersion);

  const res = await fetch(`${COMMAND_API_BASE}/transactions/${encodeURIComponent(id)}/retry-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function approvePayment(id, { approvalCode, expectedVersion }) {
  const payload = { approvalCode };
  if (expectedVersion !== undefined && expectedVersion !== null) payload.expectedVersion = Number(expectedVersion);

  const res = await fetch(`${COMMAND_API_BASE}/transactions/${encodeURIComponent(id)}/approve-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function completeTransaction(id, { completedAt, expectedVersion }) {
  const payload = {};
  if (completedAt) payload.completedAt = completedAt;
  if (expectedVersion !== undefined && expectedVersion !== null) payload.expectedVersion = Number(expectedVersion);

  const res = await fetch(`${COMMAND_API_BASE}/transactions/${encodeURIComponent(id)}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

// History API Operations (Port 3001)
export async function getHistoryTransactions() {
  const res = await fetch(`${HISTORY_API_BASE}/history/transactions`);
  return handleResponse(res);
}

export async function getTransactionHistoryEvents(id) {
  const res = await fetch(`${HISTORY_API_BASE}/history/transactions/${encodeURIComponent(id)}/events`);
  return handleResponse(res);
}

export async function getTransactionHistoryState(id) {
  const res = await fetch(`${HISTORY_API_BASE}/history/transactions/${encodeURIComponent(id)}`);
  return handleResponse(res);
}
