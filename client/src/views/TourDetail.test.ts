import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/vue'
import type { TourLog } from '@utpost/shared'
import TourDetail from './TourDetail.vue'

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: '1' } }),
}))

const mockedFetch = vi.fn()

// Kontraktet styr mockdatan: glömmer vi ett fält så säger typecheck ifrån.
const log = (id: number, elevation_m: number | null, heart_rate: number | null): TourLog => ({
  id,
  tour_id: 1,
  recorded_at: '2026-09-01T08:00:00.000Z',
  lat: 67.9,
  lon: 18.5,
  elevation_m,
  heart_rate,
  note: null,
})

// "Låtsassvar" från fetch
const respondWith = (data: unknown, ok = true, status = 200) =>
  ({ ok, status, json: async () => data }) as Response

describe('TourDetail', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockedFetch)
    vi.spyOn(console, 'error').mockImplementation(() => {}) // tysta förväntade fel
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    mockedFetch.mockReset()
  })

  it('hoppar över mätpunkter utan höjd och visar streck i listan', async () => {
    mockedFetch.mockResolvedValue(
      respondWith({
        id: 1,
        title: 'Kebnekaise runt',
        distance_m: 12345,
        notes: null,
        logs: [log(1, 100, 80), log(2, null, null), log(3, 150, 90)],
      }),
    )

    render(TourDetail)
    await screen.findByText('Kebnekaise runt')

    expect(screen.getByText(/50 höjdmeter/)).toBeInTheDocument()
    expect(screen.getByText(/– m · – slag\/min/)).toBeInTheDocument()
  })

  it('visar ett fel när servern svarar 500', async () => {
    mockedFetch.mockResolvedValue(respondWith({}, false, 500))

    render(TourDetail)

    expect(await screen.findByRole('alert')).toHaveTextContent('Kunde inte ladda turen.')
  })
})