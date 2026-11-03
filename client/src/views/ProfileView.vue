<script setup lang="ts">
import { useRouter } from "vue-router";
import { useSessionStore } from "@/stores/session";
import BaseButton from "../components/BaseButton.vue";

const session = useSessionStore();
const router = useRouter();

router.beforeEach((to) => {
  const session = useSessionStore();
  if (to.meta.requiresAuth && !session.isLoggedIn) return "/login";
});
</script>

<template>
  <div class="profile">
    <h1>This is the profile page</h1>
    <h1>Min profil</h1>
    <p v-if="session.user">Inloggad som {{ session.user.email }}</p>
    <BaseButton @click="session.logout">Logga ut</BaseButton>
  </div>
</template>

<style scoped>
@media (min-width: 1024px) {
  .profile {
    min-height: 100vh;
    display: flex;
    align-items: center;
  }
}
</style>
