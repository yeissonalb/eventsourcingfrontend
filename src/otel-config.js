const SIGNAL_PATHS = {
  traces: '/v1/traces',
  logs: '/v1/logs',
}

export function otelEnabled(flag) {
  return flag === 'true'
}

export function otelSignalUrl(apiBase, signal) {
  const base = (apiBase ?? '').trim().replace(/\/+$/, '')
  return `${base}/otlp${SIGNAL_PATHS[signal]}`
}

export function traceHeaderUrls(apiBases) {
  return apiBases
    .filter(Boolean)
    .map((base) => new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(/|$)`))
}
