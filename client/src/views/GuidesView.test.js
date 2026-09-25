// Röktest: sviten får vara ett enda test den här veckan (M1). Det ska bevisa att
// pipelinen kör tester – inte att appen är korrekt. Riktiga tester kommer i M2.
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import GuidesView from './GuidesView.vue'

vi.mock('../api.js', () => ({
  get: vi.fn().mockResolvedValue([
    {
      id: 1,
      slug: 'kebnekaise',
      title: 'Kebnekaise',
      region: 'Lappland',
      summary: 'Sveriges tak',
    },
  ]),
}))

describe('GuidesView', () => {
  it('renders the guides from the API', async () => {
    const wrapper = mount(GuidesView, {
      global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('Kebnekaise')
    expect(wrapper.text()).toContain('1 av 1')
  })
})
