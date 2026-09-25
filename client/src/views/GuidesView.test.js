// Röktest: sviten får vara ett enda test den här veckan (M1). Det ska bevisa att
// pipelinen kör tester – inte att appen är korrekt. Riktiga tester kommer i M2.
import { describe, it, expect, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import GuidesView from "./GuidesView.vue";

describe("GuidesView", () => {
  it("renders the guides from the API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue([
          {
            id: 1,
            title: "Kebnekaise",
            region: "Lappland",
          },
        ]),
      }),
    );

    const wrapper = mount(GuidesView, {
      global: { stubs: { RouterLink: { template: "<a><slot /></a>" } } },
    });
    await flushPromises();
    expect(wrapper.text()).toContain("Kebnekaise");
  });
});
