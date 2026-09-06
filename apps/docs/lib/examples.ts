import fs from 'node:fs';
import path from 'node:path';

export interface ExampleMeta {
  file: string;
  slug: string;
  title: string;
  description: string;
  /** Approx line count for display. */
  lines: number;
}

export interface Example extends ExampleMeta {
  code: string;
}

function resolveExamplesDir(): string {
  const candidates = [
    path.join(process.cwd(), '..', '..', 'examples'),
    path.join(process.cwd(), 'examples'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0]!;
}

const DIR = resolveExamplesDir();

function isExampleFile(f: string): boolean {
  return f.endsWith('-bot.js') || f === 'minimal-bot.js';
}

const EXAMPLE_LEARNING_ORDER = [
  'minimal-bot',
  'ping-bot',
  'first-steps-bot',
  'info-bot',
  'attachments-bot',
  'collectors-bot',
  'reaction-bot',
  'reaction-roles-bot',
  'history-bot',
  'moderation-bot',
  'webhook-bot',
  'cache-bot',
  'voice-bot',
  'multi-instance-bot',
  'sharded-bot',
];

function exampleSortKey(slug: string): number {
  const i = EXAMPLE_LEARNING_ORDER.indexOf(slug);
  return i === -1 ? EXAMPLE_LEARNING_ORDER.length : i;
}

function humanTitle(file: string): string {
  return file
    .replace(/\.js$/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Title from filename; description from the first JSDoc summary line. */
function parseMeta(file: string, raw: string): { title: string; description: string } {
  const title = humanTitle(file);
  const block = raw.match(/^\/\*\*([\s\S]*?)\*\//);
  const lines = (block?.[1] ?? '')
    .split('\n')
    .map((line) => line.replace(/^\s*\*\s?/, '').trim())
    .filter((line) => line.length > 0 && !/^(Usage:|See:|FLUXER_)/.test(line));
  const description = lines[0] ?? 'Example bot script.';
  return { title, description };
}

export function getExamples(): ExampleMeta[] {
  if (!fs.existsSync(DIR)) return [];
  return fs
    .readdirSync(DIR)
    .filter(isExampleFile)
    .map((file) => {
      const raw = fs.readFileSync(path.join(DIR, file), 'utf8');
      const { title, description } = parseMeta(file, raw);
      return {
        file,
        slug: file.replace(/\.js$/, ''),
        title,
        description,
        lines: raw.split('\n').length,
      };
    })
    .sort(
      (a, b) => exampleSortKey(a.slug) - exampleSortKey(b.slug) || a.slug.localeCompare(b.slug),
    );
}

export function getExample(slug: string): Example | null {
  const file = `${slug}.js`;
  const full = path.join(DIR, file);
  if (!isExampleFile(file) || !fs.existsSync(full)) return null;
  const code = fs.readFileSync(full, 'utf8');
  const { title, description } = parseMeta(file, code);
  return {
    file,
    slug,
    title,
    description,
    lines: code.split('\n').length,
    code,
  };
}

export const EXAMPLES_REPO = 'https://github.com/fluxerjs/core/blob/main/examples';

/** Sidebar links for `/examples` (flat list + optional active slug). */
export function getExamplesSidebarItems(active?: string): {
  href: string;
  label: string;
  active?: boolean;
  hint?: string;
}[] {
  const examples = getExamples();
  return [
    {
      href: '/examples/',
      label: 'All examples',
      active: !active,
    },
    ...examples.map((ex) => ({
      href: `/examples/${ex.slug}/`,
      label: ex.title,
      active: ex.slug === active,
      hint: ex.file,
    })),
  ];
}
