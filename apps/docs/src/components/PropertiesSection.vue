<template>
  <section class="section">
    <h2>Properties</h2>
    <div v-for="p in properties" :id="`property-${p.name}`" :key="p.name" class="property-item">
      <div class="property-header">
        <code class="property-name">{{ p.name }}</code>
        <span v-if="p.optional" class="optional-badge">optional</span>
      </div>
      <div v-if="p.type" class="property-type-wrap">
        <TypeSignature :type="p.type" />
      </div>
      <p v-if="p.description" class="property-desc"><DocDescription :text="p.description" /></p>
      <div v-if="p.examples?.length" class="property-examples">
        <CodeBlock
          v-for="(ex, i) in p.examples"
          :key="i"
          :code="ex"
          language="javascript"
          :link-types="true" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { DocProperty, DocInterfaceProperty } from '../types/doc-schema';
import DocDescription from './DocDescription.vue';
import TypeSignature from './TypeSignature.vue';
import CodeBlock from './CodeBlock.vue';

defineProps<{ properties: (DocProperty | DocInterfaceProperty)[] }>();
</script>

<style scoped>
.section {
  margin-bottom: 2.5rem;
}

.section h2 {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 1rem;
}

.property-item {
  margin-bottom: 1.25rem;
  padding-bottom: 1.25rem;
  border-bottom: 1px solid var(--border-subtle);
}

.property-item:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.property-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
}

.property-name {
  font-weight: 500;
}

.optional-badge {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-muted);
  background: var(--bg-tertiary);
  padding: 0.2em 0.5em;
  border-radius: var(--radius-sm);
}

.property-type-wrap {
  margin-bottom: 0.35rem;
}

.property-type-wrap :deep(.type-sig) {
  font-size: 0.85rem;
}

.property-desc {
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.property-examples {
  margin-top: 1rem;
}

.property-examples :deep(.code-block) {
  margin-bottom: 0.75rem;
}

.property-examples :deep(.code-block:last-child) {
  margin-bottom: 0;
}
</style>
