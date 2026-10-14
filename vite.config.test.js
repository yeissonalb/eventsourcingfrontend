import { describe, expect, it } from 'vitest'
import { createApiProxies } from './vite.config.js'

describe('proxy de las APIs', () => {
  it('no registra rutas si no hay destinos', () => {
    expect(createApiProxies({})).toEqual({})
  })

  it('reenvía /command-api y /history-api quitando el prefijo', () => {
    const proxies = createApiProxies({
      API_PROXY_TARGET: 'http://transaction-api:3000',
      HISTORY_PROXY_TARGET: 'http://history-api:3001',
    })

    expect(proxies['/command-api'].target).toBe('http://transaction-api:3000')
    expect(proxies['/command-api'].rewrite('/command-api/transactions/t-1')).toBe('/transactions/t-1')
    expect(proxies['/command-api'].rewrite('/command-api/otlp/v1/traces')).toBe('/otlp/v1/traces')
    expect(proxies['/history-api'].target).toBe('http://history-api:3001')
    expect(proxies['/history-api'].rewrite('/history-api/history/transactions')).toBe(
      '/history/transactions',
    )
    expect(proxies['/history-api'].rewrite('/history-api')).toBe('/')
  })
})
