<template>
  <code class="type-sig">
    <template v-for="(part, i) in parts" :key="i">
      <router-link
        v-if="part.kind === 'type' && part.link"
        :to="part.link"
        :class="['ts-type-link', part.linkKind ? 'ts-link-' + part.linkKind : '']"
      >
        {{ part.text }}
      </router-link>
      <span v-else :class="['ts-' + part.kind]">{{ part.text }}</span>
    </template>
  </code>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useDocsStore } from '../stores/docs';

const props = defineProps<{ type: string }>();
const route = useRoute();
const store = useDocsStore();
const versionPrefix = computed(() => `/v/${(route.params.version as string) ?? 'latest'}`);

const KEYWORDS = new Set(['string', 'number', 'boolean', 'void', 'any', 'unknown', 'object', 'null', 'undefined', 'never', 'true', 'false', 'Promise', 'Record', 'Map', 'Set', 'Array']);
const PUNCT = /^[<>\{\}\[\]\(\)|&,:;?.]$/;

const parts = computed(() => {
  const type = props.type ?? '';
  const out: { kind: string; text: string; link?: { path: string }; linkKind?: 'class' | 'interface' | 'enum' }[] = [];
  const doc = store.currentDoc;
  const classNames = new Set((doc?.classes ?? []).map((c) => c.name));
  const interfaceNames = new Set((doc?.interfaces ?? []).map((i) => i.name));
  const enumNames = new Set((doc?.enums ?? []).map((e) => e.name));

  let i = 0;
  while (i < type.length) {
    const rest = type.slice(i);
    const m = rest.match(/^\s+/);
    if (m) {
      out.push({ kind: 'space', text: m[0] });
      i += m[0].length;
      continue;
    }
    const punct = rest[0];
    if (PUNCT.test(punct)) {
      out.push({ kind: 'punct', text: punct });
      i += 1;
      continue;
    }
    const ident = rest.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*/)?.[0];
    if (ident) {
      const lower = ident.toLowerCase();
      const isKeyword = KEYWORDS.has(ident) || ['string', 'number', 'boolean', 'void', 'any', 'unknown', 'object', 'null', 'undefined', 'never'].includes(lower);
      if (isKeyword) {
        out.push({ kind: 'keyword', text: ident });
      } else if (classNames.has(ident)) {
        out.push({ kind: 'type', text: ident, link: { path: `${versionPrefix.value}/docs/classes/${ident}` }, linkKind: 'class' });
      } else if (interfaceNames.has(ident)) {
        out.push({ kind: 'type', text: ident, link: { path: `${versionPrefix.value}/docs/typedefs/${ident}` }, linkKind: 'interface' });
      } else if (enumNames.has(ident)) {
        out.push({ kind: 'type', text: ident, link: { path: `${versionPrefix.value}/docs/typedefs/${ident}` }, linkKind: 'enum' });
      } else {
        out.push({ kind: 'ident', text: ident });
      }
      i += ident.length;
      continue;
    }
    const str = rest.match(/^['"`][^'"`]*['"`]/)?.[0] ?? rest.match(/^['"`]/)?.[0];
    if (str) {
      out.push({ kind: 'string', text: str });
      i += str.length;
      continue;
    }
    out.push({ kind: 'other', text: rest[0] ?? '' });
    i += 1;
  }
  return out;
});
</script>

<style scoped>
.type-sig {
  font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
  font-size: 0.9em;
  background: var(--code-bg);
  padding: 0.2em 0.5em;
  border-radius: 4px;
  display: inline;
}

.ts-keyword {
  color: var(--ts-keyword);
}

.ts-type {
  color: var(--ts-type);
}

.ts-type-link {
  text-decoration: none;
  font-weight: 500;
}

.ts-type-link:hover {
  text-decoration: underline;
}

.ts-link-class {
  color: var(--accent);
}

.ts-link-interface {
  color: var(--badge-interface);
}

.ts-link-enum {
  color: var(--badge-enum);
}

.ts-string {
  color: var(--ts-string);
}

.ts-punct {
  color: var(--ts-punct);
}

.ts-ident {
  color: var(--ts-ident);
}

.ts-space {
  /* preserve spaces */
}
</style>
