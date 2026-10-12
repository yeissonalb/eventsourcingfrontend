import { logs, SeverityNumber } from '@opentelemetry/api-logs'
import { ZoneContextManager } from '@opentelemetry/context-zone'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load'
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { BatchLogRecordProcessor, LoggerProvider } from '@opentelemetry/sdk-logs'
import { BatchSpanProcessor, WebTracerProvider } from '@opentelemetry/sdk-trace-web'
import { COMMAND_API_BASE, HISTORY_API_BASE } from './api.js'
import { otelEnabled, otelSignalUrl, traceHeaderUrls } from './otel-config.js'

export function initOtel() {
  if (!otelEnabled(import.meta.env.VITE_OTEL_ENABLED)) return

  try {
    const resource = resourceFromAttributes({
      'service.name': 'eventsourcing-fe',
      'deployment.environment': import.meta.env.VITE_DEPLOYMENT_ENVIRONMENT?.trim()
        || (import.meta.env.DEV ? 'local' : 'production'),
    })
    const apiBase = import.meta.env.VITE_API_BASE_URL

    new WebTracerProvider({
      resource,
      spanProcessors: [
        new BatchSpanProcessor(new OTLPTraceExporter({ url: otelSignalUrl(apiBase, 'traces') })),
      ],
    }).register({ contextManager: new ZoneContextManager() })

    const loggerProvider = new LoggerProvider({
      resource,
      processors: [
        new BatchLogRecordProcessor({
          exporter: new OTLPLogExporter({ url: otelSignalUrl(apiBase, 'logs') }),
        }),
      ],
    })
    logs.setGlobalLoggerProvider(loggerProvider)
    const logger = logs.getLogger('eventsourcing-fe')

    window.addEventListener('error', (event) => {
      logger.emit({
        severityNumber: SeverityNumber.ERROR,
        severityText: 'ERROR',
        body: event.message || 'Unhandled error',
        attributes: { 'error.type': event.error?.name ?? 'Error' },
      })
    })
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason
      logger.emit({
        severityNumber: SeverityNumber.ERROR,
        severityText: 'ERROR',
        body: reason instanceof Error ? reason.message : String(reason),
        attributes: { 'error.type': reason?.name ?? 'UnhandledRejection' },
      })
    })

    registerInstrumentations({
      instrumentations: [
        new FetchInstrumentation({
          ignoreUrls: [/\/otlp/],
          propagateTraceHeaderCorsUrls: traceHeaderUrls([COMMAND_API_BASE, HISTORY_API_BASE]),
        }),
        new DocumentLoadInstrumentation(),
      ],
    })
  } catch (error) {
    console.warn('OpenTelemetry init failed', error)
  }
}
