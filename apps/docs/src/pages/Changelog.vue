<template>
  <div class="changelog-page">
    <div class="changelog-hero">
      <h1>Changelog</h1>
      <p class="lead">Release history and changes for Fluxer.js SDK.</p>
      <div class="version-filter" role="group" aria-label="Filter by version">
        <button
          type="button"
          class="filter-pill"
          :class="{ active: selectedVersion === null }"
          @click="selectedVersion = null"
        >
          All versions
        </button>
        <button
          v-for="v in versions"
          :key="v"
          type="button"
          class="filter-pill"
          :class="{ active: selectedVersion === v }"
          @click="selectedVersion = v"
        >
          v{{ v }}
        </button>
      </div>
    </div>
    <div class="changelog-entries">
      <article
        v-for="entry in filteredChangelog"
        :id="`v${entry.version}`"
        :key="entry.version"
        class="changelog-entry"
      >
        <header class="entry-header">
          <h2 class="entry-version">
            v{{ entry.version }}
            <button
              type="button"
              class="copy-link-btn"
              :aria-label="`Copy link to v${entry.version}`"
              @click="copyLink(`#v${entry.version}`)"
            >
              #
            </button>
          </h2>
          <time class="entry-date">{{ formatDate(entry.date) }}</time>
        </header>
        <div
          v-for="section in entry.sections"
          :id="`v${entry.version}-${sectionSlug(section.title)}`"
          :key="section.title"
          class="section"
        >
          <h3 class="section-title">
            {{ section.title }}
            <button
              type="button"
              class="copy-link-btn"
              :aria-label="`Copy link to ${section.title}`"
              @click="copyLink(`#v${entry.version}-${sectionSlug(section.title)}`)"
            >
              #
            </button>
          </h3>
          <ul class="section-items">
            <li v-for="(item, i) in section.items" :key="i" class="item">
              {{ item }}
            </li>
          </ul>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { changelogEntries } from '../data/changelog';

const route = useRoute();
const router = useRouter();

const versions = changelogEntries.map((e) => e.version);

// Sync with ?version= query param
const initVersion = (() => {
  const v = route.query.version as string | undefined;
  return v && versions.includes(v) ? v : null;
})();
const selectedVersion = ref<string | null>(initVersion);

watch(
  () => route.query.version as string | undefined,
  (v) => {
    selectedVersion.value = v && versions.includes(v) ? v : null;
  },
  { immediate: true }
);

watch(selectedVersion, (v) => {
  const base = { ...route.query } as Record<string, string>;
  const next = v ? { ...base, version: v } : Object.fromEntries(Object.entries(base).filter(([k]) => k !== 'version'));
  router.replace({ query: next });
});

const filteredChangelog = computed(() =>
  selectedVersion.value
    ? changelogEntries.filter((e) => e.version === selectedVersion.value)
    : changelogEntries
);

function sectionSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

async function copyLink(hash: string) {
  const url = `${window.location.origin}${window.location.pathname}${hash}`;
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    // fallback
  }
}
</script>

<style scoped>
.changelog-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 2rem 2.5rem;
}

.changelog-hero {
  margin-bottom: 2.5rem;
}

.changelog-hero h1 {
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

.version-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1.25rem;
}

.filter-pill {
  font-size: 0.85rem;
  font-weight: 500;
  padding: 0.4rem 0.85rem;
  border-radius: 9999px;
  border: 1px solid var(--border);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    color 0.15s,
    border-color 0.15s,
    background 0.15s;
}

.filter-pill:hover {
  color: var(--text-primary);
  border-color: var(--border);
  background: var(--bg-hover);
}

.filter-pill.active {
  border-color: var(--accent);
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, transparent);
}

.changelog-entries {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.changelog-entry {
  padding-bottom: 2rem;
  border-bottom: 1px solid var(--border);
}

.changelog-entry:last-child {
  border-bottom: none;
}

.entry-header {
  display: flex;
  align-items: baseline;
  gap: 1rem;
  margin-bottom: 1rem;
}

.entry-version {
  font-size: 1.25rem;
  font-weight: 600;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  letter-spacing: -0.02em;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.entry-date {
  font-size: 0.9rem;
  color: var(--text-muted);
}

.section {
  margin-bottom: 1.5rem;
}

.section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
  letter-spacing: 0.01em;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.entry-version {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.copy-link-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 0.85em;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  cursor: pointer;
  padding: 0.2em 0.4em;
  border-radius: var(--radius-sm);
  opacity: 0.6;
  transition:
    opacity 0.15s,
    color 0.15s;
}

.copy-link-btn:hover {
  opacity: 1;
  color: var(--accent);
}

.section-items {
  margin: 0;
  padding-left: 1.25rem;
  list-style: disc;
}

.item {
  padding: 0.2rem 0;
  font-size: 0.9rem;
  line-height: 1.65;
  color: var(--text-secondary);
}
</style>
