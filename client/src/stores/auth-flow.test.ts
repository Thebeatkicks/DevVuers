import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useAuthStore } from "./auth";
import { useSessionStore } from "./session";
import { getToken, setToken } from "../lib/token";
import { post } from "../api";
import router from "../router";

const user = {
  id: 1,
  email: "medlem@utpost.se",
  display_name: "Medlem",
  role: "member" as const,
  created_at: "2026-11-17T00:00:00Z",
};
const fetchMock = vi.fn();

describe("M8: gemensam inloggning för vyer, router och API", () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    setToken(null);
    localStorage.clear();
    sessionStorage.clear();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    await router.push("/");
  });

  afterEach(() => {
    setToken(null);
    vi.unstubAllGlobals();
  });

  it("skickar utloggade till login och släpper igenom efter login med samma token i API-anropet", async () => {
    await router.push("/tours/1");
    expect(router.currentRoute.value.path).toBe("/logga-in");
    expect(router.currentRoute.value.query.till).toBe("/tours/1");

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ token: "jwt-test", user })),
    );
    await useAuthStore().login({ email: user.email, password: "hemligt123" });
    expect(useSessionStore().isLoggedIn).toBe(true);
    expect(useSessionStore().user).toEqual(user);
    await router.push("/tours/1");
    expect(router.currentRoute.value.path).toBe("/tours/1");

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ id: 1 })));
    await post("/photos", {
      tourId: 1,
      filename: "test.jpg",
      width: 100,
      height: 100,
    });
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/photos",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer jwt-test" }),
      }),
    );
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);

    await useSessionStore().logout();
    expect(useAuthStore().isLoggedIn).toBe(false);
    expect(getToken()).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await router.push("/tours/1");
    expect(router.currentRoute.value.path).toBe("/logga-in");
  });

  it("registrering använder samma auth-tillstånd som guarden och profilvyn", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ token: "jwt-register", user })),
    );
    await useSessionStore().register({
      email: user.email,
      password: "hemligt123",
      displayName: "Medlem",
    });
    expect(useAuthStore().user).toEqual(user);
    expect(getToken()).toBe("jwt-register");
    expect(router.currentRoute.value.path).toBe("/profile");
    expect(localStorage.length).toBe(0);
  });

  it("ett nytt apptillstånd efter omladdning är utloggat", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ token: "jwt-test", user })),
    );
    await useAuthStore().login({ email: user.email, password: "hemligt123" });
    setToken(null);
    setActivePinia(createPinia());
    await router.push("/tours/1");
    expect(router.currentRoute.value.path).toBe("/logga-in");
    expect(useSessionStore().isLoggedIn).toBe(false);
  });
});
