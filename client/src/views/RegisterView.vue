<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useSessionStore } from "@/stores/session";
import BaseButton from "../components/BaseButton.vue";

const session = useSessionStore();
const email = ref<string>("");
const displayName = ref<string>("");
const password = ref<string>("");

onMounted(() => session.clearError());

const onSubmit = async () => {
  await session.register({
    email: email.value,
    displayName: displayName.value,
    password: password.value,
  });
};
</script>

<template>
  <form @submit="onSubmit" class="register">
    <h1>Skapa konto</h1>
    <input v-model="displayName" placeholder="Visningsnamn" required />
    <input v-model="email" placeholder="E-post" required />
    <input
      v-model="password"
      type="password"
      placeholder="Lösenord"
      required
    />
    <p v-if="session.errorParagraph" class="error">
      {{ session.errorParagraph }}
    </p>
    <div>
      <p>Redan ett konto?</p>
      <RouterLink to="/login">Logga in istället</RouterLink>
    </div>
    <BaseButton type="submit" :disabled="session.loading"
      >Skapa konto</BaseButton
    >
  </form>
</template>

<style scoped></style>
