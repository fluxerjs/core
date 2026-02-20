<template>
  <div class="guide-tip" role="note" aria-label="Tip">
    <span class="guide-tip-icon" aria-hidden="true">💡</span>
    <span class="guide-tip-text">{{ tip }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  tip: string;
}>();
</script>

<style scoped>
.guide-tip {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.75rem 1rem;
  margin: 0.75rem 0;
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--text-secondary);
  background: rgba(99, 179, 237, 0.08);
  border: 1px solid rgba(99, 179, 237, 0.25);
  border-left: 3px solid var(--accent);
  border-radius: var(--radius-sm);
}

.guide-tip-icon {
  flex-shrink: 0;
  font-size: 1rem;
}

.guide-tip-text {
  flex: 1;
}
</style>
