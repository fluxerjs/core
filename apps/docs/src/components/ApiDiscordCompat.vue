<template>
  <router-link
    v-if="to"
    :to="to"
    class="api-discord-compat"
    :class="[variant]"
    aria-label="Discord.js compatible — view Fluxer API">
    <span class="api-discord-compat-badge">Discord.js compatible</span>
  </router-link>
  <span v-else class="api-discord-compat" :class="[variant]" aria-label="Discord.js compatible">
    <span class="api-discord-compat-badge">Discord.js compatible</span>
  </span>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router';

defineProps<{
  /** Route to Fluxer API docs (class page, or class#method-x / class#property-x). */
  to?: RouteLocationRaw;
  /** 'banner' = full banner like deprecated, 'inline' = small badge next to name */
  variant?: 'banner' | 'inline';
}>();
</script>

<style scoped>
.api-discord-compat {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none;
  flex-shrink: 0;
}

.api-discord-compat-badge {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--discord-compat-badge-text);
  background: var(--discord-compat);
  padding: 0.3em 0.65em;
  border-radius: var(--radius-sm);
}

/* Banner variant — like deprecated-banner */
.api-discord-compat.banner {
  padding-bottom: 0.75rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--discord-compat-border);
}

.api-discord-compat.banner .api-discord-compat-badge {
  flex-shrink: 0;
}

/* Inline variant — like deprecated-badge-inline */
.api-discord-compat.inline .api-discord-compat-badge {
  font-size: 0.65rem;
  font-weight: 600;
  padding: 0.2em 0.5em;
  color: var(--discord-compat);
  background: rgba(87, 242, 135, 0.2);
}
</style>
