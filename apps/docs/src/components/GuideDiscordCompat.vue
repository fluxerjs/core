<template>
  <router-link
    v-if="fluxerPath"
    :to="fluxerPath"
    class="guide-discord-compat guide-discord-compat--link"
    aria-label="Discord.js compatible — view Fluxer API">
    <span class="guide-discord-compat-badge">Discord.js compatible</span>
  </router-link>
  <a
    v-else-if="externalHref"
    :href="externalHref"
    target="_blank"
    rel="noopener noreferrer"
    class="guide-discord-compat guide-discord-compat--link"
    aria-label="Discord.js compatible">
    <span class="guide-discord-compat-badge">Discord.js compatible</span>
  </a>
  <span v-else class="guide-discord-compat" aria-label="Discord.js compatible">
    <span class="guide-discord-compat-badge">Discord.js compatible</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useVersionedPath } from '../composables/useVersionedPath';

const props = defineProps<{
  /** Fluxer API path (e.g. /docs/classes/GuildMemberRoleManager) or external URL. */
  href?: string;
}>();

const { path: versionedPath } = useVersionedPath();

const isExternal = computed(
  () => typeof props.href === 'string' && /^https?:\/\//i.test(props.href),
);

const fluxerPath = computed(() => {
  if (!props.href || isExternal.value) return undefined;
  const p = props.href.startsWith('/') ? props.href : `/${props.href}`;
  // Use latest for /docs/ paths so links work even when viewing older versions (e.g. GuildMemberRoleManager in v1.2+)
  if (p.startsWith('/docs/')) return `/v/latest${p}`;
  return versionedPath(p);
});

const externalHref = computed(() => (props.href && isExternal.value ? props.href : undefined));
</script>

<style scoped>
.guide-discord-compat {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.6rem;
  margin-left: 0.5rem;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--discord-compat-badge-text, #0d3b1a);
  background: var(--discord-compat, #57f287);
  border: 1px solid var(--discord-compat-border, rgba(87, 242, 135, 0.35));
  border-radius: var(--radius-sm, 4px);
  text-decoration: none;
  vertical-align: middle;
  flex-shrink: 0;
}

.guide-discord-compat--link:hover {
  background: #4ae87a;
  border-color: #2d8a4a;
}

.guide-discord-compat-badge {
  white-space: nowrap;
}
</style>
