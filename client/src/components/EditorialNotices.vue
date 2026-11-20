<script setup lang="ts">
import { computed, ref } from "vue";
import { useQuery } from "@urql/vue";
import { graphql } from "../gql";
import { useAuthStore } from "../stores/auth";
import NoticeList from "./NoticeList.vue";

const auth = useAuthStore();
const isEditor = computed(() => auth.user?.role === "editor");
const showDrafts = ref(false);
const variables = computed(() => ({
  preview: isEditor.value && showDrafts.value,
}));
const document = graphql(`
  query EditorialNotices($preview: Boolean) {
    notices(preview: $preview) {
      id
      title
      level
      status
      guideSlug
      body {
        runs {
          text
          bold
          italic
          href
        }
      }
    }
  }
`);
// Alltid nätet: servern cachar publicerat innehåll, utkast ska aldrig återanvändas mellan användare.
const { data, fetching, error } = useQuery({
  query: document,
  variables,
  requestPolicy: "network-only",
});
</script>

<template>
  <section aria-label="Redaktionen">
    <label v-if="isEditor">
      <input v-model="showDrafts" type="checkbox" /> Förhandsgranska: visa
      utkast
    </label>
    <p v-if="error" role="alert">
      Kunde inte hämta notiser: {{ error.message }}
    </p>
    <p v-else-if="fetching">Laddar notiser…</p>
    <NoticeList v-else-if="data" :notices="data.notices" />
  </section>
</template>
