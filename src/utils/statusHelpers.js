// PayBank - Utilidades de lenguaje bancario y financiero para usuarios
// Transforma el motor de Event Sourcing en una experiencia de Banca Digital (Neobanco)

export const STATUS_CONFIG = {
  CREATED: {
    key: 'CREATED',
    label: 'Pago Preparado',
    shortLabel: 'En Espera',
    badgeClass: 'status-badge-created',
    stepNumber: 1,
    color: '#3b82f6',
    bgColor: '#eff6ff',
    borderColor: '#bfdbfe',
    description: 'La orden de pago fue generada. El monto está listo para ser enviado a procesar por la red bancaria.',
    nextActionAdvice: 'Presiona "Procesar Pago Ahora" para debitar la tarjeta o cuenta.',
    techName: 'TransactionCreated (v1)',
    bankStatus: 'Orden Generada',
  },
  PAYMENT_PENDING: {
    key: 'PAYMENT_PENDING',
    label: 'En Validación Bancaria',
    shortLabel: 'Procesando...',
    badgeClass: 'status-badge-pending',
    stepNumber: 2,
    color: '#d97706',
    bgColor: '#fffbeb',
    borderColor: '#fde68a',
    description: 'La transacción está conectándose con la red interbancaria (Visa/Mastercard/SINPE) para verificar fondos.',
    nextActionAdvice: 'Simula si el banco aprueba los fondos o si la tarjeta es rechazada.',
    techName: 'PaymentRequested / Retried',
    bankStatus: 'Verificando con el Emisor',
  },
  PAYMENT_REJECTED: {
    key: 'PAYMENT_REJECTED',
    label: 'Transferencia Rechazada',
    shortLabel: 'Rechazado',
    badgeClass: 'status-badge-rejected',
    stepNumber: 3,
    color: '#dc2626',
    bgColor: '#fef2f2',
    borderColor: '#fecaca',
    description: 'El banco emisor declinó la operación (fondos insuficientes, tarjeta bloqueada o límite excedido).',
    nextActionAdvice: 'Puedes reintentar el cobro con otra tarjeta o saldo disponible.',
    techName: 'PaymentRejected',
    bankStatus: 'Declinada por el Banco',
  },
  PAYMENT_APPROVED: {
    key: 'PAYMENT_APPROVED',
    label: 'Pago Aprobado',
    shortLabel: 'Aprobado',
    badgeClass: 'status-badge-approved',
    stepNumber: 4,
    color: '#059669',
    bgColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    description: '¡Fondos retenidos y autorizados por el banco con código de aprobación único!',
    nextActionAdvice: 'Presiona "Emitir Comprobante Oficial" para asentar y liquidar los fondos.',
    techName: 'PaymentApproved',
    bankStatus: 'Autorizado con Éxito',
  },
  COMPLETED: {
    key: 'COMPLETED',
    label: 'Liquidado y Acreditado',
    shortLabel: 'Completado',
    badgeClass: 'status-badge-completed',
    stepNumber: 5,
    color: '#10b981',
    bgColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    description: 'Transferencia bancaria finalizada, compensada y acreditada en la cuenta destino.',
    nextActionAdvice: 'Comprobante bancario emitido. No requiere más acciones.',
    techName: 'TransactionCompleted',
    bankStatus: 'Comprobante Emitido',
  },
};

export function getStatusInfo(status) {
  return STATUS_CONFIG[status] || {
    key: status || 'UNKNOWN',
    label: status || 'Desconocido',
    shortLabel: status || 'Desconocido',
    badgeClass: 'status-badge-created',
    stepNumber: 0,
    color: '#6b7280',
    bgColor: '#f3f4f6',
    borderColor: '#e5e7eb',
    description: 'Estado no identificado.',
    nextActionAdvice: '',
    techName: status || 'N/A',
    bankStatus: 'Pendiente',
  };
}

export const EVENT_NARRATIVES = {
  TransactionCreated: (event, tx) => {
    const amt = event.data?.amount ?? tx?.amount ?? '';
    const curr = event.data?.currency ?? tx?.currency ?? '';
    const cust = event.data?.customerId ?? tx?.customerId ?? 'Destinatario';
    return {
      title: 'Transferencia Solicitada',
      story: `Se generó la solicitud de pago por ${formatMoney(amt, curr)} con destino a "${cust}".`,
      badge: '1. Origen',
      color: '#3b82f6',
    };
  },
  PaymentRequested: (event, tx) => {
    const amt = event.data?.amount ?? tx?.amount ?? '';
    const curr = tx?.currency ?? '';
    return {
      title: 'Enrutado a Red Bancaria',
      story: `Se envió la orden de débito de ${formatMoney(amt, curr)} a través del procesador interbancario.`,
      badge: '2. En Tránsito',
      color: '#d97706',
    };
  },
  PaymentRejected: (event) => {
    const reason = event.data?.reason || 'Sin motivo especificado';
    return {
      title: 'Operación Declinada por el Banco Emisor',
      story: `El procesador bancario rechazó el débito: "${reason}".`,
      badge: 'Alerta Bancaria',
      color: '#dc2626',
    };
  },
  PaymentRetried: (event) => {
    const attempt = event.data?.attemptNumber || 2;
    return {
      title: `Reintento de Procesamiento #${attempt}`,
      story: `Se ejecutó un reintento de cobro número ${attempt} con confirmación del cliente.`,
      badge: `Intento #${attempt}`,
      color: '#ea580c',
    };
  },
  PaymentApproved: (event) => {
    const code = event.data?.approvalCode || 'AUTH-OK';
    return {
      title: 'Fondos Autorizados por el Banco',
      story: `El banco autorizó y reservó los fondos satisfactoriamente. Número de autorización: ${code}.`,
      badge: 'Autorizado',
      color: '#059669',
    };
  },
  TransactionCompleted: (event) => {
    return {
      title: 'Comprobante Emitido y Fondos Compensados',
      story: 'La transferencia se asentó de forma irreversible en el libro de auditoría y se emitió el recibo.',
      badge: 'Liquidado',
      color: '#10b981',
    };
  },
};

export function getEventNarrative(event, tx) {
  const handler = EVENT_NARRATIVES[event?.type];
  if (handler) {
    return handler(event, tx);
  }
  return {
    title: event?.type || 'Movimiento Bancario',
    story: `Se registró el evento bancario: ${event?.type}.`,
    badge: 'Evento',
    color: '#6b7280',
  };
}

// Tipos de Cambio y Configuración Multidivisa Oficial
export const CURRENCY_CONFIG = {
  CRC: {
    code: 'CRC',
    symbol: '₡',
    name: 'Colón Costarricense',
    rateToCRC: 1,
    flag: '🇨🇷',
    description: 'Moneda base de la cuenta',
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'Dólar Estadounidense',
    rateToCRC: 520.0,
    flag: '🇺🇸',
    description: 'Tipo de cambio interbancario: 1 USD = ₡520.00',
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    rateToCRC: 565.0,
    flag: '🇪🇺',
    description: 'Tipo de cambio interbancario: 1 EUR = ₡565.00',
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'Libra Esterlina',
    rateToCRC: 675.0,
    flag: '🇬🇧',
    description: 'Tipo de cambio interbancario: 1 GBP = ₡675.00',
  },
  CAD: {
    code: 'CAD',
    symbol: '$',
    name: 'Dólar Canadiense',
    rateToCRC: 385.0,
    flag: '🇨🇦',
    description: 'Tipo de cambio interbancario: 1 CAD = ₡385.00',
  },
  MXN: {
    code: 'MXN',
    symbol: '$',
    name: 'Peso Mexicano',
    rateToCRC: 28.5,
    flag: '🇲🇽',
    description: 'Tipo de cambio interbancario: 1 MXN = ₡28.50',
  },
};

/**
 * Convierte cualquier monto de la moneda especificada a colones (CRC)
 */
export function convertToCRC(amount, currency = 'CRC') {
  const num = Number(amount);
  if (isNaN(num) || num <= 0) return 0;
  const curr = (currency || 'CRC').toUpperCase();
  const rate = CURRENCY_CONFIG[curr]?.rateToCRC || 1;
  return num * rate;
}

/**
 * Obtiene la información y tipo de cambio de una moneda
 */
export function getCurrencyInfo(currency = 'CRC') {
  const curr = (currency || 'CRC').toUpperCase();
  return (
    CURRENCY_CONFIG[curr] || {
      code: curr,
      symbol: '$',
      name: curr,
      rateToCRC: 1,
      flag: '🌐',
      description: `1 ${curr} = ₡1.00`,
    }
  );
}

export function formatMoney(amount, currency = 'CRC') {
  if (amount === undefined || amount === null || isNaN(Number(amount))) return '0.00';
  const num = Number(amount);
  const formatted = num.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const curr = (currency || 'CRC').toUpperCase();
  const info = CURRENCY_CONFIG[curr];
  if (info) {
    if (curr === 'CRC') return `₡${formatted}`;
    if (curr === 'USD') return `$${formatted} USD`;
    if (curr === 'EUR') return `€${formatted} EUR`;
    if (curr === 'GBP') return `£${formatted} GBP`;
    return `${info.symbol}${formatted} ${curr}`;
  }
  return `${formatted} ${curr}`;
}

export function formatDateTime(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('es-CR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}
