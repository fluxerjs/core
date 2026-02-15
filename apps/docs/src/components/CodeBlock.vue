<template>
  <div ref="blockRef" class="code-block">
    <div class="code-header">
      <span v-if="title" class="code-title">{{ title }}</span>
      <button type="button" class="copy-btn" :class="{ copied }" @click="copy">
        {{ copied ? 'Copied!' : 'Copy' }}
      </button>
    </div>
    <pre><code
      v-if="linkTypes && highlightedHtml"
      :class="['code-with-links', `language-${lang}`]"
      v-html="highlightedHtml"
    ></code><code
      v-else
      ref="codeRef"
      :class="`language-${lang}`"
    >{{ normalizedCode() }}</code></pre>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import Prism from 'prismjs';
import { useDocsStore } from '../stores/docs';

const props = withDefaults(
  defineProps<{
    code: string;
    language?: string;
    title?: string;
    linkTypes?: boolean;
  }>(),
  { language: 'javascript', linkTypes: false }
);

const store = useDocsStore();
const lang = computed(() => props.language);
const blockRef = ref<HTMLElement | null>(null);
const codeRef = ref<HTMLElement | null>(null);
const copied = ref(false);
const highlightedHtml = ref('');

function getKnownTypes(): { name: string; path: string }[] {
  const doc = store.currentDoc;
  if (!doc) return [];
  const out: { name: string; path: string }[] = [];
  for (const c of doc.classes ?? []) out.push({ name: c.name, path: `/docs/classes/${c.name}` });
  for (const i of doc.interfaces ?? [])
    out.push({ name: i.name, path: `/docs/typedefs/${i.name}` });
  for (const e of doc.enums ?? []) out.push({ name: e.name, path: `/docs/typedefs/${e.name}` });
  return out.sort((a, b) => b.name.length - a.name.length); // longer first to avoid partial matches
}

function addLinks(html: string): string {
  const types = getKnownTypes();
  let out = html;
  const tokenClasses = ['class-name', 'constant', 'variable']; // class-name for Client/EmbedBuilder, constant for Events
  for (const { name, path } of types) {
    for (const tok of tokenClasses) {
      const re = new RegExp(
        `(<span class="[^"]*token[^"]*${escapeRegex(tok)}[^"]*"[^>]*)>${escapeRegex(name)}</span>`,
        'g'
      );
      out = out.replace(re, `$1><a href="${path}" class="doc-link">${name}</a></span>`);
    }
  }
  return out;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function dedent(code: string): string {
  const lines = code.split('\n');
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  if (nonEmpty.length === 0) return code;
  const minIndent = Math.min(
    ...nonEmpty.map((l) => {
      const m = l.match(/^(\s*)/);
      return m ? m[1].length : 0;
    })
  );
  return lines
    .map((l) => (l.length >= minIndent ? l.slice(minIndent) : l))
    .join('\n')
    .trim();
}

function normalizedCode(): string {
  return dedent(props.code);
}

function highlight() {
  nextTick(() => {
    const code = normalizedCode();
    const gram = Prism.languages[props.language === 'bash' ? 'bash' : 'javascript'];
    if (props.linkTypes && gram) {
      const html = Prism.highlight(code, gram, props.language);
      highlightedHtml.value = store.currentDoc ? addLinks(html) : html;
    } else {
      highlightedHtml.value = '';
      if (codeRef.value) Prism.highlightElement(codeRef.value);
    }
  });
}

onMounted(highlight);
watch(() => [props.code, props.language, props.linkTypes], highlight);
watch(() => store.currentDoc, highlight);

async function copy() {
  try {
    await navigator.clipboard.writeText(normalizedCode());
    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
  } catch {
    // fallback
  }
}
</script>

<style scoped>
.code-block {
  position: relative;
  border-radius: var(--radius);
  overflow: hidden;
  border: 1px solid var(--border-subtle);
}

.code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-subtle);
  font-size: 0.8rem;
}

.code-title {
  color: var(--text-muted);
}

.copy-btn {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  padding: 0.25rem 0.6rem;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.15s;
}

.copy-btn:hover {
  color: var(--text-primary);
  border-color: var(--accent);
}

.copy-btn.copied {
  color: #6ee7b7;
  border-color: #6ee7b7;
}

.code-block pre {
  margin: 0;
  padding: 1rem 1.25rem;
  border: none;
  border-radius: 0;
}

.code-block pre code {
  background: transparent;
  padding: 0;
}
</style>
