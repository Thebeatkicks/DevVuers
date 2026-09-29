<script setup>
import { ref, computed, watchEffect } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const tourDetails = ref(null);
const loading = ref(true);
const errorParagraph = ref(null);

watchEffect(async () => {
  try {
    const response = await fetch(
      `http://localhost:4000/api/tours/${route.params.id}`,
    );
    const data = await response.json();
    tourDetails.value = data;
  } catch (error) {
    console.error("Kunde inte hämta turens detaljer", error);
    errorParagraph.value = "Kunde inte ladda turen.";
  } finally {
    loading.value = false;
  }
});

const climb = computed(() => {
  if (!tourDetails.value) return 0;
  return tourDetails.value.logs.reduce((sum, log, i) => {
    if (i === 0) return sum;
    const diff = log.elevation_m - tourDetails.value.logs[i - 1].elevation_m;
    return diff > 0 ? sum + diff : sum;
  }, 0);
});
</script>
<template>
  <p v-if="loading">Laddar turen...</p>
  <p v-else-if="errorParagraph">{{ errorParagraph }}</p>
  <div v-else>
    <h1>{{ tourDetails.title }}</h1>
    <p class="muted">
      {{ Math.round(tourDetails.distance_m / 100) / 10 }} km ·
      {{ tourDetails.logs.length }} mätpunkter · {{ climb }} höjdmeter
    </p>
    <p v-if="tourDetails.notes">{{ tourDetails.notes }}</p>
    <h2>Mätpunkter</h2>
    <ol class="logs">
      <li v-for="log in tourDetails.logs" :key="log.id">
        {{ new Date(log.recorded_at).toLocaleTimeString("sv-SE") }} ·
        {{ log.elevation_m }} m · {{ log.heart_rate }} slag/min
      </li>
    </ol>
  </div>
</template>
<style scoped></style>
