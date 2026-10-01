<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { Guide } from "@utpost/shared";
import { get } from "../api";

const guides = ref<Guide[]>([]);
const searchQuery = ref("");

const fetchGuides = async (): Promise<void> => {
  try {
    guides.value = await get<Guide[]>("/guides");
  } catch (error) {
    console.error("Error fetching guides:", error);
  }
};

onMounted(() => {
  void fetchGuides();
});

const filterGuides = computed(() => {
  if (searchQuery.value.trim() === "") return guides.value;

  return guides.value.filter((guide) =>
    guide.title.toLowerCase().includes(searchQuery.value.toLowerCase()),
  );
});

const searchGuides = (): void => {
  if (searchQuery.value.trim() === "") {
    void fetchGuides();
  } else {
    guides.value = guides.value.filter((guide) =>
      guide.title.toLowerCase().includes(searchQuery.value.toLowerCase()),
    );
  }
};
</script>

<template>
  <div class="guides">
    <h1>Guides</h1>
    <p>
      Welcome to the guides section! Here you can find various guides to help
      you navigate through our application.
    </p>
    <input v-model="searchQuery" placeholder="Search guides..." />
    <button @click="searchGuides">Search</button>

    <ul>
      <li v-for="guide in filterGuides" :key="guide.id">
        <router-link :to="`/guides/${guide.id}`">{{ guide.title }}</router-link>
      </li>
    </ul>
  </div>
</template>

<style scoped></style>
