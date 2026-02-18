<template>
  <div class="api-layout">
    <button
      type="button"
      class="sidebar-toggle"
      aria-label="Toggle navigation menu"
      @click="sidebarOpen = !sidebarOpen">
      <span class="toggle-icon">{{ sidebarOpen ? '✕' : '☰' }}</span>
    </button>
    <div
      v-if="sidebarOpen"
      class="sidebar-backdrop"
      aria-hidden="true"
      @click="sidebarOpen = false" />
    <aside class="api-sidebar sidebar-base" :class="{ 'is-open': sidebarOpen }">
      <h3 class="sidebar-title">REST API</h3>
      <router-link :to="versionedPath('/guides')" class="api-guides-link">Guides →</router-link>
      <nav class="api-nav">
        <a
          v-for="cat in API_CATEGORIES"
          :key="cat"
          :href="`#${cat}`"
          class="sidebar-link"
          @click="sidebarOpen = false">
          {{ API_CATEGORY_LABELS[cat] }}
        </a>
      </nav>
    </aside>
    <main class="api-content">
      <div class="api-content-scroll">
        <router-view />
      </div>
      <Footer class="content-footer" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import Footer from '../components/Footer.vue';
import { API_CATEGORIES, API_CATEGORY_LABELS } from '../data/apiEndpoints';
import { useVersionedPath } from '../composables/useVersionedPath';

const route = useRoute();
const { path: versionedPath } = useVersionedPath();
const sidebarOpen = ref(false);

watch(
  () => route.path,
  () => {
    sidebarOpen.value = false;
  },
);
</script>

<style scoped>
.api-layout {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.api-sidebar {
  /* Shared from .sidebar-base */
}

.api-guides-link {
  display: block;
  margin: 0 var(--sidebar-padding-x) 1rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--accent);
  text-decoration: none;
  background: rgba(99, 179, 237, 0.1);
  border: 1px solid rgba(99, 179, 237, 0.25);
  border-radius: var(--radius-sm);
  transition:
    background 0.15s,
    border-color 0.15s;
}

.api-guides-link:hover {
  background: rgba(99, 179, 237, 0.18);
  border-color: var(--accent);
}

.api-nav {
  display: flex;
  flex-direction: column;
}

.api-sidebar .sidebar-link {
  padding: 0.5rem var(--sidebar-padding-x);
  font-size: 0.9rem;
  color: var(--text-secondary);
  text-decoration: none;
  border-left: 2px solid transparent;
  margin-left: 2px;
  transition:
    color 0.15s,
    background 0.15s,
    border-color 0.15s;
}

.api-sidebar .sidebar-link:hover {
  color: var(--accent);
  background: var(--bg-hover);
}

.api-content {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.api-content-scroll {
  flex: 1;
  padding: 2rem 2.5rem;
  max-width: 1280px;
  min-width: 0;
}

.content-footer {
  flex-shrink: 0;
}

.sidebar-toggle {
  display: none;
  position: fixed;
  bottom: 1.25rem;
  left: 1.25rem;
  z-index: 99;
  width: 48px;
  height: 48px;
  padding: 0;
  background: var(--accent);
  color: var(--bg-primary);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.25rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition:
    transform 0.2s,
    background 0.2s;
}

.sidebar-toggle:hover {
  background: var(--accent-hover);
  transform: scale(1.05);
}

.sidebar-backdrop {
  display: none;
  position: fixed;
  inset: 0;
  z-index: 99;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
}

@media (max-width: 900px) {
  .sidebar-toggle,
  .sidebar-backdrop {
    display: block;
  }
}
</style>
