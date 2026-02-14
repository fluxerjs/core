<template>
  <div class="guides-layout">
    <aside class="guides-sidebar">
      <h3 class="guides-sidebar-title">Guides</h3>
      <nav class="guides-nav">
        <div v-for="(items, cat) in groupedGuides" :key="cat" class="guide-group">
          <span class="guide-group-label">{{ getCategoryLabel(cat) }}</span>
          <router-link
            v-for="g in items"
            :key="g.id"
            :to="versionedPath(`/guides/${g.slug}`)"
            class="guide-nav-link"
            active-class="active"
          >
            {{ g.title }}
          </router-link>
        </div>
      </nav>
    </aside>
    <main class="guides-content">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { getCategoryLabel } from '../data/guides';
import { useGuidesStore } from '../stores/guides';
import { useVersionedPath } from '../composables/useVersionedPath';

const guidesStore = useGuidesStore();
const { path: versionedPath } = useVersionedPath();

const groupedGuides = computed(() => {
  const groups: Record<string, import('../data/guides').Guide[]> = {};
  for (const g of guidesStore.guides) {
    const cat = g.category;
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(g);
  }
  return groups;
});
</script>

<style scoped>
.guides-layout {
  display: flex;
  flex: 1;
  min-height: 0;
}

.guides-sidebar {
  width: 220px;
  flex-shrink: 0;
  padding: 1.5rem 0;
  border-right: 1px solid var(--border);
  position: sticky;
  top: 0;
  align-self: flex-start;
  max-height: calc(100vh - 2rem);
  overflow-y: auto;
}

.guides-sidebar-title {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  padding: 0 1.25rem;
  margin-bottom: 1rem;
}

.guide-group {
  margin-bottom: 1.25rem;
}

.guide-group-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  padding: 0 1.25rem 0.4rem;
}

.guide-nav-link {
  display: block;
  padding: 0.35rem 1.25rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
  text-decoration: none;
  border-left: 2px solid transparent;
  transition: color 0.15s, background 0.15s;
}

.guide-nav-link:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.guide-nav-link.active {
  color: var(--accent);
  border-left-color: var(--accent);
  background: var(--bg-active);
}

.guides-content {
  flex: 1;
  padding: 2rem 2.5rem;
  max-width: 720px;
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
