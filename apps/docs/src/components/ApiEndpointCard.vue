<template>
  <article class="api-endpoint-card" :id="endpointId">
    <div class="api-endpoint-header">
      <span :class="['api-method', `api-method-${endpoint.method.toLowerCase()}`]">
        {{ endpoint.method }}
      </span>
      <code class="api-path">{{ fullPath }}</code>
      <button
        type="button"
        class="api-copy-btn"
        :aria-label="copied ? 'Copied' : 'Copy path'"
        :class="{ 'is-copied': copied }"
        @click="copyPath">
        {{ copied ? 'Copied' : 'Copy' }}
      </button>
    </div>
    <div class="api-endpoint-meta">
      <span v-if="endpoint.summary" class="api-summary">{{ endpoint.summary }}</span>
      <span class="api-auth-badge" :class="`api-auth-${endpoint.auth}`">{{ authLabel }}</span>
    </div>
    <p v-if="endpoint.description" class="api-description">{{ endpoint.description }}</p>

    <div v-if="endpoint.queryParams?.length" class="api-section">
      <button
        type="button"
        class="api-toggle"
        :aria-expanded="showQuery"
        @click="showQuery = !showQuery">
        Query parameters
      </button>
      <ApiSchemaBlock v-if="showQuery" :fields="queryAsFields" class="api-toggle-content" />
    </div>

    <div v-if="endpoint.requestBody?.length" class="api-section">
      <button
        type="button"
        class="api-toggle"
        :aria-expanded="showRequest"
        @click="showRequest = !showRequest">
        Request body
      </button>
      <ApiSchemaBlock
        v-if="showRequest"
        title="Request body"
        :fields="endpoint.requestBody"
        class="api-toggle-content" />
    </div>

    <div class="api-section">
      <button
        type="button"
        class="api-toggle"
        :aria-expanded="showResponse"
        @click="showResponse = !showResponse">
        Response
      </button>
      <ApiSchemaBlock
        v-if="showResponse"
        :fields="endpoint.responseBody"
        :response-ref="endpoint.responseRef"
        :response-code="endpoint.responseCode"
        class="api-toggle-content" />
    </div>
  </article>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { ApiEndpoint, ApiSchemaField } from '../data/apiEndpoints';
import ApiSchemaBlock from './ApiSchemaBlock.vue';

const props = defineProps<{
  endpoint: ApiEndpoint;
  basePath?: string;
}>();

const basePath = computed(() => props.basePath ?? '/v1');
const fullPath = computed(() => basePath.value + props.endpoint.path);
const endpointId = computed(
  () =>
    props.endpoint.path
      .replace(/^\//, '')
      .replace(/:[a-z_]+/g, (m) => m.slice(1))
      .replace(/\//g, '-') + `-${props.endpoint.method.toLowerCase()}`,
);

const authLabel = computed(() => {
  switch (props.endpoint.auth) {
    case 'bot':
      return 'Bot token';
    case 'webhook-token':
      return 'Webhook token';
    default:
      return 'None';
  }
});

const showQuery = ref(false);
const showRequest = ref(false);
const showResponse = ref(true);

const queryAsFields = computed((): ApiSchemaField[] => {
  if (!props.endpoint.queryParams?.length) return [];
  return props.endpoint.queryParams.map((q) => ({
    name: q.name,
    type: q.type,
    required: q.required,
    description: q.description,
  }));
});

const copied = ref(false);
async function copyPath() {
  try {
    await navigator.clipboard.writeText(fullPath.value);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 1500);
  } catch {
    // ignore
  }
}
</script>

<style scoped>
.api-endpoint-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.5rem 1.75rem;
  margin-bottom: 1.25rem;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.api-endpoint-card:hover {
  border-color: var(--border);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.api-endpoint-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1rem;
  margin-bottom: 0.75rem;
}

.api-method {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.3em 0.6em;
  border-radius: var(--radius-sm);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  flex-shrink: 0;
}

.api-method-get {
  background: rgba(34, 197, 94, 0.15);
  color: #6ee7b7;
}

.api-method-post {
  background: rgba(99, 179, 237, 0.2);
  color: #7dc3f4;
}

.api-method-put {
  background: rgba(251, 146, 60, 0.15);
  color: #fdba74;
}

.api-method-patch {
  background: rgba(234, 179, 8, 0.15);
  color: #fde047;
}

.api-method-delete {
  background: rgba(248, 113, 113, 0.15);
  color: #fca5a5;
}

.api-path {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.9rem;
  color: var(--text-primary);
  flex: 1;
  min-width: 0;
  padding: 0.2em 0;
  overflow-x: auto;
}

.api-copy-btn {
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.35em 0.7em;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    color 0.15s,
    border-color 0.15s,
    background 0.15s;
}

.api-copy-btn:hover {
  color: var(--accent);
  border-color: rgba(99, 179, 237, 0.4);
  background: rgba(99, 179, 237, 0.06);
}

.api-copy-btn.is-copied {
  color: #6ee7b7;
  border-color: rgba(52, 211, 153, 0.4);
}

.api-endpoint-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1rem;
  margin-bottom: 0.5rem;
}

.api-summary {
  font-size: 0.95rem;
  color: var(--text-primary);
  line-height: 1.5;
}

.api-description {
  font-size: 0.88rem;
  color: var(--text-muted);
  line-height: 1.5;
  margin: 0 0 0.75rem;
}

.api-auth-badge {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.25em 0.55em;
  border-radius: var(--radius-sm);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.api-auth-bot {
  background: rgba(99, 179, 237, 0.12);
  color: var(--accent);
}

.api-auth-webhook-token {
  background: rgba(199, 146, 234, 0.12);
  color: #c792ea;
}

.api-auth-none {
  background: var(--bg-tertiary);
  color: var(--text-muted);
}

.api-section {
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-subtle);
}

.api-toggle {
  display: flex;
  align-items: center;
  width: 100%;
  text-align: left;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: none;
  border: none;
  padding: 0.5rem 0;
  cursor: pointer;
  transition: color 0.15s;
}

.api-toggle:hover {
  color: var(--accent);
}

.api-toggle::before {
  content: '';
  display: inline-block;
  width: 0;
  height: 0;
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
  border-left: 5px solid currentColor;
  margin-right: 0.5rem;
  transition: transform 0.2s;
  opacity: 0.7;
}

.api-toggle[aria-expanded='true']::before {
  transform: rotate(90deg);
}

.api-toggle-content {
  margin-top: 0.75rem;
}
</style>
