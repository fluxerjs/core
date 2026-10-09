/**
 * Generate conformance helpers from pinned OpenAPI (property keys + enums).
 */
import fs from 'node:fs';
import path from 'node:path';
import { GENERATED_DIR, OPENAPI_FILE } from './paths.js';

type Schema = {
  type?: string | string[];
  enum?: unknown[];
  properties?: Record<string, Schema>;
  required?: string[];
  oneOf?: Schema[];
  anyOf?: Schema[];
  allOf?: Schema[];
  $ref?: string;
  items?: Schema;
  'x-enumNames'?: string[];
};

function refName(ref: string): string {
  return ref.replace('#/components/schemas/', '');
}

function resolve(schemas: Record<string, Schema>, s: Schema | undefined): Schema | undefined {
  if (!s) return undefined;
  if (s.$ref) return resolve(schemas, schemas[refName(s.$ref)]);
  return s;
}

function propKeys(schemas: Record<string, Schema>, name: string): string[] {
  const s = resolve(schemas, schemas[name]);
  if (!s?.properties) return [];
  return Object.keys(s.properties).sort();
}

function main(): void {
  const doc = JSON.parse(fs.readFileSync(OPENAPI_FILE, 'utf8')) as {
    components: { schemas: Record<string, Schema> };
    paths: Record<
      string,
      Record<string, { operationId?: string; security?: Array<Record<string, string[]>> }>
    >;
  };
  const schemas = doc.components.schemas;

  const richEmbedKeys = propKeys(schemas, 'RichEmbedRequest');
  const messageEmbedKeys = propKeys(schemas, 'MessageEmbedResponse');
  const linkCreate = resolve(schemas, schemas.GuildLinkChannelCreateRequest);
  const linkTypeEnum = linkCreate?.properties?.type?.enum ?? [998];

  // Collect channel type enums from create request variants
  const channelTypeValues = new Set<number>();
  for (const name of [
    'GuildTextChannelCreateRequest',
    'GuildVoiceChannelCreateRequest',
    'GuildCategoryChannelCreateRequest',
    'GuildAnnouncementChannelCreateRequest',
    'GuildForumChannelCreateRequest',
    'GuildMediaChannelCreateRequest',
    'GuildLinkChannelCreateRequest',
  ]) {
    const s = resolve(schemas, schemas[name]);
    const en = resolve(schemas, s?.properties?.type)?.enum;
    if (Array.isArray(en)) {
      for (const v of en) {
        if (typeof v === 'number') channelTypeValues.add(v);
      }
    }
  }
  // Also common channel types from ChannelResponse if present
  const channelResp = resolve(schemas, schemas.ChannelResponse);
  const respType = resolve(schemas, channelResp?.properties?.type);
  if (respType?.enum) {
    for (const v of respType.enum) {
      if (typeof v === 'number') channelTypeValues.add(v);
    }
  }
  // Fluxer ChannelTypes always include personal notes DM
  channelTypeValues.add(999);

  const createTypes = [...channelTypeValues]
    .filter((v) => [0, 2, 4, 5, 15, 16, 998].includes(v))
    .sort((a, b) => a - b);
  const allChannelTypes = [...channelTypeValues].sort((a, b) => a - b);

  const lines: string[] = [
    '/** AUTO-GENERATED from vendor/openapi/fluxer-api.json. Do not edit by hand. */',
    '/* eslint-disable */',
    '',
    `export const RICH_EMBED_REQUEST_KEYS = ${JSON.stringify(richEmbedKeys)} as const;`,
    `export const MESSAGE_EMBED_RESPONSE_KEYS = ${JSON.stringify(messageEmbedKeys)} as const;`,
    `export const GUILD_LINK_CHANNEL_TYPE = ${JSON.stringify(linkTypeEnum[0] ?? 998)} as const;`,
    `export const CHANNEL_CREATE_TYPE_VALUES = ${JSON.stringify(createTypes)} as const;`,
    `export const CHANNEL_TYPE_VALUES = ${JSON.stringify(allChannelTypes)} as const;`,
    'export const DM_PERSONAL_NOTES_CHANNEL_TYPE = 999 as const;',
    '',
  ];

  fs.mkdirSync(GENERATED_DIR, { recursive: true });
  const out = path.join(GENERATED_DIR, 'openapi-conformance.ts');
  fs.writeFileSync(out, `${lines.join('\n')}\n`, 'utf8');
  console.log(`Wrote ${path.relative(process.cwd(), out)}`);
}

try {
  main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
