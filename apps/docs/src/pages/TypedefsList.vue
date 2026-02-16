<template>
  <div class="typedefs-list">
    <h1>API Types</h1>
    <p class="lead">Interfaces and enums used across the Fluxer.js SDK.</p>

    <p v-if="store.loading">Loading...</p>
    <p v-else-if="store.error" class="error">{{ store.error }}</p>

    <template v-else>
      <section v-if="interfaces.length" class="type-section">
        <h2 class="section-head">
          <span class="section-badge section-badge-interface">interface</span>
          Interfaces
        </h2>
        <div class="type-grid">
          <router-link
            v-for="i in interfaces"
            :key="i.name"
            :to="{ name: 'typedef', params: { version: routeVersion, typedef: i.name } }"
            class="type-card type-card-interface">
            <code class="type-name">{{ i.name }}</code>
            <p v-if="i.description" class="type-desc">{{ i.description }}</p>
          </router-link>
        </div>
      </section>

      <section v-if="enums.length" class="type-section">
        <h2 class="section-head">
          <span class="section-badge section-badge-enum">enum</span>
          Enums
        </h2>
        <div class="type-grid">
          <router-link
            v-for="e in enums"
            :key="e.name"
            :to="{ name: 'typedef', params: { version: routeVersion, typedef: e.name } }"
            class="type-card type-card-enum">
            <code class="type-name">{{ e.name }}</code>
            <p v-if="e.description" class="type-desc">{{ e.description }}</p>
          </router-link>
        </div>
      </section>

      <p v-if="!interfaces.length && !enums.length" class="muted">No interfaces or enums found.</p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useDocsStore } from '../stores/docs';

const route = useRoute();
const store = useDocsStore();
const routeVersion = computed(() => (route.params.version as string) ?? 'latest');
const interfaces = computed(() => store.currentDoc?.interfaces ?? []);
const enums = computed(() => store.currentDoc?.enums ?? []);
</script>

<style scoped>
.typedefs-list {
  max-width: 800px;
}

h1 {
  font-size: 1.75rem;
  margin-bottom: 0.35rem;
}

.lead {
  font-size: 0.95rem;
  color: var(--text-secondary);
  margin-bottom: 2rem;
}

.type-section {
  margin-bottom: 2.5rem;
}

.section-head {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.section-badge {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  padding: 0.2em 0.5em;
  border-radius: 4px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
}

.section-badge-interface {
  background: var(--badge-interface-bg);
  color: var(--badge-interface);
}

.section-badge-enum {
  background: var(--badge-enum-bg);
  color: var(--badge-enum);
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.75rem;
}

.type-card {
  display: flex;
  flex-direction: column;
  padding: 1rem 1.1rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  text-decoration: none;
  color: var(--text-primary);
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}

.type-card:hover {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
}

.type-card-interface {
  border-left: 3px solid var(--badge-interface);
}

.type-card-enum {
  border-left: 3px solid var(--badge-enum);
}

.type-name {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-weight: 500;
  font-size: 0.9rem;
}

.type-desc {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-top: 0.35rem;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.muted,
.error {
  margin-top: 1rem;
}

.error {
  color: var(--error);
}
</style>
