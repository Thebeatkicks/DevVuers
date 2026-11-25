<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useQuery } from "@urql/vue";
import { graphql } from "../gql";
import NoticeList from "../components/NoticeList.vue";
import RichText from "../components/RichText.vue";

// Detaljvyn: frågan tar en variabel ($slug) i stället för att klistra in adressen i strängen.
// Codegen genererar typen för variablerna också – skicka fel typ, och typecheck säger ifrån.
// M9 (Steg 4): brödtexten hämtas som strukturerad data (body) från CMS:et via GraphQL – ingen bodyHtml.
const GuideDocument = graphql(/* GraphQL */ `
  query Guide($slug: String!) {
    guide(slug: $slug) {
      slug
      title
      region
      difficulty
      lengthKm
      body {
        kind
        runs {
          text
          bold
          italic
          href
        }
      }
      notices {
        id
        title
        level
        status
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
  }
`);

const route = useRoute();
// Variablerna är reaktiva: byter adressen slug kör urql frågan igen (eller svarar ur cachen).
const variables = computed(() => ({ slug: route.params.slug as string }));
const { data, fetching, error } = useQuery({ query: GuideDocument, variables });
</script>

<template>
  <p v-if="error" role="alert">{{ error.message }}</p>
  <p v-else-if="fetching || !data">Laddar…</p>
  <p v-else-if="!data.guide" role="alert">
    Det finns ingen guide som heter så.
  </p>
  <article v-else>
    <h1>{{ data.guide.title }}</h1>
    <p class="muted">
      {{ data.guide.region }} · {{ data.guide.difficulty }} ·
      {{ data.guide.lengthKm }} km
    </p>
    <!-- M9: både notiserna och guidens brödtext kommer ur CMS:et som strukturerad data – utan v-html. -->
    <NoticeList :notices="data.guide.notices" />
    <div class="body">
      <RichText :paragraphs="data.guide.body" />
    </div>
  </article>
</template>

<style scoped>
.muted {
  color: #777;
  font-size: 14px;
}
.body {
  max-width: 70ch;
}
</style>
