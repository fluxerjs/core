<template>
  <section v-if="endpoints.length" :id="id" class="api-category">
    <h2 class="api-category-title">{{ title }}</h2>
    <ApiEndpointCard
      v-for="(ep, i) in endpoints"
      :key="`${ep.method}-${ep.path}-${i}`"
      :endpoint="ep" />
  </section>
</template>

<script setup lang="ts">
import { ApiEndpoint } from '../data/apiEndpoints';
import ApiEndpointCard from './ApiEndpointCard.vue';

defineProps<{
  id: string;
  title: string;
  endpoints: ApiEndpoint[];
}>();
</script>

<style scoped>
.api-category {
  scroll-margin-top: 1.5rem;
  margin-bottom: 3rem;
}

.api-category:last-child {
  margin-bottom: 0;
}

.api-category-title {
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  margin: 0 0 1.25rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-subtle);
}
</style>
