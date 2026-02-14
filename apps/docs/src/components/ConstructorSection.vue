<template>
  <section class="section">
    <h2>Constructor</h2>
    <div class="signature-wrap">
      <TypeSignature :type="signatureText" />
    </div>
    <ParamsTable v-if="params.length" :params="params" />
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { DocConstructor } from '../types/doc-schema';
import ParamsTable from './ParamsTable.vue';
import TypeSignature from './TypeSignature.vue';

const props = defineProps<{ constructor: DocConstructor; className: string }>();

const params = computed(() => props.constructor.params ?? []);

const signatureText = computed(() => {
  const paramsStr = params.value
    .map((p) => `${p.name}${p.optional ? '?' : ''}: ${p.type}`)
    .join(', ');
  return `new ${props.className}(${paramsStr})`;
});
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

.signature-wrap {
  margin-bottom: 0.75rem;
}

.signature-wrap :deep(.type-sig) {
  font-size: 0.9rem;
}
</style>
