<template>
  <article v-if="guide" class="guide-page">
    <div class="guide-content">
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
        <section
          class="guide-section"
          :class="{ 'guide-section--discord-compat': section.discordJsCompat }"
          :id="sectionId(section, i)">
          <h2 v-if="section.title" class="section-title">
            {{ section.title }}
            <GuideDiscordCompat
              v-if="section.discordJsCompat"
              :href="
                typeof section.discordJsCompat === 'string' ? section.discordJsCompat : undefined
              " />
          </h2>
          <GuideDiscordCompatCallout
            v-if="typeof section.discordJsCompat === 'string'"
            :href="section.discordJsCompat" />
          <p v-if="section.description" class="section-desc">{{ section.description }}</p>
          <GuideTable
            v-if="section.table"
            :headers="section.table.headers"
            :rows="section.table.rows"
            :code-columns="section.table.codeColumns" />
          <GuideTip v-if="section.tip" :tip="section.tip" />
          <GuideCodeBlock
            v-if="section.code"
            :code="section.code"
            :language="section.language"
            :alternate-code="section.alternateCode" />
        </section>
      </template>

      <nav class="guide-nav">
        <router-link
          v-if="prevGuide"
          :to="versionedPath(`/guides/${prevGuide.slug}`)"
          class="guide-nav-link guide-prev">
          ← {{ prevGuide.title }}
        </router-link>
        <router-link
          v-if="nextGuide"
          :to="versionedPath(`/guides/${nextGuide.slug}`)"
          class="guide-nav-link guide-next">
          {{ nextGuide.title }} →
        </router-link>
      </nav>
    </div>
    <nav v-if="tocItems.length" class="guide-toc" aria-label="On this page">
      <span class="toc-title">On this page</span>
      <a v-for="item in tocItems" :key="item.id" :href="`#${item.id}`" class="toc-link">
        {{ item.label }}
      </a>
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
import GuideCodeBlock from '../components/GuideCodeBlock.vue';
import GuideDiscordCompat from '../components/GuideDiscordCompat.vue';
import GuideDiscordCompatCallout from '../components/GuideDiscordCompatCallout.vue';
import GuideTable from '../components/GuideTable.vue';
import GuideTip from '../components/GuideTip.vue';

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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function sectionId(section: { title?: string }, i: number): string {
  if (section.title) return `section-${slugify(section.title)}-${i}`;
  return `section-${i}`;
}

const tocItems = computed(() => {
  if (!guide.value) return [];
  return guide.value.sections
    .map((s, i) => (s.title ? { id: sectionId(s, i), label: s.title } : null))
    .filter((x): x is { id: string; label: string } => x !== null);
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
  margin-bottom: 1.5rem;
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
  margin-bottom: 1.5rem;
}

.guide-section--discord-compat {
  padding: 1rem 1.25rem;
  background: var(--discord-compat-bg);
  border: 1px solid var(--discord-compat-border);
  border-radius: var(--radius);
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
  margin-top: 2rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--border-subtle);
}

.guide-nav-link {
  font-size: 0.9rem;
  font-weight: 500;
}

.guide-nav-link:hover {
  text-decoration: underline;
}

.guide-page {
  display: flex;
  gap: 2rem;
  width: 100%;
}

.guide-content {
  flex: 1;
  min-width: 0;
}

.guide-toc {
  flex-shrink: 0;
  width: 220px;
  position: sticky;
  top: 1.5rem;
  align-self: flex-start;
  padding: 1rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius);
}

.guide-toc .toc-title {
  display: block;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  margin-bottom: 0.75rem;
}

.guide-toc .toc-link {
  display: block;
  font-size: 0.85rem;
  color: var(--text-secondary);
  padding: 0.25rem 0;
  text-decoration: none;
  transition: color 0.15s;
}

.guide-toc .toc-link:hover {
  color: var(--accent);
}

.not-found {
  color: var(--text-muted);
}

.not-found a {
  display: inline-block;
  margin-top: 0.5rem;
}
</style>
