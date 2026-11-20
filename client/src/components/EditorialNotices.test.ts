import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref, reactive } from "vue";
import { render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import EditorialNotices from "./EditorialNotices.vue";

const { useQuery, useAuthStore } = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useAuthStore: vi.fn(),
}));
vi.mock("@urql/vue", () => ({ useQuery }));
vi.mock("../stores/auth", () => ({ useAuthStore }));
beforeEach(() => {
  useQuery.mockReset();
  useQuery.mockReturnValue({
    data: ref({ notices: [] }),
    fetching: ref(false),
    error: ref(),
  });
});
describe("Redaktionens förhandsgranskning", () => {
  it("visar ingen kryssruta för medlemmen", () => {
    useAuthStore.mockReturnValue({ user: { role: "member" } });
    render(EditorialNotices);
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(useQuery.mock.calls[0][0].variables.value.preview).toBe(false);
  });
  it("redaktören kan begära utkast; utloggning återgår till publicerat", async () => {
    const auth = reactive<{ user: { role: string } | null }>({
      user: { role: "editor" },
    });
    useAuthStore.mockReturnValue(auth);
    render(EditorialNotices);
    await userEvent.setup().click(screen.getByRole("checkbox"));
    const options = useQuery.mock.calls[0][0];
    expect(options.variables.value.preview).toBe(true);
    expect(options.requestPolicy).toBe("network-only");
    auth.user = null;
    expect(options.variables.value.preview).toBe(false);
  });
});
