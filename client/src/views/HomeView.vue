<script setup lang="ts">
import { useQuery } from "@urql/vue";
import { graphql } from "@/gql";

const PopularGuides = graphql(`
  query PopularGuides($limit: Int) {
    popularGuides(limit: $limit) {
      id
      title
      region
      difficulty
      lengthKm
    }
  }
`);

const { data, fetching, error } = useQuery({
  query: PopularGuides,
  variables: { limit: 6 },
});
</script>

<template>
  <main>
    <h1>Populära guider</h1>
    <p v-if="fetching">Laddar…</p>
    <p v-else-if="error" role="alert">Kunde inte hämta guider.</p>
    <ul v-else>
      <li v-for="g in data?.popularGuides" :key="g.id">
        <RouterLink :to="`/guides/${g.id}`">{{ g.title }}</RouterLink>
        – {{ g.region }}, {{ g.difficulty }}, {{ g.lengthKm }} km
      </li>
    </ul>
  </main>
</template>
