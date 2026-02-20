<template>
  <a
    href="https://fluxer.gg/fluxer-js"
    target="_blank"
    rel="noopener noreferrer"
    class="community-callout"
    :class="variant"
    aria-label="Join our Fluxer community">
    <span class="community-text">
      <strong>Join our Fluxer community</strong>
      <span v-if="variant === 'sidebar'" class="community-arrow"> →</span>
      <span v-else class="community-external" aria-hidden="true"> ↗</span>
    </span>
  </a>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'sidebar' | 'hero';
  }>(),
  { variant: 'sidebar' },
);
</script>

<style scoped>
.community-callout {
  display: flex;
  align-items: center;
  gap: 0.5rem 0.75rem;
  color: var(--text-primary);
  text-decoration: none;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s;
}

.community-callout.sidebar {
  margin: 0 var(--sidebar-padding-x) 1rem;
  padding: 0.6rem 0.9rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--accent);
  background: rgba(99, 179, 237, 0.12);
  border: 1px solid rgba(99, 179, 237, 0.3);
  border-radius: var(--radius-sm);
}

.community-callout.sidebar:hover {
  background: rgba(99, 179, 237, 0.2);
  border-color: var(--accent);
  color: var(--accent);
}

.community-callout.hero {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1rem;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1;
  color: var(--accent);
  background: transparent;
  border: 2px solid var(--accent);
  border-radius: var(--radius);
}

.community-callout.hero:hover {
  background: var(--accent);
  color: var(--bg-primary);
}

.community-text {
  line-height: 1;
}

.community-text strong {
  font-weight: 600;
}

.community-arrow {
  opacity: 0.9;
}

.community-external {
  font-size: 0.85em;
  opacity: 0.8;
}

</style>
