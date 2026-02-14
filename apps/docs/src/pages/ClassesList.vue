<template>
  <div class="classes-list">
    <h1>Classes</h1>
    <p class="lead">Core classes for building Fluxer bots.</p>

    <p v-if="store.loading">Loading...</p>
    <p v-else-if="store.error" class="error">{{ store.error }}</p>
    <p v-else-if="!classes.length" class="muted">No classes found.</p>
    <div v-else class="class-grid">
      <router-link
        v-for="c in classes"
        :key="c.name"
        :to="{ name: 'class', params: { version: routeVersion, class: c.name } }"
        class="class-card"
      >
        <code class="class-name">{{ c.name }}</code>
        <p v-if="c.description" class="class-desc">{{ c.description }}</p>
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useDocsStore } from '../stores/docs';

const route = useRoute();
const store = useDocsStore();
const routeVersion = computed(() => (route.params.version as string) ?? 'latest');
const classes = computed(() => store.currentDoc?.classes ?? []);
</script>

<style scoped>
.classes-list {
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

.class-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.75rem;
}

.class-card {
  display: flex;
  flex-direction: column;
  padding: 1rem 1.1rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  text-decoration: none;
  color: var(--text-primary);
  transition: border-color 0.15s, box-shadow 0.15s;
  border-left: 3px solid var(--accent);
}

.class-card:hover {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
}

.class-name {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-weight: 500;
  font-size: 0.95rem;
}

.class-desc {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-top: 0.35rem;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.muted, .error {
  margin-top: 1rem;
}

.error {
  color: var(--error);
}
</style>
