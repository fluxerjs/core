<template>
  <div v-if="clazz" class="class-page">
    <div class="page-header">
      <span class="kind-badge kind-class">class</span>
      <h1>{{ clazz.name }}</h1>
      <span v-if="clazz.deprecated" class="deprecated-badge">deprecated</span>
    </div>
    <p v-if="description" class="description"><DocDescription :text="description" /></p>
    <a
      v-if="clazz.source?.path"
      :href="sourceUrl(clazz.source)"
      target="_blank"
      rel="noopener noreferrer"
      class="source-link"
    >
      View source
    </a>

    <ConstructorSection v-if="constructor" :constructor="constructor" :class-name="clazz.name" />
    <PropertiesSection v-if="properties.length" :properties="properties" />
    <MethodsSection v-if="methods.length" :methods="methods" :parent-name="clazz.name" />
  </div>
  <div v-else class="not-found">
    <p>Class not found.</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useDocsStore } from '../stores/docs';
import ConstructorSection from '../components/ConstructorSection.vue';
import DocDescription from '../components/DocDescription.vue';
import PropertiesSection from '../components/PropertiesSection.vue';
import MethodsSection from '../components/MethodsSection.vue';

const route = useRoute();
const store = useDocsStore();

const clazz = computed(() => {
  const doc = store.currentDoc;
  const name = route.params.class as string;
  if (!doc || !name) return null;
  return doc.classes?.find((c) => c.name === name) ?? null;
});

const description = computed(() => clazz.value?.description ?? '');

const constructor = computed(() => clazz.value?.constructor);

const properties = computed(() => clazz.value?.properties ?? []);

const methods = computed(() => clazz.value?.methods ?? []);

const GITHUB_BASE = 'https://github.com/fluxerjs/core/blob/main';
function sourceUrl(source: { file: string; line: number; path?: string }) {
  return `${GITHUB_BASE}/${source.path}#L${source.line}`;
}
</script>

<style scoped>
.class-page {
  max-width: 720px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}

.kind-badge {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  padding: 0.25em 0.6em;
  border-radius: var(--radius-sm);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
}

.kind-class {
  background: var(--badge-class-bg);
  color: var(--badge-class);
}

.deprecated-badge {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-muted);
  background: var(--bg-tertiary);
  padding: 0.25em 0.6em;
  border-radius: var(--radius-sm);
}

h1 {
  font-size: 1.75rem;
}

.description {
  color: var(--text-secondary);
  font-size: 0.95rem;
  margin-bottom: 1rem;
}

.source-link {
  display: inline-block;
  font-size: 0.85rem;
  margin-bottom: 1.5rem;
}

.not-found {
  color: var(--text-muted);
}
</style>
