<script setup lang="ts">
</script>
<template>
  <button class="basebtn">
    <slot />
  </button>
</template>
<style scoped>
  .btn {
    background: #2f6fed;
    color: white;
    border: 0;
    padding: 8px 14px;
    cursor: pointer;
  }
</style>