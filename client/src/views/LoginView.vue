<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useSessionStore } from "@/stores/session";

const session = useSessionStore();
const router = useRouter();
const email = ref<string>("");
const password_hash = ref<string>("");

const onSubmit = async () => {
  await session.login({
    email: email.value,
    password_hash: password_hash.value,
  });
  if (session.isLoggedIn) await router.push("/profil");
};
</script>

<template>
  <form @submit="onSubmit" class="login">
    <h1>Logga in</h1>
    <input v-model="email" placeholder="E-post" />
    <input v-model="password_hash" type="password" placeholder="Lösenord" />
    <p v-if="session.errorParagraph" class="error">
      {{ session.errorParagraph }}
    </p>
    <button type="submit" class="button-blue" :disabled="session.loading">
      Logga in
    </button>
  </form>
</template>

<style scoped></style>
