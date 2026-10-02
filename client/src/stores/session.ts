import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
//import { login as apiLogin, logout as apiLogout } from '@/api/auth'     denna ska bytas
import type { User } from '../../../shared/src/types'

export const useSessionStore = defineStore('session', () => {
  const user = ref<User | null>(null)
  const errorParagraph = ref<string | null>(null)
  const loading = ref(false)

  const isLoggedIn = computed(() => user.value !== null)

  // actions
  async function login(username: string, password_hash: string) {
    loading.value = true
    try {
      user.value = await apiLogin(username, password_hash)
    } catch (error) {
      console.log("Inloggningen misslyckades", error.message)
      user.value = null
      errorParagraph.value
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    await apiLogout()
    user.value = null
  }

  return { user, isLoggedIn, login, logout }
})