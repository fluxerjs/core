<template>
  <div class="guides-layout">
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
    <aside class="guides-sidebar sidebar-base" :class="{ 'is-open': sidebarOpen }">
      <h3 class="sidebar-title">Guides</h3>
      <CommunityCallout variant="sidebar" />
      <router-link :to="versionedPath('/api')" class="guides-rest-api-link">REST API →</router-link>
      <div class="sidebar-filter-wrap">
        <input
          v-model="filter"
          type="search"
          placeholder="Search guides..."
          class="sidebar-filter" />
      </div>
      <nav class="guides-nav">
        <div v-for="(items, cat) in filteredGroupedGuides" :key="cat" class="guide-group">
          <span class="sidebar-group-label">{{ getCategoryLabel(cat) }}</span>
          <router-link
            v-for="g in items"
            :key="g.id"
            :to="versionedPath(`/guides/${g.slug}`)"
            class="sidebar-link"
            active-class="active">
            {{ g.title }}
          </router-link>
        </div>
      </nav>
    </aside>
    <main class="guides-content">
      <div class="guides-content-scroll">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
      <Footer class="content-footer" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import Footer from '../components/Footer.vue';
import CommunityCallout from '../components/CommunityCallout.vue';
import { getCategoryLabel, CATEGORY_ORDER } from '../data/guides';
import { useGuidesStore } from '../stores/guides';
import { useVersionedPath } from '../composables/useVersionedPath';

const route = useRoute();
const guidesStore = useGuidesStore();
const { path: versionedPath } = useVersionedPath();
const filter = ref('');
const sidebarOpen = ref(false);

watch(
  () => route.path,
  () => {
    sidebarOpen.value = false;
  },
);

const groupedGuides = computed(() => {
  const groups: Record<string, import('../data/guides').Guide[]> = {};
  for (const g of guidesStore.guides) {
    const cat = g.category;
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(g);
  }
  return groups;
});

const sortGroupedByCategory = (
  groups: Record<string, import('../data/guides').Guide[]>,
): Record<string, import('../data/guides').Guide[]> => {
  const sorted: Record<string, import('../data/guides').Guide[]> = {};
  for (const cat of CATEGORY_ORDER) {
    if (groups[cat]?.length) sorted[cat] = groups[cat];
  }
  for (const cat of Object.keys(groups)) {
    if (!CATEGORY_ORDER.includes(cat)) sorted[cat] = groups[cat];
  }
  return sorted;
};

const filteredGroupedGuides = computed(() => {
  const q = filter.value.toLowerCase().trim();
  if (!q) return sortGroupedByCategory(groupedGuides.value);

  const filtered: Record<string, import('../data/guides').Guide[]> = {};
  for (const [cat, items] of Object.entries(groupedGuides.value)) {
    const matched = items.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q) ||
        getCategoryLabel(cat).toLowerCase().includes(q),
    );
    if (matched.length) filtered[cat] = matched;
  }
  return sortGroupedByCategory(filtered);
});
</script>

<style scoped>
.guides-layout {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.guides-sidebar {
  /* Shared styles from .sidebar-base in main.css */
}

.guides-rest-api-link {
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

.guides-rest-api-link:hover {
  background: rgba(99, 179, 237, 0.18);
  border-color: var(--accent);
}

.guides-sidebar .sidebar-filter-wrap {
  margin: 0 var(--sidebar-padding-x) 1rem;
}

.guides-sidebar .sidebar-filter {
  width: 100%;
  box-sizing: border-box;
  padding: 0.5rem var(--sidebar-padding-x);
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.85rem;
}

.guides-sidebar .sidebar-filter::placeholder {
  color: var(--text-muted);
}

.guides-sidebar .sidebar-filter:focus {
  outline: none;
  border-color: var(--accent);
}

.guide-group {
  margin-bottom: 0.5rem;
}

.guides-content {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.guides-content-scroll {
  flex: 1;
  padding: 1.5rem 2rem;
  max-width: 1600px;
  width: 100%;
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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
