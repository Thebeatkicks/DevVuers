import { ref, computed } from "vue";
import { defineStore } from "pinia";
import { 
  login as apiLogin, 
  logout as apiLogout,
  register as apiRegister,
} from "@/api/auth";
import type { LoginRequest, RegisterRequest, User } from "../../../shared/src/types";
import router from "@/router";

export const useSessionStore = defineStore("session", () => {
  const storedUser = localStorage.getItem("user");
  const user = ref<User | null>(storedUser ? JSON.parse(storedUser) : null);
  const token = ref<string |null>(localStorage.getItem("token"));
  const errorParagraph = ref<string | null>(null);
  const loading = ref(false);

  const isLoggedIn = computed(() => user.value !== null);

  async function login(req: LoginRequest) {
    loading.value = true;
    errorParagraph.value = null;
    try {
      const data = await apiLogin(req);
      user.value = data.user;
      token.value = data.token;
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
    } catch (error) {
      console.log(
        "Inloggningen misslyckades",
        error instanceof Error ? error.message : error,
      );
      user.value = null;
      errorParagraph.value = "Kunde inte logga in.";
    } finally {
      loading.value = false;
    }
  }

  async function logout() {
    try {
      await apiLogout();
    } catch (error) {
      console.log(
        "Utloggningen misslyckades", 
        error instanceof Error ? error.message : error);
    }
    finally {
      user.value = null;
      token.value = null;
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      await router.push("/");
    }
  }

  async function register(req: RegisterRequest) {
    loading.value = true;
    errorParagraph.value = null;
    try {
      const data = await apiRegister(req);
      user.value = data.user;
      token.value = data.token;
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      await router.push("/profil");
    } catch (error) {
      user.value = null;
      errorParagraph.value = 
        error instanceof Error ? error.message : "Kunde inte skapa kontot.";
    } finally {
      loading.value = false;
    }
  }

  function clearError() {
    errorParagraph.value = null;
  }

  return { user, token, errorParagraph, loading, isLoggedIn, login, logout, register, clearError };
});
