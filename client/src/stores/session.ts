import { ref, computed } from "vue";
import { defineStore, storeToRefs } from "pinia";
import { useAuthStore } from "./auth";
import { getToken } from "../lib/token";
import type { LoginRequest, RegisterRequest } from "../../../shared/src/types";
import router from "@/router";

// Befintliga vyer använder session; inloggningen och token ägs av auth.
export const useSessionStore = defineStore("session", () => {
  const auth = useAuthStore();
  const { user, isLoggedIn } = storeToRefs(auth);
  const token = computed(() => (user.value ? getToken() : null));
  const errorParagraph = ref<string | null>(null);
  const loading = ref(false);

  async function login(req: LoginRequest) {
    loading.value = true;
    errorParagraph.value = null;
    try {
      await auth.login(req);
    } catch (error) {
      auth.logout();
      errorParagraph.value =
        error instanceof Error ? error.message : "Kunde inte logga in.";
    } finally {
      loading.value = false;
    }
  }

  async function logout() {
    auth.logout();
    await router.push("/");
  }

  async function register(req: RegisterRequest) {
    loading.value = true;
    errorParagraph.value = null;
    try {
      await auth.register(req);
      await router.push("/profile");
    } catch (error) {
      auth.logout();
      errorParagraph.value =
        error instanceof Error ? error.message : "Kunde inte skapa kontot.";
    } finally {
      loading.value = false;
    }
  }

  function clearError() {
    errorParagraph.value = null;
  }

  return {
    user,
    token,
    errorParagraph,
    loading,
    isLoggedIn,
    login,
    logout,
    register,
    clearError,
  };
});
