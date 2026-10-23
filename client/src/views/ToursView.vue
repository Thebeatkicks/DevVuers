<script setup lang="ts">
import { RouterLink } from "vue-router";
import { computed } from "vue";
import { useQuery } from "@urql/vue";
import { graphql } from "@/gql";

//Borta: ToursData-typen, TOURS_QUERY, ref-variablerna, onMounted, fetchTours, console.error och importen av gql från ../graphql.
// urql och codegen tar över allt det.
//Nytt: useQuery med graphql() från @/gql. Typen på data kommer från schemat, så det finns inget att skriva för hand.
const ToursQuery = graphql(`
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
`);

const { data, fetching, error } = useQuery({
  query: ToursQuery,
  variables: { limit: 50 },
});

const tourRows = computed(() =>
  (data.value?.tours ?? []).map((tour) => ({
    id: tour.id,
    title: tour.title,
    author: tour.user.displayName,
    guide: tour.guide?.title ?? "-",
    km: Math.round(tour.distanceM / 100) / 10,
    photoCount: tour.photos.length,
  })),
);
</script>

<template>
  <div>
    <h1>Turer</h1>

    <p v-if="fetching">Laddar turer...</p>
    <p v-else-if="error">Kunde inte ladda turer.</p>

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
