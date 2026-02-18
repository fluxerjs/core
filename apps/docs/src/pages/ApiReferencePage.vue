<template>
  <div class="api-reference">
    <header class="api-hero">
      <h1 class="api-title">REST API Reference</h1>
      <p class="api-lead">Bot and webhook endpoints for the Fluxer API.</p>
      <div class="api-quick-info">
        <div class="api-quick-item">
          <span class="api-quick-label">Base path</span>
          <code class="api-quick-value">/v1</code>
        </div>
        <div class="api-quick-item">
          <span class="api-quick-label">Auth (bot)</span>
          <code class="api-quick-value">Authorization: Bot &lt;token&gt;</code>
        </div>
        <div class="api-quick-links">
          <router-link :to="versionedPath('/guides')" class="api-quick-link">Guides →</router-link>
          <router-link :to="versionedPath('/guides/basic-bot')" class="api-quick-link"
            >Basic bot</router-link
          >
        </div>
      </div>
    </header>

    <ApiCategorySection
      v-for="cat in API_CATEGORIES"
      :key="cat"
      :id="cat"
      :title="API_CATEGORY_LABELS[cat]"
      :endpoints="endpointsByCategory[cat] ?? []" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import ApiCategorySection from '../components/ApiCategorySection.vue';
import { API_CATEGORIES, API_CATEGORY_LABELS, getEndpointsByCategory } from '../data/apiEndpoints';
import { useVersionedPath } from '../composables/useVersionedPath';

const { path: versionedPath } = useVersionedPath();
const endpointsByCategory = computed(() => getEndpointsByCategory());
</script>

<style scoped>
.api-reference {
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

.api-hero {
  margin-bottom: 0.5rem;
}

.api-title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 0.5rem;
  letter-spacing: -0.02em;
}

.api-lead {
  font-size: 1rem;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0 0 1.5rem;
}

.api-quick-info {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem 1.5rem;
  padding: 1rem 1.25rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.api-quick-item {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.api-quick-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.api-quick-value {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.85rem;
  padding: 0.2em 0.5em;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  color: var(--accent);
  border: 1px solid var(--border);
}

.api-quick-links {
  margin-left: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
}

@media (max-width: 640px) {
  .api-quick-links {
    margin-left: 0;
    width: 100%;
  }
}

.api-quick-link {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--accent);
  text-decoration: none;
}

.api-quick-link:hover {
  text-decoration: underline;
}
</style>
