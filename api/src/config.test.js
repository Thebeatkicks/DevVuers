//Test som kollar att JWT_SECRET läses från miljön och att servern vägrar starta om den saknas.

import { describe, it, expect, vi, afterEach } from 'vitest'

// config.js läser miljövariabler vid import, så vi laddar om modulen för varje test.
const loadConfig = async () => {
  vi.resetModules()
  return import('./config.js')
}
afterEach(() => vi.unstubAllEnvs())

describe('Databas-konfiguration', () => {
  it('läser DATABASE_URL och MONGO_URL från miljön', async () => {
    vi.stubEnv('JWT_SECRET', 'hemlighet-for-testet')
    vi.stubEnv('DATABASE_URL', 'postgres://localhost:5544/test')
    vi.stubEnv('MONGO_URL', 'mongodb://localhost:27018/test')

    const { config } = await loadConfig()

    expect(config.databaseUrl).toBe('postgres://localhost:5544/test')
    expect(config.mongoUrl).toBe('mongodb://localhost:27018/test')
  })

  it('använder lokala Compose-adresser när databasvariablerna saknas', async () => {
    vi.stubEnv('JWT_SECRET', 'hemlighet-for-testet')
    vi.stubEnv('DATABASE_URL', undefined)
    vi.stubEnv('MONGO_URL', undefined)

    const { config } = await loadConfig()

    expect(config.databaseUrl).toBe('postgres://utpost:utpost@localhost:5433/utpost')
    expect(config.mongoUrl).toBe('mongodb://utpost:utpost@localhost:27017/utpost?authSource=admin')
  })
})

describe('JWT-konfiguration', () => {
  it('läser JWT_SECRET från miljön', async () => {
    vi.stubEnv('JWT_SECRET', 'hemlighet-for-testet')

    const { config } = await loadConfig()

    expect(config.jwtSecret).toBe('hemlighet-for-testet')
  })

  it('vägrar starta om JWT_SECRET saknas', async () => {
    vi.stubEnv('JWT_SECRET', '')

    await expect(loadConfig()).rejects.toThrow(/JWT_SECRET/)
  })
})
