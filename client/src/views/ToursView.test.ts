import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/vue";
import ToursView from "./ToursView.vue";

const mockedFetch = vi.fn();

const respondWith = (data: unknown, ok = true, status = 200) =>
  ({ ok, status, json: async () => data }) as Response;

describe("ToursView", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockedFetch);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    mockedFetch.mockReset();
  });
  //test 1
  it("visar turens uppgifter och en länk till turen", async () => {
    mockedFetch.mockResolvedValue(
      respondWith([
        {
          id: 7,
          title: "Kebnekaise runt",
          distance_m: 12345,
          user: { display_name: "Alex" },
          guide: { title: "Fjällvandring" },
          photos: [{ id: 1 }, { id: 2 }],
        },
      ]),
    );

    render(ToursView, {
      global: {
        stubs: {
          RouterLink: {
            props: ["to"],
            template: '<a :href="to"><slot /></a>',
          },
        },
      },
    });

    expect(
      await screen.findByRole("link", { name: "Kebnekaise runt" }),
    ).toHaveAttribute("href", "/tours/7");
    expect(screen.getByText("Alex")).toBeInTheDocument();
    expect(screen.getByText("Fjällvandring")).toBeInTheDocument();
    expect(screen.getByText("12.3 km")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  //test 2
  it("visar ett fel när det inte går att hämta turerna", async () => {
    mockedFetch.mockRejectedValue(new Error("Nätverksfel"));

    render(ToursView);

    expect(
      await screen.findByText("Kunde inte ladda turer."),
    ).toBeInTheDocument();
  });
});
