<template>
  <span class="doc-desc" v-html="formatted"></span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ text?: string | null }>();

/**
 * Format JSDoc description for display: newlines preserved, backticks → inline code.
 * Escapes HTML for safety.
 */
const formatted = computed(() => {
  const t = props.text?.trim();
  if (!t) return '';
  // Escape HTML
  let s = t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // Backticks → inline code (non-greedy, handle multiple)
  s = s.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  // Newlines → <br>
  s = s.replace(/\n/g, '<br>');
  return s;
});
</script>

<style scoped>
.doc-desc {
  color: var(--text-secondary);
  line-height: 1.5;
}

.doc-desc :deep(.inline-code) {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.9em;
  background: var(--code-bg);
  padding: 0.15em 0.4em;
  border-radius: 4px;
}
</style>
