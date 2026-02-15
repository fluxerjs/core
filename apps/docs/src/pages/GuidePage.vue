<template>
  <article v-if="guide" class="guide-page">
    <nav class="breadcrumbs" aria-label="Breadcrumb">
      <router-link :to="versionedPath('/guides')">Guides</router-link>
      <span class="breadcrumb-sep">/</span>
      <span class="breadcrumb-category">{{ getCategoryLabel(guide.category) }}</span>
      <span class="breadcrumb-sep">/</span>
      <span class="breadcrumb-current">{{ guide.title }}</span>
    </nav>
    <div class="guide-header">
      <span class="guide-category">{{ getCategoryLabel(guide.category) }}</span>
      <h1 class="guide-title">{{ guide.title }}</h1>
      <p class="guide-desc">{{ guide.description }}</p>
    </div>

    <template v-for="(section, i) in guide.sections" :key="i">
      <section class="guide-section">
        <h2 v-if="section.title" class="section-title">{{ section.title }}</h2>
        <p v-if="section.description" class="section-desc">{{ section.description }}</p>
        <CodeBlock
          v-if="section.code"
          :code="section.code"
          :language="section.language ?? 'javascript'"
          :link-types="section.language !== 'bash'"
        />
      </section>
    </template>

    <nav class="guide-nav">
      <router-link
        v-if="prevGuide"
        :to="versionedPath(`/guides/${prevGuide.slug}`)"
        class="guide-nav-link guide-prev"
      >
        ← {{ prevGuide.title }}
      </router-link>
      <router-link
        v-if="nextGuide"
        :to="versionedPath(`/guides/${nextGuide.slug}`)"
        class="guide-nav-link guide-next"
      >
        {{ nextGuide.title }} →
      </router-link>
    </nav>
  </article>
  <div v-else class="not-found">
    <p>Guide not found.</p>
    <router-link :to="versionedPath('/guides')">Back to guides</router-link>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { getCategoryLabel } from '../data/guides';
import { useGuidesStore } from '../stores/guides';
import { useVersionedPath } from '../composables/useVersionedPath';
import CodeBlock from '../components/CodeBlock.vue';

const route = useRoute();
const guidesStore = useGuidesStore();
const { path: versionedPath } = useVersionedPath();
const slug = computed(() => route.params.slug as string);

const guide = computed(() => guidesStore.getGuideBySlug(slug.value));

const guideIndex = computed(() => {
  const guides = guidesStore.guides;
  const idx = guides.findIndex((g) => g.slug === slug.value);
  return idx >= 0 ? idx : -1;
});

const prevGuide = computed(() => {
  const guides = guidesStore.guides;
  const i = guideIndex.value;
  return i > 0 ? guides[i - 1] : null;
});

const nextGuide = computed(() => {
  const guides = guidesStore.guides;
  const i = guideIndex.value;
  return i >= 0 && i < guides.length - 1 ? guides[i + 1] : null;
});
</script>

<style scoped>
.breadcrumbs {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 1rem;
}

.breadcrumbs a {
  color: var(--text-secondary);
}

.breadcrumbs a:hover {
  color: var(--accent);
}

.breadcrumb-sep {
  margin: 0 0.4rem;
  opacity: 0.6;
}

.breadcrumb-current {
  color: var(--text-primary);
}

.guide-header {
  margin-bottom: 2rem;
}

.guide-category {
  display: inline-block;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--badge-enum);
  margin-bottom: 0.5rem;
}

.guide-title {
  font-size: 1.75rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  letter-spacing: -0.02em;
}

.guide-desc {
  font-size: 1rem;
  color: var(--text-secondary);
  line-height: 1.6;
}

.guide-section {
  margin-bottom: 2rem;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.section-desc {
  font-size: 0.9rem;
  color: var(--text-muted);
  margin-bottom: 0.75rem;
  line-height: 1.5;
}

.guide-nav {
  display: flex;
  justify-content: space-between;
  margin-top: 2.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-subtle);
}

.guide-nav-link {
  font-size: 0.9rem;
  font-weight: 500;
}

.guide-nav-link:hover {
  text-decoration: underline;
}

.not-found {
  color: var(--text-muted);
}

.not-found a {
  display: inline-block;
  margin-top: 0.5rem;
}
</style>
