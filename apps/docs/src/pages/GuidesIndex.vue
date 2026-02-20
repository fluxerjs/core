<template>
  <div class="guides-index">
    <div class="hero">
      <h1>Guides</h1>
      <p class="lead">Learn how to build bots with Fluxer.js. Pick a guide to get started.</p>
      <div class="quick-links">
        <span class="quick-links-label">Quick links:</span>
        <router-link :to="versionedPath('/api')" class="quick-link">REST API</router-link>
        <router-link
          v-for="g in quickLinks"
          :key="g.id"
          :to="versionedPath(`/guides/${g.slug}`)"
          class="quick-link">
          {{ g.title }}
        </router-link>
      </div>
    </div>
    <div v-for="(items, cat) in sortedGroupedGuides" :key="cat" class="guide-group">
      <h2 class="group-title">{{ getCategoryLabel(cat) }}</h2>
      <div class="guide-cards">
        <router-link
          v-for="g in items"
          :key="g.id"
          :to="versionedPath(`/guides/${g.slug}`)"
          class="guide-card">
          <h3 class="guide-card-title">{{ g.title }}</h3>
          <p class="guide-card-desc">{{ g.description }}</p>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { getCategoryLabel, CATEGORY_ORDER, QUICK_LINK_SLUGS } from '../data/guides';
import { useGuidesStore } from '../stores/guides';
import { useVersionedPath } from '../composables/useVersionedPath';
import { Guide } from '../data/guides';

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

const sortedGroupedGuides = computed(() => {
  const groups = groupedGuides.value;
  const sorted: Record<string, Guide[]> = {};
  for (const cat of CATEGORY_ORDER) {
    if (groups[cat]?.length) sorted[cat] = groups[cat];
  }
  for (const cat of Object.keys(groups)) {
    if (!CATEGORY_ORDER.includes(cat)) sorted[cat] = groups[cat];
  }
  return sorted;
});

const quickLinks = computed(() => {
  const bySlug = new Map(guidesStore.guides.map((g) => [g.slug, g]));
  return QUICK_LINK_SLUGS.map((slug) => bySlug.get(slug)).filter((g): g is Guide => g != null);
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

.quick-links {
  margin-top: 1.25rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.75rem;
}

.quick-links-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-muted);
}

.quick-link {
  font-size: 0.9rem;
  color: var(--accent);
  text-decoration: none;
}

.quick-link:hover {
  text-decoration: underline;
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
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
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
