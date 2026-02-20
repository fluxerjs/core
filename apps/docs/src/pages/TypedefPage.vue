<template>
  <div v-if="typedef" class="typedef-page">
    <div class="page-header">
      <span :class="['kind-badge', isInterface ? 'kind-interface' : 'kind-enum']">
        {{ isInterface ? 'interface' : 'enum' }}
      </span>
      <h1>{{ typedef.name }}</h1>
    </div>
    <p v-if="typedef.description" class="description">
      <DocDescription :text="typedef.description" />
    </p>

    <a
      v-if="typedef.source?.path"
      :href="sourceUrl(typedef.source)"
      target="_blank"
      rel="noopener noreferrer"
      class="source-link">
      View source
    </a>

    <PropertiesSection v-if="isInterface && properties.length" :properties="properties" />
    <section v-else-if="isEnum && members.length" class="section enum-section">
      <h2>Members</h2>
      <div class="enum-definition">
        <pre><code class="language-typescript">{{ enumDefinition }}</code></pre>
      </div>
      <table class="enum-table">
        <thead>
          <tr>
            <th>Member</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in members" :key="m.name">
            <td>
              <code>{{ m.name }}</code>
            </td>
            <td>
              <code>{{ formatValue(m.value) }}</code>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
  <div v-else-if="store.loading" class="loading">
    <p>Loading...</p>
  </div>
  <div v-else-if="store.error" class="error">
    <p>Failed to load docs: {{ store.error }}</p>
  </div>
  <div v-else class="not-found">
    <p>Type not found.</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useDocsStore } from '../stores/docs';
import { DocInterface, DocEnum } from '../types/doc-schema';
import { onMounted, watch } from 'vue';
import DocDescription from '../components/DocDescription.vue';
import PropertiesSection from '../components/PropertiesSection.vue';
import Prism from 'prismjs';

const route = useRoute();
const store = useDocsStore();

onMounted(() => Prism.highlightAll());
watch(
  () => route.params.typedef,
  () => {
    queueMicrotask(() => Prism.highlightAll());
  },
);

const typedef = computed(() => {
  const doc = store.currentDoc;
  const name = route.params.typedef as string;
  if (!doc || !name) return null;
  const iface = doc.interfaces?.find((i) => i.name === name);
  if (iface) return iface;
  const enm = doc.enums?.find((e) => e.name === name);
  return enm ?? null;
});

const isInterface = computed(() => typedef.value && 'properties' in typedef.value);

const isEnum = computed(() => typedef.value && 'members' in typedef.value);

const properties = computed(() =>
  isInterface.value && typedef.value ? ((typedef.value as DocInterface).properties ?? []) : [],
);

const members = computed(() =>
  isEnum.value && typedef.value ? ((typedef.value as DocEnum).members ?? []) : [],
);

const enumDefinition = computed(() => {
  const name = typedef.value?.name ?? '';
  const mems = members.value;
  const lines = mems.map((m) => {
    if (m.value === m.name) return `  ${m.name}`;
    const val = formatValue(m.value);
    return `  ${m.name} = ${val}`;
  });
  return `enum ${name} {\n${lines.join(',\n')}\n}`;
});

function formatValue(v: string | number): string {
  return typeof v === 'string' ? `"${v}"` : String(v);
}

const GITHUB_BASE = 'https://github.com/fluxerjs/core/blob/main';
function sourceUrl(source: { file: string; line: number; path?: string }) {
  return `${GITHUB_BASE}/${source.path}#L${source.line}`;
}
</script>

<style scoped>
.typedef-page {
  max-width: 720px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.kind-badge {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  padding: 0.25em 0.6em;
  border-radius: var(--radius-sm);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
}

.kind-interface {
  background: var(--badge-interface-bg);
  color: var(--badge-interface);
}

.kind-enum {
  background: var(--badge-enum-bg);
  color: var(--badge-enum);
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

.section h2 {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 1rem;
}

.enum-section {
  margin-top: 1.5rem;
}

.enum-definition {
  margin-bottom: 1.25rem;
}

.enum-definition pre {
  margin: 0;
  border-radius: var(--radius);
}

.enum-table {
  width: 100%;
  font-size: 0.875rem;
  border-collapse: collapse;
}

.enum-table th,
.enum-table td {
  padding: 0.5rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--border-subtle);
  vertical-align: middle;
}

.enum-table th {
  color: var(--text-muted);
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.enum-table code {
  font-size: 0.875rem;
}

.loading,
.not-found {
  color: var(--text-muted);
}

.error {
  color: var(--text-error, #dc2626);
}
</style>
