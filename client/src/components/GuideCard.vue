<script setup lang="ts">
import { useRouter } from "vue-router";
import { Guide } from "@utpost/shared";

const props = defineProps<{ guide: Guide }>();

const router = useRouter();

const goToGuideDetails = () => {
  router.push({
    name: "guide-details",
    params: { id: props.guide.id },
  });
};
</script>

<template>
  <article @click="goToGuideDetails">
    <h2>{{ guide.title }}</h2>
  </article>
</template>
