import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { ref } from "vue";
import { render, screen } from "@testing-library/vue";
import ToursView from "./ToursView.vue";

const { useQuery } = vi.hoisted(() => ({ useQuery: vi.fn() }));
vi.mock("@urql/vue", () => ({ useQuery }));

// Samma form som urqls useQuery returnerar: refs för data, fetching och error.
const queryResult = (state: {
  data?: unknown;
  fetching?: boolean;
  error?: unknown;
}) => ({
  data: ref(state.data),
  fetching: ref(state.fetching ?? false),
  error: ref(state.error),
});

const stubs = {
  RouterLink: {
    props: ["to"],
    template: '<a :href="to"><slot /></a>',
  },
};

describe("ToursView", () => {
  beforeEach(() => {
    useQuery.mockReset();
  });

  it("visar turens uppgifter och en länk till turen", async () => {
    useQuery.mockReturnValue(
      queryResult({
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
  });

  it("ber om de 50 senaste turerna", () => {
    useQuery.mockReturnValue(queryResult({ data: { tours: [] } }));

    render(ToursView, { global: { stubs } });

    expect(useQuery).toHaveBeenCalledTimes(1);
    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({ variables: { limit: 50 } }),
    );
  });

  it("visar att turerna laddas", () => {
    useQuery.mockReturnValue(queryResult({ fetching: true }));

    render(ToursView, { global: { stubs } });

    expect(screen.getByText("Laddar turer...")).toBeInTheDocument();
  });

  it("visar ett fel när det inte går att hämta turerna", () => {
    useQuery.mockReturnValue(queryResult({ error: new Error("Nätverksfel") }));

    render(ToursView, { global: { stubs } });

    expect(screen.getByText("Kunde inte ladda turer.")).toBeInTheDocument();
  });
});
