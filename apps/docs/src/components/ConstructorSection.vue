<template>
  <section id="constructor" class="section">
    <h2>Constructor</h2>
    <div class="signature-wrap">
      <TypeSignature :type="signatureText" />
    </div>
    <p v-if="props.constructor.description" class="constructor-desc">
      <DocDescription :text="props.constructor.description" />
    </p>
    <ParamsTable v-if="params.length" :params="params" />
    <div v-if="props.constructor.examples?.length" class="constructor-examples">
      <CodeBlock
        v-for="(ex, i) in props.constructor.examples"
        :key="i"
        :code="ex"
        language="javascript"
        :link-types="true" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { DocConstructor } from '../types/doc-schema';
import DocDescription from './DocDescription.vue';
import ParamsTable from './ParamsTable.vue';
import TypeSignature from './TypeSignature.vue';
import CodeBlock from './CodeBlock.vue';

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

.constructor-desc {
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-top: 0.5rem;
}

.constructor-examples {
  margin-top: 1rem;
}

.constructor-examples :deep(.code-block) {
  margin-bottom: 0.75rem;
}

.constructor-examples :deep(.code-block:last-child) {
  margin-bottom: 0;
}
</style>
