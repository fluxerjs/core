<template>
  <section class="section">
    <h2>Methods</h2>
    <div
      v-for="m in methods"
      :id="`method-${m.name}`"
      :key="m.name"
      class="method-item"
      :class="{
        'is-deprecated': m.deprecated,
        'is-discord-compat': m.discordJsCompat && !m.deprecated,
      }">
      <div class="deprecated-banner" v-if="m.deprecated">
        <span class="deprecated-badge">Deprecated</span>
        <span v-if="typeof m.deprecated === 'string'" class="deprecated-message">{{
          m.deprecated
        }}</span>
      </div>
      <ApiDiscordCompat
        v-if="m.discordJsCompat && !m.deprecated"
        :to="fluxerMethodLink(m.name)"
        variant="banner" />
      <div class="method-header">
        <code class="method-name">{{ m.name }}</code>
        <span v-if="m.deprecated" class="deprecated-badge-inline">deprecated</span>
      </div>
      <div class="method-sig-wrap">
        <TypeSignature :type="methodSignature(m)" />
      </div>
      <p v-if="m.description" class="method-desc"><DocDescription :text="m.description" /></p>
      <ParamsTable v-if="m.params?.length" :params="m.params" />
      <div v-if="m.examples?.length" class="method-examples">
        <CodeBlock
          v-for="(ex, i) in m.examples"
          :key="i"
          :code="ex"
          language="javascript"
          :link-types="true" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
import type { DocMethod } from '../types/doc-schema';
import ApiDiscordCompat from './ApiDiscordCompat.vue';
import DocDescription from './DocDescription.vue';
import ParamsTable from './ParamsTable.vue';
import TypeSignature from './TypeSignature.vue';
import CodeBlock from './CodeBlock.vue';

const props = defineProps<{ methods: DocMethod[]; parentName?: string }>();
const route = useRoute();

function fluxerMethodLink(methodName: string) {
  const version = (route.params.version as string) ?? 'latest';
  const cls = props.parentName;
  if (!cls) return undefined;
  return { path: `/v/${version}/docs/classes/${cls}`, hash: `#method-${methodName}` };
}

function methodSignature(m: DocMethod) {
  const paramsStr = (m.params ?? [])
    .map((p) => `${p.name}${p.optional ? '?' : ''}: ${p.type}`)
    .join(', ');
  return `(${paramsStr}): ${m.returns}`;
}
</script>

<style scoped>
.section {
  margin-bottom: 2.5rem;
}

.section h2 {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 1rem;
}

.method-item {
  margin-bottom: 1.75rem;
  padding-bottom: 1.75rem;
  border-bottom: 1px solid var(--border-subtle);
}

.method-item:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.method-item.is-deprecated {
  background: var(--deprecated-bg);
  border: 1px solid var(--deprecated-border);
  border-radius: var(--radius);
  padding: 1.25rem;
  margin-bottom: 1.75rem;
}

.method-item.is-deprecated:last-child {
  margin-bottom: 0;
}

.method-item.is-discord-compat {
  background: var(--discord-compat-bg);
  border: 1px solid var(--discord-compat-border);
  border-radius: var(--radius);
  padding: 1.25rem;
  margin-bottom: 1.75rem;
}

.method-item.is-discord-compat:last-child {
  margin-bottom: 0;
}

.deprecated-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--deprecated-border);
}

.deprecated-badge {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #1c1917;
  background: var(--deprecated);
  padding: 0.3em 0.65em;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.deprecated-message {
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

.deprecated-badge-inline {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--deprecated);
  background: rgba(245, 158, 11, 0.2);
  padding: 0.2em 0.5em;
  border-radius: var(--radius-sm);
}

.method-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
}

.method-name {
  font-weight: 500;
  font-size: 1rem;
}

.method-sig-wrap {
  margin-bottom: 0.5rem;
}

.method-sig-wrap :deep(.type-sig) {
  font-size: 0.85rem;
}

.method-desc {
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.method-examples {
  margin-top: 1rem;
}

.method-examples :deep(.code-block) {
  margin-bottom: 0.75rem;
}

.method-examples :deep(.code-block:last-child) {
  margin-bottom: 0;
}
</style>
