import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/vue";
import ToursView from "./ToursView.vue";

const mockedFetch = vi.fn();

const respondWith = (data: unknown, ok = true, status = 200) =>
  ({ ok, status, json: async () => data }) as Response;

const stubs = {
  RouterLink: {
    props: ["to"],
    template: '<a :href="to"><slot /></a>',
  },
};

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

  it("visar turens uppgifter och en länk till turen", async () => {
    mockedFetch.mockResolvedValue(
      respondWith({
        data: {
          tours: [
            {
              id: "7",
              title: "Kebnekaise runt",
              distanceM: 12345,
              user: { displayName: "Alex" },
              guide: { title: "Fjällvandring" },
              photos: [{ id: "1" }, { id: "2" }],
            },
          ],
        },
      }),
    );

    render(ToursView, { global: { stubs } });

    expect(
      await screen.findByRole("link", { name: "Kebnekaise runt" }),
    ).toHaveAttribute("href", "/tours/7");
    expect(screen.getByText("Alex")).toBeInTheDocument();
    expect(screen.getByText("Fjällvandring")).toBeInTheDocument();
    expect(screen.getByText("12.3 km")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();

    // Hela vyn hämtas med ett enda anrop till /graphql
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(mockedFetch.mock.calls[0]![0]).toBe("/graphql");
  });

  it("visar ett fel när det inte går att hämta turerna", async () => {
    mockedFetch.mockRejectedValue(new Error("Nätverksfel"));

    render(ToursView, { global: { stubs } });

    expect(
      await screen.findByText("Kunde inte ladda turer."),
    ).toBeInTheDocument();
  });

  it("visar ett fel när svaret innehåller errors", async () => {
    mockedFetch.mockResolvedValue(
      respondWith({ errors: [{ message: "Unexpected error." }] }),
    );

    render(ToursView, { global: { stubs } });

    expect(
      await screen.findByText("Kunde inte ladda turer."),
    ).toBeInTheDocument();
  });
});
