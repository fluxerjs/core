<template>
  <div class="search-trigger-wrap">
    <button type="button" class="search-trigger" @click="open = true">
      <span class="trigger-icon">⌘</span>
      <span class="trigger-text">Search</span>
      <span class="trigger-kbd">⌘K</span>
    </button>
    <SearchModal :open="open" @close="open = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import SearchModal from './SearchModal.vue';

const open = ref(false);

function handleKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    open.value = !open.value;
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown));
onUnmounted(() => window.removeEventListener('keydown', handleKeydown));
</script>

<style scoped>
.search-trigger-wrap {
  flex: 1;
  max-width: 280px;
  display: flex;
  justify-content: flex-end;
}

.search-trigger {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem 0.9rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text-secondary);
  font-size: 0.875rem;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}

.search-trigger:hover {
  border-color: var(--accent);
  color: var(--text-primary);
}

.trigger-icon {
  font-size: 1rem;
}

.trigger-text {
  flex: 1;
  text-align: left;
}

.trigger-kbd {
  font-size: 0.7rem;
  padding: 0.2em 0.45em;
  background: var(--bg-secondary);
  border-radius: 3px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
}
</style>
