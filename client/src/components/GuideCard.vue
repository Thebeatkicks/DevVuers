<script setup>
import { useRouter } from "vue-router";

const props = defineProps({
  guide: {
    type: Object,
    required: true,
  },
});

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
