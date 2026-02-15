<template>
  <section class="section">
    <h2>Methods</h2>
    <div v-for="m in methods" :id="`method-${m.name}`" :key="m.name" class="method-item">
      <div class="method-header">
        <code class="method-name">{{ m.name }}</code>
        <span v-if="m.deprecated" class="deprecated-badge">deprecated</span>
      </div>
      <div class="method-sig-wrap">
        <TypeSignature :type="methodSignature(m)" />
      </div>
      <p v-if="m.description" class="method-desc"><DocDescription :text="m.description" /></p>
      <p v-if="typeof m.deprecated === 'string'" class="method-deprecated">
        Deprecated: {{ m.deprecated }}
      </p>
      <ParamsTable v-if="m.params?.length" :params="m.params" />
      <div v-if="m.examples?.length" class="method-examples">
        <CodeBlock
          v-for="(ex, i) in m.examples"
          :key="i"
          :code="ex"
          language="javascript"
          :link-types="true"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { DocMethod } from '../types/doc-schema';
import DocDescription from './DocDescription.vue';
import ParamsTable from './ParamsTable.vue';
import TypeSignature from './TypeSignature.vue';
import CodeBlock from './CodeBlock.vue';

defineProps<{ methods: DocMethod[]; parentName?: string }>();

function methodSignature(m: DocMethod) {
  const paramsStr = (m.params ?? [])
    .map((p) => `${p.name}${p.optional ? '?' : ''}: ${p.type}`)
    .join(', ');
  return `(${paramsStr}): ${m.returns}`;
}
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

.method-item {
  margin-bottom: 1.75rem;
  padding-bottom: 1.75rem;
  border-bottom: 1px solid var(--border-subtle);
}

.method-item:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.method-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
}

.method-name {
  font-weight: 500;
  font-size: 1rem;
}

.deprecated-badge {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-muted);
  background: var(--bg-tertiary);
  padding: 0.2em 0.5em;
  border-radius: var(--radius-sm);
}

.method-sig-wrap {
  margin-bottom: 0.5rem;
}

.method-sig-wrap :deep(.type-sig) {
  font-size: 0.85rem;
}

.method-desc {
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.method-deprecated {
  font-size: 0.9rem;
  color: var(--text-muted);
  line-height: 1.5;
  font-style: italic;
  margin-top: 0.35rem;
}

.method-examples {
  margin-top: 1rem;
}

.method-examples :deep(.code-block) {
  margin-bottom: 0.75rem;
}

.method-examples :deep(.code-block:last-child) {
  margin-bottom: 0;
}
</style>
