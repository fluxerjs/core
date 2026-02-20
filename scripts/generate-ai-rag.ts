#!/usr/bin/env node
/**
 * Generate RAG index for Fluxer AI bot.
 * Chunks main.json + guides.json, embeds via OpenRouter, writes rag-index.json.
 * Run after generate-docs. Requires OPENROUTER_API_KEY (in .env or environment).
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env'), quiet: true });
const root = resolve(__dirname, '..');
const DOCS_DIR = resolve(root, 'apps/docs/public/docs/latest');
const RAG_INDEX_PATH = resolve(DOCS_DIR, 'rag-index.json');
const OR_EMBED_ENDPOINT = 'https://openrouter.ai/api/v1/embeddings';
const EMBED_MODEL = 'openai/text-embedding-3-small';
const BATCH_SIZE = 25;
const BATCH_DELAY_MS = 500;

interface RagChunk {
  id: string;
  type: string;
  source: string;
  text: string;
  meta: { slug?: string; url?: string };
  embedding?: number[];
}

function formatMethodSig(m: {
  name: string;
  params?: Array<{ name: string; type: string }>;
  returns?: string;
}): string {
  const params = m.params?.map((p) => `${p.name}: ${p.type}`).join(', ') ?? '';
  const ret = m.returns ? ` -> ${m.returns}` : '';
  return `${m.name}(${params})${ret}`;
}

function chunkMainJson(main: {
  classes?: Array<{
    name: string;
    description?: string;
    properties?: Array<{ name: string; type: string }>;
    methods?: Array<{
      name: string;
      params?: Array<{ name: string; type: string }>;
      returns?: string;
      description?: string;
    }>;
  }>;
  interfaces?: Array<{
    name: string;
    description?: string;
    properties?: Array<{ name: string; type: string }>;
  }>;
  enums?: Array<{
    name: string;
    members?: Array<{ name: string; value?: string }>;
  }>;
}): RagChunk[] {
  const chunks: RagChunk[] = [];

  for (const c of main.classes ?? []) {
    const parts: string[] = [];
    parts.push(`Class: ${c.name}`);
    if (c.description) parts.push(`Description: ${c.description}`);
    if (c.properties?.length) {
      parts.push(`Properties: ${c.properties.map((p) => `${p.name}: ${p.type}`).join(', ')}`);
    }
    if (c.methods?.length) {
      const methodStrs = c.methods.map((m) => {
        const sig = formatMethodSig(m);
        return m.description ? `${sig} — ${m.description}` : sig;
      });
      parts.push(`Methods: ${methodStrs.join('; ')}`);
    }
    chunks.push({
      id: `class-${c.name}`,
      type: 'class',
      source: 'main',
      text: parts.join('\n'),
      meta: { url: `/docs/classes/${c.name}` },
    });
  }

  for (const i of main.interfaces ?? []) {
    const parts: string[] = [];
    parts.push(`Interface: ${i.name}`);
    if (i.description) parts.push(`Description: ${i.description}`);
    if (i.properties?.length) {
      parts.push(`Properties: ${i.properties.map((p) => `${p.name}: ${p.type}`).join(', ')}`);
    }
    chunks.push({
      id: `interface-${i.name}`,
      type: 'interface',
      source: 'main',
      text: parts.join('\n'),
      meta: { url: `/docs/typedefs/${i.name}` },
    });
  }

  for (const e of main.enums ?? []) {
    const members =
      e.members?.map((m) => `${m.name}${m.value != null ? `=${m.value}` : ''}`).join(', ') ?? '';
    chunks.push({
      id: `enum-${e.name}`,
      type: 'enum',
      source: 'main',
      text: `Enum: ${e.name}\nMembers: ${members}`,
      meta: { url: `/docs/typedefs/${e.name}` },
    });
  }

  return chunks;
}

function chunkGuidesJson(
  guides: Array<{
    slug: string;
    title: string;
    description?: string;
    sections?: Array<{
      title?: string;
      description?: string;
      code?: string;
      language?: string;
    }>;
  }>,
): RagChunk[] {
  const chunks: RagChunk[] = [];

  for (const g of guides) {
    const sections = g.sections ?? [];
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      const parts: string[] = [];
      parts.push(`Guide: ${g.title} (${g.slug})`);
      if (s.title) parts.push(`Section: ${s.title}`);
      if (s.description) parts.push(s.description);
      if (s.code) parts.push(`\n\`\`\`${s.language ?? 'js'}\n${s.code}\n\`\`\``);
      const text = parts.join('\n');
      if (!text.trim()) continue;
      chunks.push({
        id: `guide-${g.slug}-${i}`,
        type: 'guide',
        source: 'guides',
        text,
        meta: { slug: g.slug, url: `/guides/${g.slug}` },
      });
    }
  }

  return chunks;
}

async function embedBatch(texts: string[], apiKey: string): Promise<number[][]> {
  const res = await fetch(OR_EMBED_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBED_MODEL,
      input: texts,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Embeddings API ${res.status}: ${err.slice(0, 300)}`);
  }

  const data = (await res.json()) as { data: Array<{ embedding: number[] }> };
  return data.data.map((d) => d.embedding);
}

async function main(): Promise<void> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('[generate-ai-rag] OPENROUTER_API_KEY is required');
    process.exit(1);
  }

  const mainPath = resolve(DOCS_DIR, 'main.json');
  const guidesPath = resolve(DOCS_DIR, 'guides.json');

  if (!existsSync(mainPath)) {
    console.error('[generate-ai-rag] main.json not found. Run: pnpm run generate:docs');
    process.exit(1);
  }
  if (!existsSync(guidesPath)) {
    console.error('[generate-ai-rag] guides.json not found. Run: pnpm run generate:docs');
    process.exit(1);
  }

  const main = JSON.parse(readFileSync(mainPath, 'utf-8'));
  const guides = JSON.parse(readFileSync(guidesPath, 'utf-8'));

  const mainChunks = chunkMainJson(main);
  const guideChunks = chunkGuidesJson(guides);
  const allChunks = [...mainChunks, ...guideChunks];

  console.log(
    `[generate-ai-rag] Chunked ${mainChunks.length} from main.json, ${guideChunks.length} from guides.json`,
  );

  for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
    const batch = allChunks.slice(i, i + BATCH_SIZE);
    const texts = batch.map((c) => c.text);
    const embeddings = await embedBatch(texts, apiKey);
    for (let j = 0; j < batch.length; j++) {
      batch[j].embedding = embeddings[j];
    }
    console.log(
      `[generate-ai-rag] Embedded ${Math.min(i + BATCH_SIZE, allChunks.length)}/${allChunks.length}`,
    );
    if (i + BATCH_SIZE < allChunks.length) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  mkdirSync(DOCS_DIR, { recursive: true });
  const output = {
    model: EMBED_MODEL,
    dimensions: allChunks[0]?.embedding?.length ?? 1536,
    generatedAt: Date.now(),
    chunks: allChunks,
  };
  writeFileSync(RAG_INDEX_PATH, JSON.stringify(output), 'utf-8');
  console.log(`[generate-ai-rag] Wrote ${RAG_INDEX_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
