<template>
  <div class="app">
    <header class="header">
      <router-link to="/" class="logo">Fluxer.js</router-link>
      <nav class="header-nav">
        <router-link to="/v/latest/guides" class="header-link">Guides</router-link>
        <router-link to="/v/latest/docs" class="header-link">Docs</router-link>
        <VersionPicker />
        <a href="https://github.com/fluxerjs/core" target="_blank" rel="noopener noreferrer" class="header-link">GitHub</a>
        <a href="https://fluxer.gg/fluxer-js" target="_blank" rel="noopener noreferrer" class="header-link header-link-external">Fluxer</a>
      </nav>
    </header>
    <div class="layout">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useDocsStore } from './stores/docs';
import { useGuidesStore } from './stores/guides';
import { useVersionStore } from './stores/version';
import VersionPicker from './components/VersionPicker.vue';

const route = useRoute();
const docsStore = useDocsStore();
const guidesStore = useGuidesStore();
const versionStore = useVersionStore();

onMounted(async () => {
  await versionStore.loadVersions();
});

// Sync route version to store when navigating
watch(
  () => route.params.version as string | undefined,
  (v) => {
    if (v) versionStore.setVersion(v);
  },
  { immediate: true }
);

// Lazy-load docs only when visiting docs section; each version = separate file
watch(
  () => ({ path: route.path, version: route.params.version }),
  async ({ path, version }) => {
    if (!version) return;
    const key = (version as string) === 'latest' ? 'latest' : (version as string);
    if (path?.includes('/docs')) await docsStore.loadDocs(key);
    if (path?.includes('/guides')) await guidesStore.loadGuides(key);
  },
  { immediate: true }
);
</script>

<style scoped>
.app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  z-index: 1;
}

.header {
  height: 56px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 1.5rem;
  gap: 2rem;
  flex-shrink: 0;
}

.logo {
  font-weight: 700;
  font-size: 1.2rem;
  color: var(--text-primary);
  text-decoration: none;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  letter-spacing: -0.02em;
}

.logo:hover {
  color: var(--accent);
  text-decoration: none;
}

.header-nav {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex: 1;
}

.header-link {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 0.15s;
}

.header-link:hover {
  color: var(--accent);
}

.header-link.router-link-active {
  color: var(--accent);
}

.header-link-external::after {
  content: ' ↗';
  font-size: 0.75em;
  opacity: 0.6;
}

.layout {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
