import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { ref } from "vue";
import { render, screen } from "@testing-library/vue";
import HomeView from "./HomeView.vue";

const { useQuery } = vi.hoisted(() => ({ useQuery: vi.fn() }));
vi.mock("@urql/vue", () => ({ useQuery }));

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

describe("HomeView", () => {
  beforeEach(() => {
    useQuery.mockReset();
  });

  it("visar populära guider med en länk till varje guide", () => {
    useQuery.mockReturnValue(
      queryResult({
        data: {
          popularGuides: [
            {
              id: "3",
              title: "Kungsleden",
              region: "Lappland",
              difficulty: "medel",
              lengthKm: 440,
            },
          ],
        },
      }),
    );

    render(HomeView, { global: { stubs } });

    expect(screen.getByRole("link", { name: "Kungsleden" })).toHaveAttribute(
      "href",
      "/guides/3",
    );
    expect(screen.getByText(/Lappland, medel, 440 km/)).toBeInTheDocument();
  });

  it("ber om sex populära guider", () => {
    useQuery.mockReturnValue(queryResult({ data: { popularGuides: [] } }));

    render(HomeView, { global: { stubs } });

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({ variables: { limit: 6 } }),
    );
  });

  it("visar att guiderna laddas", () => {
    useQuery.mockReturnValue(queryResult({ fetching: true }));

    render(HomeView, { global: { stubs } });

    expect(screen.getByText("Laddar…")).toBeInTheDocument();
  });

  it("visar ett fel när det inte går att hämta guiderna", () => {
    useQuery.mockReturnValue(queryResult({ error: new Error("Nätverksfel") }));

    render(HomeView, { global: { stubs } });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Kunde inte hämta guider.",
    );
  });
});
