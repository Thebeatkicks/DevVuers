<script setup lang="ts">
import { computed, h, type FunctionalComponent, type VNode } from "vue";
import type { Paragraph, TextRun } from "../lib/notices";

// M9: rich text som data. Servern skickar block (stycken, rubriker h2/h3 och listpunkter li) av
// textbitar – inte en HTML-sträng. Varje bit blir ett element som VI har valt (em, strong, a,
// p, h2, h3, ul/li), och texten sätts in som text. Det finns ingen v-html här, alltså inget
// ställe där en tagg i innehållet kan bli kod (skuld 10, och H7 i M8).
const props = defineProps<{ paragraphs: Paragraph[] }>();

// En textbit kan vara kursiv, fet och länk på samma gång: elementen läggs utanpå varandra.
const Run: FunctionalComponent<{ run: TextRun }> = ({ run }) => {
  let node: string | VNode = run.text;
  if (run.italic) node = h("em", [node]);
  if (run.bold) node = h("strong", [node]);
  if (run.href) node = h("a", { href: run.href }, [node]);
  return node;
};
Run.props = ["run"];

type RenderGroup =
  | { type: "block"; tag: "p" | "h2" | "h3"; runs: TextRun[] }
  | { type: "ul"; items: TextRun[][] };

// Grupperar intilliggande 'li'-block till en <ul><li>...</li></ul>, medan 'h2', 'h3' och 'p'
// (standard när kind saknas) renderas som egna blockelement.
const groups = computed<RenderGroup[]>(() => {
  const result: RenderGroup[] = [];
  for (const block of props.paragraphs) {
    const kind = block.kind ?? "p";
    if (kind === "li") {
      const prev = result[result.length - 1];
      if (prev && prev.type === "ul") {
        prev.items.push(block.runs);
      } else {
        result.push({ type: "ul", items: [block.runs] });
      }
    } else {
      const tag = kind === "h2" || kind === "h3" ? kind : "p";
      result.push({ type: "block", tag, runs: block.runs });
    }
  }
  return result;
});
</script>

<template>
  <template v-for="(group, i) in groups" :key="i">
    <ul v-if="group.type === 'ul'">
      <li v-for="(itemRuns, liIdx) in group.items" :key="liIdx">
        <Run v-for="(run, j) in itemRuns" :key="j" :run="run" />
      </li>
    </ul>
    <component :is="group.tag" v-else>
      <Run v-for="(run, j) in group.runs" :key="j" :run="run" />
    </component>
  </template>
</template>
