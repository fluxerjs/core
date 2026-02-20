<template>
  <div class="guide-code-block" :class="{ 'has-tabs': !!alternateCode }">
    <template v-if="alternateCode">
      <div class="code-tabs">
        <button
          type="button"
          class="code-tab"
          :class="{ active: activeTab === 'main' }"
          @click="activeTab = 'main'">
          Default
        </button>
        <button
          type="button"
          class="code-tab"
          :class="{ active: activeTab === 'alternate' }"
          @click="activeTab = 'alternate'">
          {{ alternateCode.label }}
        </button>
      </div>
      <div class="code-tab-panel">
        <CodeBlock
          v-if="activeTab === 'main'"
          :code="code"
          :language="language ?? 'javascript'"
          :link-types="language !== 'bash'" />
        <CodeBlock
          v-else
          :code="alternateCode.code"
          :language="alternateCode.language ?? language ?? 'javascript'"
          :link-types="(alternateCode.language ?? language) !== 'bash'" />
      </div>
    </template>
    <CodeBlock
      v-else
      :code="code"
      :language="language ?? 'javascript'"
      :link-types="language !== 'bash'" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import CodeBlock from './CodeBlock.vue';
import { GuideAlternateSnippet } from '../data/guides';

defineProps<{
  code: string;
  language?: 'javascript' | 'bash' | 'text';
  alternateCode?: GuideAlternateSnippet;
}>();

const activeTab = ref<'main' | 'alternate'>('main');
</script>

<style scoped>
.guide-code-block {
  margin: 0;
}

.guide-code-block.has-tabs {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius);
  overflow: hidden;
}

.code-tabs {
  display: flex;
  gap: 0;
  padding: 0.5rem 1rem 0;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-subtle);
}

.code-tab {
  padding: 0.4rem 0.9rem;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-muted);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition:
    color 0.15s,
    border-color 0.15s;
}

.code-tab:hover {
  color: var(--text-secondary);
}

.code-tab.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

.code-tab-panel :deep(.code-block) {
  border: none;
  border-radius: 0;
}
</style>
