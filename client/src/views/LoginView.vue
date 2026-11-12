<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute,  useRouter } from "vue-router";
import { useSessionStore } from "@/stores/session";
import BaseButton from "../components/BaseButton.vue";

const session = useSessionStore();
const route = useRoute();
const router = useRouter();
const email = ref<string>("");
const password_hash = ref<string>("");

onMounted(() => session.clearError());

const onSubmit = async () => {
  await session.login({
    email: email.value,
    password: password_hash.value,
  });
  if (session.isLoggedIn) {
    await router.push((route.query.redirect as string) || "/");
  };
};
</script>

<template>
  <form @submit.prevent="onSubmit" class="login">
    <h1>Logga in</h1>
    <input v-model="email" placeholder="E-post" />
    <input v-model="password_hash" type="password" placeholder="Lösenord" />
    <p v-if="session.errorParagraph" class="error">
      {{ session.errorParagraph }}
    </p>
    <BaseButton type="submit" :disabled="session.loading">Logga in</BaseButton>
    <RouterLink to="/register">Skapa konto</RouterLink>
  </form>
</template>

<style scoped></style>
