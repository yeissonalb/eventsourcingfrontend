import React, { useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Code,
  Layers,
  Sparkles,
  CreditCard,
  Copy,
  Check,
  ChevronRight,
  FileCode,
  ShieldCheck,
  Zap,
  Building2,
  Send,
  Lock,
} from 'lucide-react';
import { STATUS_CONFIG } from '../utils/statusHelpers';

export default function GuideView({ onGoToCheckout, onGoToSimulator }) {
  const [activeTab, setActiveTab] = useState('user-guide'); // 'user-guide' | 'lifecycle' | 'add-state'
  const [copiedSnippet, setCopiedSnippet] = useState(null);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2500);
  };

  return (
    <div className="guide-view-container">
      {/* Top Hero Banner */}
      <div className="bank-guide-hero">
        <div className="guide-hero-badge">
          <Building2 size={15} />
          <span>Manual de Banca Digital y Arquitectura de Pagos</span>
        </div>
        <h2>Guía de Uso Bancario y Creación de Nuevos Estados</h2>
        <p>
          Aprende a realizar transferencias, comprender la compensación interbancaria y descubre cómo los desarrolladores pueden extender el sistema agregando nuevos estados bancarios.
        </p>

        <div className="guide-tabs-nav">
          <button
            type="button"
            className={`guide-tab-btn ${activeTab === 'user-guide' ? 'active' : ''}`}
            onClick={() => setActiveTab('user-guide')}
          >
            <HelpCircle size={16} />
            <span>1. Cómo Usar la Banca Digital (Para Todos)</span>
          </button>
          <button
            type="button"
            className={`guide-tab-btn ${activeTab === 'lifecycle' ? 'active' : ''}`}
            onClick={() => setActiveTab('lifecycle')}
          >
            <Layers size={16} />
            <span>2. Estados Bancarios y Compensación</span>
          </button>
          <button
            type="button"
            className={`guide-tab-btn ${activeTab === 'add-state' ? 'active' : ''}`}
            onClick={() => setActiveTab('add-state')}
          >
            <Code size={16} />
            <span>3. Cómo Agregar Nuevos Estados al Proyecto</span>
          </button>
        </div>
      </div>

      {/* TAB 1: CÓMO USAR LA BANCA DIGITAL */}
      {activeTab === 'user-guide' && (
        <div className="guide-content-section">
          <div className="guide-card">
            <h3 className="section-title">
              <Building2 size={20} className="text-emerald" />
              ¿Cómo funciona este sistema como una aplicación de banco?
            </h3>
            <p className="lead-paragraph">
              En cualquier aplicación bancaria real (como BAC, Nequi, Revolut o Chase), cuando haces una transferencia o pagas en un comercio con tu tarjeta, <strong>el dinero nunca desaparece por arte de magia ni se sobreescribe una fila en la base de datos</strong>.
            </p>
            <p>
              El banco lleva una <strong>bitácora histórica inmutable</strong> (Event Sourcing). Si tu tarjeta fue declinada por falta de saldo y luego recargaste tu cuenta y reintentaste el pago, el banco conserva ambos intentos para garantizar que el dinero cuadre al centavo y no haya fraudes ni disputas.
            </p>

            <div className="guide-steps-grid">
              <div className="guide-step-card">
                <div className="step-number-badge">Paso 1</div>
                <h4>Enviar Dinero / Iniciar Pago</h4>
                <p>
                  En la pestaña <strong>"Transferir / Pagar"</strong>, elige un beneficiario o comercio y el monto a enviar. Presiona <strong>"Confirmar y Transferir"</strong>.
                </p>
                <div className="step-tag status-created">Estado: Pago Preparado</div>
              </div>

              <div className="guide-step-card">
                <div className="step-number-badge">Paso 2</div>
                <h4>Conectar con la Red Bancaria</h4>
                <p>
                  Presiona <strong>"Transmitir a la Red Bancaria"</strong> para simular el paso de la tarjeta por la terminal o datáfono.
                </p>
                <div className="step-tag status-pending">Estado: En Validación</div>
              </div>

              <div className="guide-step-card">
                <div className="step-number-badge">Paso 3</div>
                <h4>Autorización o Declinación</h4>
                <p>
                  Si la cuenta tiene saldo suficiente, presiona <strong>"Autorizar Pago"</strong>. Si la tarjeta está bloqueada o sin fondos, presiona <strong>"Declinación Bancaria"</strong>.
                </p>
                <div className="step-tag status-mixed">Estado: Autorizado o Declinado</div>
              </div>

              <div className="guide-step-card">
                <div className="step-number-badge">Paso 4</div>
                <h4>Comprobante y Liquidación</h4>
                <p>
                  Si fue declinada, puedes presionar <strong>"Reintentar Cobro"</strong>. Si fue aprobada, presiona <strong>"Asentar Fondos y Emitir Comprobante"</strong> para descargar tu voucher oficial.
                </p>
                <div className="step-tag status-completed">Estado: Liquidado en Cuenta</div>
              </div>
            </div>

            <div className="guide-action-cta">
              <div>
                <strong>¿Quieres probar el flujo ahora mismo?</strong>
                <p>Envía dinero desde la pasarela bancaria o corre una simulación interbancaria en 1 solo clic.</p>
              </div>
              <div className="cta-buttons">
                <button type="button" className="btn-cta-primary" onClick={onGoToCheckout}>
                  <Send size={16} />
                  <span>Ir a Transferir Dinero</span>
                </button>
                <button type="button" className="btn-cta-secondary" onClick={onGoToSimulator}>
                  <Zap size={16} />
                  <span>Probar Simulador Bancario</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CICLO DE VIDA DE LOS ESTADOS */}
      {activeTab === 'lifecycle' && (
        <div className="guide-content-section">
          <div className="guide-card">
            <h3 className="section-title">
              <Layers size={20} className="text-emerald" />
              Los 5 Estados del Ciclo de Vida Bancario
            </h3>
            <p>
              Ninguna operación financiera puede saltarse pasos. Una transferencia no puede liquidarse sin antes haber sido autorizada por el emisor.
            </p>

            <div className="states-breakdown-list">
              {Object.values(STATUS_CONFIG).map((st) => (
                <div key={st.key} className="state-detail-row" style={{ borderLeftColor: st.color }}>
                  <div className="state-badge-col">
                    <span className="state-chip" style={{ backgroundColor: st.bgColor, color: st.color, borderColor: st.borderColor }}>
                      {st.stepNumber}. {st.bankStatus || st.label}
                    </span>
                    <span className="code-subtext">{st.key}</span>
                  </div>
                  <div className="state-description-col">
                    <p className="state-main-desc">{st.description}</p>
                    <div className="state-advice-box">
                      <strong>👉 Próximo Paso en la Pasarela:</strong> {st.nextActionAdvice}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <h4 style={{ marginTop: '28px', marginBottom: '12px' }}>Flujo de Compensación Bancaria:</h4>
            <div className="flow-diagram-container">
              <div className="flow-node">
                <div className="flow-box node-created">1. Pago Preparado (CREATED)</div>
                <div className="flow-arrow">➔ Transmitir ➔</div>
                <div className="flow-box node-pending">2. En Validación Bancaria (PAYMENT_PENDING)</div>
              </div>
              <div className="flow-branch-row">
                <div className="branch-line">
                  <span className="branch-label text-success">Si el banco emisor aprueba:</span>
                  <div className="flow-box node-approved">3A. Autorizado (PAYMENT_APPROVED)</div>
                  <div className="flow-arrow">➔ Liquidar ➔</div>
                  <div className="flow-box node-completed">4. Comprobante Emitido (COMPLETED)</div>
                </div>
                <div className="branch-line">
                  <span className="branch-label text-danger">Si el banco emisor declina:</span>
                  <div className="flow-box node-rejected">3B. Declinado (PAYMENT_REJECTED)</div>
                  <div className="flow-arrow">➔ Reintentar ➔</div>
                  <span className="back-to-pending">Vuelve a <strong>En Validación</strong> (Intento #2)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CÓMO CREAR NUEVOS ESTADOS */}
      {activeTab === 'add-state' && (
        <div className="guide-content-section">
          <div className="guide-card">
            <h3 className="section-title">
              <Code size={20} className="text-emerald" />
              Guía Técnica: Cómo Incluir un Nuevo Estado Bancario en el Proyecto
            </h3>
            <p className="lead-paragraph">
              Si tu profesor o equipo solicita agregar un nuevo estado (por ejemplo: <strong>CANCELLED</strong> para anular una transferencia, o <strong>REFUNDED</strong> para un contracargo/reembolso bancario), sigue estos 5 pasos en el código fuente.
            </p>

            {/* Paso 1 */}
            <div className="developer-step-block">
              <div className="dev-step-header">
                <span className="dev-step-num">Paso 1</span>
                <div>
                  <h4>Definir el Nuevo Evento en el Dominio</h4>
                  <span className="file-badge">packages/domain/src/transaction-event.ts</span>
                </div>
              </div>
              <p>
                Agrega el nombre del evento a la lista <code>eventTypes</code> y declara su interfaz de datos:
              </p>
              <div className="code-snippet-box">
                <div className="code-snippet-header">
                  <span>TypeScript</span>
                  <button
                    type="button"
                    className="btn-copy-code"
                    onClick={() =>
                      copyToClipboard(
`export const eventTypes = [
  'TransactionCreated',
  'PaymentRequested',
  'PaymentRejected',
  'PaymentRetried',
  'PaymentApproved',
  'TransactionCompleted',
  'TransactionCancelled', // <-- NUEVO EVENTO
] as const;

export interface TransactionCancelledData {
  reason: string;
  cancelledAt: string;
}

export type TransactionCancelled = EventEnvelope<
  'TransactionCancelled',
  TransactionCancelledData
>;

export type TransactionEvent =
  | TransactionCreated
  | PaymentRequested
  | PaymentRejected
  | PaymentRetried
  | PaymentApproved
  | TransactionCompleted
  | TransactionCancelled;`,
                        'code-1'
                      )
                    }
                  >
                    {copiedSnippet === 'code-1' ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedSnippet === 'code-1' ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
                <pre>{`// 1. Agregar a eventTypes:
export const eventTypes = [
  ...
  'TransactionCancelled', // <-- NUEVO EVENTO
] as const;

// 2. Definir los datos que viajan con el evento:
export interface TransactionCancelledData {
  reason: string;
  cancelledAt: string;
}

export type TransactionCancelled = EventEnvelope<
  'TransactionCancelled',
  TransactionCancelledData
>;`}</pre>
              </div>
            </div>

            {/* Paso 2 */}
            <div className="developer-step-block">
              <div className="dev-step-header">
                <span className="dev-step-num">Paso 2</span>
                <div>
                  <h4>Registrar el Estado y la Regla en la Máquina de Transiciones</h4>
                  <span className="file-badge">packages/domain/src/replay.ts</span>
                </div>
              </div>
              <div className="code-snippet-box">
                <div className="code-snippet-header">
                  <span>TypeScript</span>
                  <button
                    type="button"
                    className="btn-copy-code"
                    onClick={() =>
                      copyToClipboard(
`export type TransactionStatus =
  | 'CREATED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_REJECTED'
  | 'PAYMENT_APPROVED'
  | 'COMPLETED'
  | 'CANCELLED'; // <-- NUEVO ESTADO

function isAllowed(status: TransactionStatus, type: TransactionEvent['type']): boolean {
  switch (status) {
    case 'CREATED':
      return type === 'PaymentRequested' || type === 'TransactionCancelled';
    case 'PAYMENT_PENDING':
      return type === 'PaymentRejected' || type === 'PaymentApproved' || type === 'TransactionCancelled';
    case 'PAYMENT_REJECTED':
      return type === 'PaymentRetried' || type === 'TransactionCancelled';
    case 'PAYMENT_APPROVED':
      return type === 'TransactionCompleted' || type === 'TransactionCancelled';
    case 'COMPLETED':
    case 'CANCELLED':
      return false; // Estados finales
  }
}

// En la función apply:
case 'TransactionCancelled':
  return {
    ...state,
    status: 'CANCELLED',
    lastRejectionReason: event.data.reason,
    version: event.version,
  };`,
                        'code-2'
                      )
                    }
                  >
                    {copiedSnippet === 'code-2' ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedSnippet === 'code-2' ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
                <pre>{`// 1. Añadir al tipo TransactionStatus:
export type TransactionStatus = ... | 'CANCELLED';

// 2. Permitir la transición en isAllowed(...)
// 3. Modificar el estado en la función apply(...)`}</pre>
              </div>
            </div>

            {/* Paso 3 */}
            <div className="developer-step-block">
              <div className="dev-step-header">
                <span className="dev-step-num">Paso 3</span>
                <div>
                  <h4>Crear el Endpoint en NestJS Controller</h4>
                  <span className="file-badge">src/transactions/transactions.controller.ts</span>
                </div>
              </div>
              <div className="code-snippet-box">
                <div className="code-snippet-header">
                  <span>NestJS Controller</span>
                  <pre>{`@Post(':id/cancel')
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: 'Comando: Cancelar operación' })
async cancelTransaction(
  @Param('id') id: string,
  @Body() dto: CancelTransactionDto,
): Promise<TransactionCommandResponseDto> {
  return this.transactionsService.cancelTransaction(id, dto) as any;
}`}</pre>
                </div>
              </div>
            </div>

            {/* Paso 4 */}
            <div className="developer-step-block">
              <div className="dev-step-header">
                <span className="dev-step-num">Paso 4</span>
                <div>
                  <h4>Conectar en el Cliente API del Frontend</h4>
                  <span className="file-badge">eventsourcingfrontend/src/api.js</span>
                </div>
              </div>
              <div className="code-snippet-box">
                <div className="code-snippet-header">
                  <span>JavaScript</span>
                  <pre>{`export async function cancelTransaction(id, { reason, expectedVersion }) {
  const payload = { reason, expectedVersion: Number(expectedVersion) };
  const res = await fetch(\`\${COMMAND_API_BASE}/transactions/\${encodeURIComponent(id)}/cancel\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}`}</pre>
                </div>
              </div>
            </div>

            {/* Paso 5 */}
            <div className="developer-step-block">
              <div className="dev-step-header">
                <span className="dev-step-num">Paso 5</span>
                <div>
                  <h4>Configurar la Etiqueta Bancaria en la UI</h4>
                  <span className="file-badge">eventsourcingfrontend/src/utils/statusHelpers.js</span>
                </div>
              </div>
              <p>Agrega su nombre amigable, icono y color bancario en <code>STATUS_CONFIG</code>.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
