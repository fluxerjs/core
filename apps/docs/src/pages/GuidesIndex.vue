<template>
  <div class="guides-index">
    <div class="hero">
      <h1>Guides</h1>
      <p class="lead">Learn how to build bots with Fluxer.js. Pick a guide to get started.</p>
    </div>
    <div v-for="(items, cat) in groupedGuides" :key="cat" class="guide-group">
      <h2 class="group-title">{{ getCategoryLabel(cat) }}</h2>
      <div class="guide-cards">
        <router-link
          v-for="g in items"
          :key="g.id"
          :to="versionedPath(`/guides/${g.slug}`)"
          class="guide-card"
        >
          <h3 class="guide-card-title">{{ g.title }}</h3>
          <p class="guide-card-desc">{{ g.description }}</p>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { getCategoryLabel } from '../data/guides';
import { useGuidesStore } from '../stores/guides';
import { useVersionedPath } from '../composables/useVersionedPath';
import type { Guide } from '../data/guides';

const guidesStore = useGuidesStore();
const { path: versionedPath } = useVersionedPath();

const groupedGuides = computed(() => {
  const groups: Record<string, Guide[]> = {};
  for (const g of guidesStore.guides) {
    const cat = g.category;
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(g);
  }
  return groups;
});
</script>

<style scoped>
.hero {
  margin-bottom: 2.5rem;
}

.hero h1 {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  letter-spacing: -0.02em;
}

.lead {
  font-size: 1rem;
  color: var(--text-secondary);
  line-height: 1.6;
}

.guide-group {
  margin-bottom: 2rem;
}

.guide-group:last-child {
  margin-bottom: 0;
}

.group-title {
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  margin-bottom: 1rem;
}

.guide-cards {
  display: grid;
  gap: 1rem;
}

.guide-card {
  display: block;
  padding: 1.25rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  text-decoration: none;
  color: var(--text-primary);
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}

.guide-card:hover {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
}

.guide-card-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.35rem;
}

.guide-card-desc {
  font-size: 0.9rem;
  color: var(--text-muted);
  line-height: 1.5;
}
</style>
