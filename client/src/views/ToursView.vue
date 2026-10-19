<script setup lang="ts">
import { RouterLink } from "vue-router";
import { onMounted, ref, computed } from "vue";
import { gql } from "../graphql";

type ToursData = {
  tours: {
    id: string;
    title: string;
    distanceM: number;
    user: { displayName: string };
    guide: { title: string } | null;
    photos: { id: string }[];
  }[];
};

const TOURS_QUERY = /* GraphQL */ `
  query Tours($limit: Int) {
    tours(limit: $limit) {
      id
      title
      distanceM
      user {
        displayName
      }
      guide {
        title
      }
      photos {
        id
      }
    }
  }
`;

const tours = ref<ToursData["tours"]>([]);
const loading = ref(true);
const errorParagraph = ref<string | null>(null);

onMounted(() => {
  fetchTours();
});

const fetchTours = async () => {
  try {
    const data = await gql<ToursData>(TOURS_QUERY, { limit: 50 });
    tours.value = data.tours;
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
    author: tour.user?.displayName ?? "-",
    guide: tour.guide?.title ?? "-",
    km: Math.round(tour.distanceM / 100) / 10,
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
