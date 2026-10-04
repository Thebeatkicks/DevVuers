<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { logIn } from '../api/auth.ts'
import type { LoginResponse, User } from '../../../shared/src/types'

const session = useSessionStore()
const router = useRouter()
const email = ref<string>('')
const password_hash = ref<string>('')
const errorParagraph = ref<string | null>(null)
const loading = ref(false)

const user = ref<User>()
const token = ref<string>()

const onSubmit = async () => {
    loading.value = true
    errorParagraph.value = null
    try {
        const data = await logIn();
        user.value = data.user
        token.value = data.token
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
    } catch (error) {
        errorParagraph.value = 'Kunde inte logga in.'
    } finally {
        loading.value = false
    }
}

</script>

<template>

    <form @submit="onSubmit" class="login">
      <h1>Logga in</h1>
      <input v-model="email" placeholder="E-post" />
      <input v-model="password_hash" type="password" placeholder="Lösenord" />
      <p v-if="session.errorParagraph" class="error">{{ session.errorParagraph }}</p>
      <button type="submit" class="button-blue" :disabled="session.loading">Logga in</button>
    </form>
</template>

<style scoped>
</style>