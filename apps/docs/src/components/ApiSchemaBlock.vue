<template>
  <div class="api-schema-block">
    <div v-if="title" class="api-schema-title">{{ title }}</div>
    <div v-if="fields?.length" class="api-schema-fields">
      <div v-for="(field, i) in fields" :key="`${field.name}-${i}`" class="api-schema-row">
        <code class="api-schema-name">{{ field.name }}</code>
        <span v-if="field.required" class="api-schema-required">required</span>
        <code class="api-schema-type">{{ field.type }}</code>
        <span v-if="field.description" class="api-schema-desc">{{ field.description }}</span>
      </div>
    </div>
    <div v-if="responseRef" class="api-schema-ref">
      Returns: <code>{{ responseRef }}</code>
    </div>
    <div v-else-if="responseCode" class="api-schema-code">
      Response: <code>{{ responseCode }} No Content</code>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ApiSchemaField } from '../data/apiEndpoints';

defineProps<{
  title?: string;
  fields?: ApiSchemaField[];
  responseRef?: string;
  responseCode?: number;
}>();
</script>

<style scoped>
.api-schema-block {
  font-size: 0.875rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.api-schema-title {
  font-weight: 600;
  color: var(--text-muted);
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--border-subtle);
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.api-schema-fields {
  padding: 0.25rem 0;
}

.api-schema-row {
  display: grid;
  grid-template-columns: minmax(140px, auto) auto minmax(100px, auto) 1fr;
  gap: 0.75rem 1.25rem;
  align-items: baseline;
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
}

.api-schema-row:hover {
  background: var(--bg-hover);
}

.api-schema-name {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  color: var(--ts-string);
  font-size: 0.9em;
}

.api-schema-required {
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.api-schema-type {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  color: var(--ts-type);
  font-size: 0.85em;
}

.api-schema-desc {
  color: var(--text-muted);
  font-size: 0.85em;
  line-height: 1.4;
}

.api-schema-ref,
.api-schema-code {
  padding: 0.6rem 1rem;
  border-top: 1px solid var(--border-subtle);
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.api-schema-ref code,
.api-schema-code code {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  color: var(--accent);
}

@media (max-width: 600px) {
  .api-schema-row {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto auto;
  }

  .api-schema-name {
    grid-column: 1;
  }

  .api-schema-type {
    grid-column: 2;
    justify-self: end;
  }

  .api-schema-required {
    grid-column: 1;
  }

  .api-schema-desc {
    grid-column: 1 / -1;
  }
}
</style>
