import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export function authorizationValue(headers) {
  for (const pair of (headers ?? '').split(',')) {
    const separator = pair.indexOf('=')
    if (separator < 0) continue
    if (pair.slice(0, separator).trim().toLowerCase() !== 'authorization') continue
    return decodeURIComponent(pair.slice(separator + 1).trim())
  }
  return undefined
}

export function createOtlpProxy(env) {
  const endpoint = env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim()
  const authorization = authorizationValue(env.OTEL_EXPORTER_OTLP_HEADERS)
  if (!endpoint || !authorization) return null
  return {
    target: new URL(endpoint).origin,
    changeOrigin: true,
    secure: true,
    headers: { Authorization: authorization },
  }
}

function prefixProxy(prefix, target) {
  return {
    target,
    changeOrigin: true,
    rewrite: (path) => path.slice(prefix.length) || '/',
  }
}

export function createApiProxies(env) {
  const proxies = {}
  const commandTarget = env.API_PROXY_TARGET?.trim()
  const historyTarget = env.HISTORY_PROXY_TARGET?.trim()
  if (commandTarget) proxies['/command-api'] = prefixProxy('/command-api', commandTarget)
  if (historyTarget) proxies['/history-api'] = prefixProxy('/history-api', historyTarget)
  return proxies
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const otlpProxy = createOtlpProxy(env)
  const routes = { ...createApiProxies(env), ...(otlpProxy ? { '/otlp': otlpProxy } : {}) }
  const proxy = Object.keys(routes).length > 0 ? routes : undefined

  return {
    plugins: [react()],
    server: { proxy },
    preview: { proxy, allowedHosts: true },
  }
})
