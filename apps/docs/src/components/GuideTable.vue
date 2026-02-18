<template>
  <div class="guide-table-wrapper">
    <table class="guide-table">
      <thead>
        <tr>
          <th v-for="(h, i) in headers" :key="i">{{ h }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, ri) in rows" :key="ri">
          <td v-for="(cell, ci) in row" :key="ci">
            <code v-if="codeColumns?.includes(ci)" class="guide-table-code">{{ cell }}</code>
            <span v-else>{{ cell }}</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    headers: string[];
    rows: string[][];
    /** Column indices to render as inline code (e.g. [1] for payload column) */
    codeColumns?: number[];
  }>(),
  { codeColumns: () => [] },
);
</script>

<style scoped>
.guide-table-wrapper {
  overflow-x: auto;
  margin: 1rem 0;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius);
}

.guide-table {
  width: 100%;
  font-size: 0.875rem;
  border-collapse: collapse;
}

.guide-table th,
.guide-table td {
  padding: 0.5rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--border-subtle);
  vertical-align: top;
}

.guide-table th {
  background: var(--bg-secondary);
  color: var(--text-muted);
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.guide-table tr:last-child td {
  border-bottom: none;
}

.guide-table-code {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.85em;
  background: var(--code-bg);
  padding: 0.15em 0.35em;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
