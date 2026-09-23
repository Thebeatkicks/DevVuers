<script setup>
  import { ref, onMounted, computed } from 'vue';
  
  const guides = ref([]);
  const searchQuery = ref('');

  onMounted(() => {
    fetchGuides();
  });

  const fetchGuides = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/guides');
      const data = await response.json();
      guides.value = data;
    } catch (error) {
      console.error('Error fetching guides:', error);
    }
  };

  const filterGuides = computed(() => {
    if (searchQuery.value.trim() === '') {
      return guides.value;
    }
    return guides.value.filter(guide =>
      guide.title.toLowerCase().includes(searchQuery.value.toLowerCase())
    );
  });

  const searchGuides = () => {
    if (searchQuery.value.trim() === '') {
      fetchGuides();
    } else {
      guides.value = guides.value.filter(guide =>
        guide.title.toLowerCase().includes(searchQuery.value.toLowerCase())
      );
    }
  };
</script>

<template>
  <div class="guides">
    <h1>Guides</h1>
    <p>Welcome to the guides section! Here you can find various guides to help you navigate through our application.</p>
    <input v-model="searchQuery" placeholder="Search guides..." />
    <button @click="searchGuides">Search</button>
    
    <ul>
        <li v-for="guide in filterGuides" :key="guide.id">
          <router-link :to="`/guides/${guide.id}`">{{ guide.title }}</router-link>
      </li>
    </ul>
  </div>

</template>

<style scoped>


</style>

