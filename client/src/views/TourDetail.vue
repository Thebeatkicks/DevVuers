<script setup lang="ts">
import { ref, computed, watchEffect } from "vue";
import { useRoute } from "vue-router";
import type { Tour, TourLog } from "@utpost/shared";
import { elevationGain } from "../lib/tours";

// Tour från kontraktet, plus mätpunkterna som API:et skickar med
type TourWithLogs = Tour & { logs: TourLog[] };

const route = useRoute();
const tourDetails = ref<TourWithLogs | null>(null);
const loading = ref(true);
const errorParagraph = ref<string | null>(null);

watchEffect(async () => {
  try {
    const response = await fetch(
      `http://localhost:4000/api/tours/${String(route.params.id)}`,
    );
    if (!response.ok) {
      throw new Error(`API svarade ${response.status}`);
    }
    tourDetails.value = (await response.json()) as TourWithLogs;
  } catch (error) {
    console.error("Kunde inte hämta turens detaljer", error);
    errorParagraph.value = "Kunde inte ladda turen.";
  } finally {
    loading.value = false;
  }
});

const climb = computed<number>(() =>
  tourDetails.value ? elevationGain(tourDetails.value.logs) : 0,
);
</script>

<template>
  <p v-if="loading">Laddar turen...</p>
  <p v-else-if="errorParagraph" role="alert">{{ errorParagraph }}</p>
  <div v-else-if="tourDetails">
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
        {{ log.elevation_m ?? "–" }} m · {{ log.heart_rate ?? "–" }} slag/min
      </li>
    </ol>
  </div>
</template>

<style scoped></style>
