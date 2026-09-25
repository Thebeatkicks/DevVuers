<script setup>
import { RouterLink } from 'vue-router';
import { onMounted } from 'vue';

  const tours = ref([]);
  const loading = ref();

  loading.value = true;

  onMounted(() => {
    fetchTours();
  });

  const fetchTours = async() => {
    try {
      const response = await fetch('http://localhost:4000/api/tours');
      const data = await response.json();
      tours.value = data;
      loading.value = false;
    } catch (error){
      console.error("Kunde inte hämta tours informationen", error)
    }
  };

</script>

<template>
    <div>
      <h1>Turer</h1>
      <table :class="tours">
        <thead>
          <tr><th>Tur</th><th>Av</th><th>Guide</th><th>Längd</th><th>Bilder</th></tr>
        </thead>
        <tbody v-if="loading? <p>Laddar turer...</p>">
            <tr v-for="tour in tours" :key="tour.id">
              <td><RouterLink :to="`/turer/${tour.id}`">{{ tour.title }}</RouterLink></td>
              <td>{{tour.user?.display_name}}</td>
              <td>{{tour.guide ? tour.guide.title : '-'}}</td>
              <td>{{Math.round(tour.distance_m / 100) / 10}} km</td>
              <td>{{tour.photos.length}}</td>
            </tr>
        </tbody>
      </table>
    </div>
</template>

<style scope>
</style>