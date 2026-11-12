<script setup lang="ts">
import { post } from "../api";
import { ref } from "vue";
import type {
  Tour,
  PhotoUploadRequest,
  PhotoUploadResponse,
} from "@utpost/shared";

const props = defineProps<{ tourId: Tour["id"] }>();

const loading = ref(false);
const error = ref<string | null>(null);
const result = ref<PhotoUploadResponse | null>(null);
const dimensions = ref<{ width: number; height: number } | null>(null);

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  loading.value = true;
  error.value = null;
  result.value = null;

  try {
    // Avkodar bilden i webbläsaren så att vi kan läsa måtten.
    // Inga bytes skickas någonstans.
    const bitmap = await createImageBitmap(file);
    const width = bitmap.width;
    const height = bitmap.height;
    bitmap.close();
    dimensions.value = { width, height };

    const body: PhotoUploadRequest = {
      tourId: props.tourId,
      filename: file.name,
      width,
      height,
    };

    result.value = await post<PhotoUploadResponse>("/photos", body);
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Okänt fel.";
  } finally {
    loading.value = false;
    input.value = "";
  }
}
</script>

<template>
  <section class="photo-upload">
    <h2>Ladda upp bild</h2>
    <input
      type="file"
      accept="image/*"
      :disabled="loading"
      @change="onFileChange"
    />

    <p v-if="dimensions">
      Vald bild: {{ dimensions.width }} x {{ dimensions.height }} px
    </p>
    <p v-if="loading">Bearbetar...</p>
    <p v-if="error" role="alert" class="error">{{ error }}</p>

    <div v-if="result">
      <p v-if="result.coldStart" class="cold-start">
        Kallstart: funktionen startade om och första anropet tog längre tid.
      </p>

      <h3>Varianter</h3>
      <ul>
        <li v-for="variant in result.variants" :key="variant.size">
          {{ variant.size }}: {{ variant.signature }}
        </li>
      </ul>

      <h3>Tider</h3>
      <ul>
        <li>Bearbetning: {{ result.processingMs }} ms</li>
        <li>API totalt: {{ result.apiMs }} ms</li>
        <li>Instans: {{ result.instance }}</li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.error {
  color: #b00020;
}
.cold-start {
  background: #fff3cd;
  color: #664d03;
  border: 1px solid #e0a800;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
}
</style>
