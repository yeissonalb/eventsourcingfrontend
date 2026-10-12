import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { authorizationValue, createOtlpProxy } from '../vite.config.js'
import { otelEnabled, otelSignalUrl, traceHeaderUrls } from './otel-config.js'

const TOKEN = Buffer.from('123456:token-de-prueba').toString('base64')

describe('otelEnabled', () => {
  it('solo se activa con el texto exacto "true"', () => {
    expect(otelEnabled('true')).toBe(true)
    for (const value of [undefined, '', 'TRUE', 'True', '1', ' true', '"true"']) {
      expect(otelEnabled(value)).toBe(false)
    }
  })
})

describe('otelSignalUrl', () => {
  it('usa el mismo origen cuando no hay base de API', () => {
    expect(otelSignalUrl('', 'traces')).toBe('/otlp/v1/traces')
    expect(otelSignalUrl(undefined, 'logs')).toBe('/otlp/v1/logs')
  })

  it('agrega /otlp/v1/<señal> a la base sin duplicar barras', () => {
    expect(otelSignalUrl('https://api.example.com/', 'traces')).toBe(
      'https://api.example.com/otlp/v1/traces',
    )
  })
})

describe('traceHeaderUrls', () => {
  const [command] = traceHeaderUrls(['http://localhost:3000', '', undefined])

  it('propaga la traza solo a las APIs propias', () => {
    expect(traceHeaderUrls(['http://localhost:3000', '', undefined])).toHaveLength(1)
    expect(command.test('http://localhost:3000/transactions')).toBe(true)
    expect(command.test('http://localhost:3000')).toBe(true)
    expect(command.test('http://localhost:30001/transactions')).toBe(false)
    expect(command.test('https://otlp-gateway-prod.grafana.net/otlp')).toBe(false)
  })
})

describe('proxy /otlp de Vite', () => {
  it('decodifica Basic%20 a un espacio', () => {
    expect(authorizationValue(`Authorization=Basic%20${TOKEN}`)).toBe(`Basic ${TOKEN}`)
    expect(authorizationValue(`x-scope=1,authorization=Basic%20${TOKEN}`)).toBe(`Basic ${TOKEN}`)
    expect(authorizationValue('')).toBeUndefined()
  })

  it('no se registra sin endpoint o sin header', () => {
    const headers = `Authorization=Basic%20${TOKEN}`
    expect(createOtlpProxy({ OTEL_EXPORTER_OTLP_HEADERS: headers })).toBeNull()
    expect(
      createOtlpProxy({ OTEL_EXPORTER_OTLP_ENDPOINT: 'https://otlp-gateway-prod.grafana.net/otlp' }),
    ).toBeNull()
  })

  it('apunta al origen del gateway y pone el Authorization del servidor', () => {
    const proxy = createOtlpProxy({
      OTEL_EXPORTER_OTLP_ENDPOINT: 'https://otlp-gateway-prod.grafana.net/otlp',
      OTEL_EXPORTER_OTLP_HEADERS: `Authorization=Basic%20${TOKEN}`,
    })
    expect(proxy.target).toBe('https://otlp-gateway-prod.grafana.net')
    expect(proxy.headers).toEqual({ Authorization: `Basic ${TOKEN}` })
    expect(proxy.changeOrigin).toBe(true)
  })
})

describe('código del navegador', () => {
  function sources(dir) {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) return sources(path)
      return /\.(js|jsx)$/.test(entry.name) && !/\.test\./.test(entry.name) ? [path] : []
    })
  }

  it('no contiene el gateway ni credenciales', () => {
    for (const file of sources(join(import.meta.dirname, '.'))) {
      const text = readFileSync(file, 'utf8')
      expect(text, file).not.toMatch(/grafana\.net|Basic|Authorization|glc_/)
    }
  })
})
