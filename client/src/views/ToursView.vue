<script setup>
import { RouterLink } from "vue-router";
import { onMounted, ref, computed } from "vue";

const tours = ref([]);
const loading = ref(true);
const errorParagraph = ref(null);

onMounted(() => {
  fetchTours();
});

const fetchTours = async () => {
  try {
    const response = await fetch("http://localhost:4000/api/tours");
    const data = await response.json();
    tours.value = data;
  } catch (error) {
    console.error("Kunde inte hämta tours informationen", error);
    errorParagraph.value = "Kunde inte ladda turer.";
  } finally {
    loading.value = false;
  }
};

const tourRows = computed(() =>
  tours.value.map((tour) => ({
    id: tour.id,
    title: tour.title,
    author: tour.user?.display_name ?? "-",
    guide: tour.guide?.title ?? "-",
    km: Math.round(tour.distance_m / 100) / 10,
    photoCount: tour.photos.length,
  })),
);
</script>

<template>
  <div>
    <h1>Turer</h1>

    <p v-if="loading">Laddar turer...</p>
    <p v-else-if="errorParagraph">{{ errorParagraph }}</p>

    <table v-else class="tours">
      <thead>
        <tr>
          <th>Tur</th>
          <th>Av</th>
          <th>Guide</th>
          <th>Längd</th>
          <th>Bilder</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="tour in tourRows" :key="tour.id">
          <td>
            <RouterLink :to="`/tours/${tour.id}`">{{ tour.title }}</RouterLink>
          </td>
          <td>{{ tour.author }}</td>
          <td>{{ tour.guide }}</td>
          <td>{{ tour.km }} km</td>
          <td>{{ tour.photoCount }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped></style>
