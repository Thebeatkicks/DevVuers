import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { login as apiLogin, logout as apiLogout } from '@/api/auth'
import type { LoginRequest, User } from '../../../shared/src/types'

export const useSessionStore = defineStore('session', () => {
  const user = ref<User | null>(null)
  const token = ref<string>()
  const errorParagraph = ref<string | null>(null)
  const loading = ref(false)

  const isLoggedIn = computed(() => user.value !== null)

  async function login(req: LoginRequest) {
    loading.value = true
    errorParagraph.value = null
    try {
      const data= await apiLogin(req)
      user.value = data.user
      token.value = data.token
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
    } catch (error) {
      console.log('Inloggningen misslyckades', error instanceof Error ? error.message : error)
      user.value = null
      errorParagraph.value = 'Kunde inte logga in.'
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    try {
      await apiLogout()
    } finally {
      user.value = null
    }
  }

  return { user, errorParagraph, loading, isLoggedIn, login, logout }
})