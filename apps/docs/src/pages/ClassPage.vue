<template>
  <div v-if="clazz" class="class-page">
    <div
      class="page-content"
      :class="{
        'class-deprecated': clazz.deprecated,
        'class-discord-compat': clazz.discordJsCompat,
      }">
      <div v-if="clazz.deprecated" class="deprecated-banner">
        <span class="deprecated-badge">Deprecated</span>
        <span v-if="typeof clazz.deprecated === 'string'" class="deprecated-message">{{
          clazz.deprecated
        }}</span>
      </div>
      <ApiDiscordCompat
        v-if="clazz.discordJsCompat && !clazz.deprecated"
        :to="fluxerClassLink"
        variant="banner" />
      <div class="page-header">
        <span class="kind-badge kind-class">class</span>
        <h1>{{ clazz.name }}</h1>
        <span v-if="clazz.deprecated" class="deprecated-badge-inline">deprecated</span>
        <template v-if="clazz.extends">
          <span class="extends-label">extends</span>
          <router-link
            v-if="extendsClassExists"
            :to="{ name: 'class', params: { version: routeVersion, class: clazz.extends } }"
            class="extends-link">
            {{ clazz.extends }}
          </router-link>
          <span v-else class="extends-text">{{ clazz.extends }}</span>
        </template>
      </div>
      <p v-if="description" class="description"><DocDescription :text="description" /></p>
      <a
        v-if="clazz.source?.path"
        :href="sourceUrl(clazz.source)"
        target="_blank"
        rel="noopener noreferrer"
        class="source-link">
        View source
      </a>

      <ConstructorSection v-if="constructor" :constructor="constructor" :class-name="clazz.name" />
      <PropertiesSection
        v-if="properties.length"
        :properties="properties"
        :parent-name="clazz?.name"
        parent-type="class" />
      <MethodsSection v-if="methods.length" :methods="methods" :parent-name="clazz.name" />
    </div>
    <nav v-if="tocItems.length" class="on-this-page" aria-label="On this page">
      <span class="toc-title">On this page</span>
      <a v-for="item in tocItems" :key="item.id" :href="`#${item.id}`" class="toc-link">
        {{ item.label }}
      </a>
    </nav>
  </div>
  <div v-else-if="store.loading" class="loading">
    <p>Loading...</p>
  </div>
  <div v-else-if="store.error" class="error">
    <p>Failed to load docs: {{ store.error }}</p>
  </div>
  <div v-else class="not-found">
    <p>Class not found in this version.</p>
    <p class="not-found-hint">
      It may have been added in a later release.
      <router-link :to="latestClassPath" class="not-found-link">View in latest docs →</router-link>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useDocsStore } from '../stores/docs';
import ApiDiscordCompat from '../components/ApiDiscordCompat.vue';
import ConstructorSection from '../components/ConstructorSection.vue';
import DocDescription from '../components/DocDescription.vue';
import PropertiesSection from '../components/PropertiesSection.vue';
import MethodsSection from '../components/MethodsSection.vue';

const route = useRoute();
const store = useDocsStore();

const clazz = computed(() => {
  const doc = store.currentDoc;
  const name = route.params.class as string;
  if (!doc || !name) return null;
  return doc.classes?.find((c) => c.name === name) ?? null;
});

const description = computed(() => clazz.value?.description ?? '');

const constructor = computed(() => clazz.value?.constructor);

const properties = computed(() => clazz.value?.properties ?? []);

const methods = computed(() => clazz.value?.methods ?? []);

const routeVersion = computed(() => (route.params.version as string) ?? 'latest');

const latestClassPath = computed(() => {
  const name = route.params.class as string;
  if (!name) return { path: '/v/latest/docs/classes' };
  return { path: `/v/latest/docs/classes/${name}` };
});

const fluxerClassLink = computed(() => {
  if (!clazz.value) return undefined;
  return { path: `/v/${routeVersion.value}/docs/classes/${clazz.value.name}` };
});

const extendsClassExists = computed(() => {
  const ext = clazz.value?.extends;
  if (!ext || !store.currentDoc) return false;
  return store.currentDoc.classes?.some((c) => c.name === ext) ?? false;
});

const tocItems = computed(() => {
  const items: { id: string; label: string }[] = [];
  if (constructor.value) items.push({ id: 'constructor', label: 'Constructor' });
  for (const p of properties.value) {
    items.push({ id: `property-${p.name}`, label: p.name });
  }
  for (const m of methods.value) {
    items.push({ id: `method-${m.name}`, label: `${m.name}()` });
  }
  return items;
});

const GITHUB_BASE = 'https://github.com/fluxerjs/core/blob/main';
function sourceUrl(source: { file: string; line: number; path?: string }) {
  return `${GITHUB_BASE}/${source.path}#L${source.line}`;
}
</script>

<style scoped>
.class-page {
  display: flex;
  gap: 2rem;
  max-width: 960px;
}

.on-this-page {
  flex-shrink: 0;
  width: 180px;
  position: sticky;
  top: 1.5rem;
  align-self: flex-start;
  padding: 1rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius);
}

.toc-title {
  display: block;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  margin-bottom: 0.75rem;
}

.toc-link {
  display: block;
  font-size: 0.85rem;
  color: var(--text-secondary);
  padding: 0.25rem 0;
  text-decoration: none;
  transition: color 0.15s;
}

.toc-link:hover {
  color: var(--accent);
}

.page-content {
  flex: 1;
  min-width: 0;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}

.extends-label {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.extends-link {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.9rem;
}

.extends-text {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.kind-badge {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  padding: 0.25em 0.6em;
  border-radius: var(--radius-sm);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
}

.kind-class {
  background: var(--badge-class-bg);
  color: var(--badge-class);
}

.class-deprecated {
  background: var(--deprecated-bg);
  border: 1px solid var(--deprecated-border);
  border-radius: var(--radius);
  padding: 1.5rem;
  margin: -0.5rem 0 2rem;
}

.class-deprecated .deprecated-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--deprecated-border);
}

.class-deprecated .deprecated-badge {
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

.class-deprecated .deprecated-message {
  font-size: 0.95rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

.class-discord-compat {
  background: var(--discord-compat-bg);
  border: 1px solid var(--discord-compat-border);
  border-radius: var(--radius);
  padding: 1.5rem;
  margin: -0.5rem 0 2rem;
}

.class-discord-compat .api-discord-compat.banner {
  border-bottom-color: var(--discord-compat-border);
}

.deprecated-badge-inline {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--deprecated);
  background: rgba(245, 158, 11, 0.2);
  padding: 0.25em 0.6em;
  border-radius: var(--radius-sm);
}

h1 {
  font-size: 1.75rem;
}

.description {
  color: var(--text-secondary);
  font-size: 0.95rem;
  margin-bottom: 1rem;
}

.source-link {
  display: inline-block;
  font-size: 0.85rem;
  margin-bottom: 1.5rem;
}

.loading,
.not-found {
  color: var(--text-muted);
}

.not-found-hint {
  margin-top: 0.5rem;
  font-size: 0.95rem;
}

.not-found-link {
  color: var(--accent);
  font-weight: 500;
}

.not-found-link:hover {
  text-decoration: underline;
}

.error {
  color: var(--text-error, #dc2626);
}
</style>
