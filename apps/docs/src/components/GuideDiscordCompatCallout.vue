<template>
  <div v-if="href" class="guide-discord-callout" role="note" aria-label="Discord.js compatible">
    <router-link v-if="fluxerPath" :to="fluxerPath" class="guide-discord-callout-badge">
      Discord.js compatible
    </router-link>
    <a
      v-else
      :href="href"
      target="_blank"
      rel="noopener noreferrer"
      class="guide-discord-callout-link">
      View docs →
    </a>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useVersionedPath } from '../composables/useVersionedPath';

const props = defineProps<{
  /** Fluxer API path (e.g. /docs/classes/GuildMemberRoleManager) or external URL. */
  href: string;
}>();

const { path: versionedPath } = useVersionedPath();

const isExternal = computed(() => /^https?:\/\//i.test(props.href));

const fluxerPath = computed(() => {
  if (isExternal.value) return undefined;
  const p = props.href.startsWith('/') ? props.href : `/${props.href}`;
  // Use latest for /docs/ paths so links work even when viewing older versions (e.g. GuildMemberRoleManager in v1.2+)
  if (p.startsWith('/docs/')) return `/v/latest${p}`;
  return versionedPath(p);
});
</script>

<style scoped>
.guide-discord-callout {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 1rem;
  margin: 0.5rem 0 0.75rem 0;
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--text-secondary);
  background: var(--discord-compat-bg);
  border: 1px solid var(--discord-compat-border);
  border-left: 3px solid var(--discord-compat);
  border-radius: var(--radius-sm);
}

.guide-discord-callout-badge {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--discord-compat-badge-text);
  background: var(--discord-compat);
  padding: 0.25em 0.6em;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  text-decoration: none;
}

.guide-discord-callout-badge:hover {
  background: #4ae87a;
}

.guide-discord-callout-link {
  color: var(--accent);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.15s;
}

.guide-discord-callout-link:hover {
  color: var(--accent-hover);
  text-decoration: underline;
}
</style>
