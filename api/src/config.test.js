//Test som kollar att JWT_SECRET läses från miljön och att servern vägrar starta om den saknas.

import { describe, it, expect, vi } from 'vitest'

// config.js läser miljövariabler vid import, så vi laddar om modulen för varje test.
const loadConfig = async () => {
  vi.resetModules()
  return import('./config.js')
}
// TODO: Läs JWT_SECRET från process.env i config.js och kasta ett tydligt fel om den saknas.
// Ta bort den hårdkodade hemligheten och sätt JWT_SECRET vid lokal start och i CI.
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