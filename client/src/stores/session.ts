import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
//import { login as apiLogin, logout as apiLogout } from '@/api/auth'     denna ska bytas
import type { User } from '../../../shared/src/types'

export const useSessionStore = defineStore('session', () => {
  // state
  const user = ref<User | null>(null)

  // getters
  const isLoggedIn = computed(() => user.value !== null)

  // actions
  async function login(username: string, password: string) {
    user.value = await apiLogin(username, password)
  }

  async function logout() {
    await apiLogout()
    user.value = null
  }

  return { user, isLoggedIn, login, logout }
})