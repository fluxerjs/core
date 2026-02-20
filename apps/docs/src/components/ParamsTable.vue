<template>
  <table v-if="params.length" class="params-table">
    <thead>
      <tr>
        <th>Param</th>
        <th>Type</th>
        <th>Description</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="p in params" :key="p.name">
        <td>
          <code class="param-name">{{ p.name }}{{ p.optional ? '?' : '' }}</code>
        </td>
        <td><TypeSignature :type="p.type" /></td>
        <td class="param-desc">
          <DocDescription v-if="p.description" :text="p.description" />
          <span v-else>-</span>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script setup lang="ts">
import { DocParam } from '../types/doc-schema';
import DocDescription from './DocDescription.vue';
import TypeSignature from './TypeSignature.vue';

defineProps<{ params: DocParam[] }>();
</script>

<style scoped>
.params-table {
  width: 100%;
  margin-top: 0.75rem;
  font-size: 0.875rem;
  border-collapse: collapse;
}

.params-table th,
.params-table td {
  padding: 0.5rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--border-subtle);
  vertical-align: top;
}

.params-table th {
  color: var(--text-muted);
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.param-name {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.85rem;
}

.param-desc {
  color: var(--text-secondary);
}

.params-table .type-sig {
  font-size: 0.8rem;
  padding: 0.15em 0.35em;
}
</style>
