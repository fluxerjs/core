/**
 * Local-only OpenAPI ↔ hand-written type alignment check.
 *
 * Usage: pnpm exec tsx scripts/openapi/assert-alignment.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OPENAPI_FILE } from './paths.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

type Schema = {
  type?: string | string[];
  properties?: Record<string, Schema>;
  required?: string[];
  anyOf?: Schema[];
  oneOf?: Schema[];
  allOf?: Schema[];
  nullable?: boolean;
  $ref?: string;
};

type FieldMeta = { optional: boolean; nullable: boolean };

function resolve(
  schemas: Record<string, Schema>,
  s: Schema | undefined,
  depth = 0,
): Schema | undefined {
  if (!s || depth > 12) return s;
  if (s.$ref) {
    return resolve(schemas, schemas[s.$ref.replace('#/components/schemas/', '')], depth + 1);
  }
  if (s.allOf?.length) {
    const merged: Schema = { properties: {}, required: [] };
    for (const part of s.allOf) {
      const r = resolve(schemas, part, depth + 1);
      if (!r) continue;
      Object.assign(merged.properties!, r.properties ?? {});
      if (r.required) merged.required!.push(...r.required);
    }
    return merged;
  }
  return s;
}

function isNullable(schemas: Record<string, Schema>, p: Schema | undefined): boolean {
  const s = resolve(schemas, p);
  if (!s) return false;
  if (s.nullable === true) return true;
  if (s.type === 'null') return true;
  if (Array.isArray(s.type) && s.type.includes('null')) return true;
  for (const k of ['anyOf', 'oneOf'] as const) {
    const arr = s[k];
    if (
      Array.isArray(arr) &&
      arr.some((x) => {
        const r = resolve(schemas, x);
        return r && (r.type === 'null' || r.nullable);
      })
    ) {
      return true;
    }
  }
  return false;
}

/** Extract top-level property names from an interface body (brace-aware). */
function parseOwnFields(body: string): Record<string, FieldMeta> {
  const fields: Record<string, FieldMeta> = {};
  let depth = 0;
  let i = 0;
  while (i < body.length) {
    const ch = body[i]!;
    if (ch === '{' || ch === '(' || ch === '[') {
      depth++;
      i++;
      continue;
    }
    if (ch === '}' || ch === ')' || ch === ']') {
      depth = Math.max(0, depth - 1);
      i++;
      continue;
    }
    if (depth !== 0) {
      i++;
      continue;
    }
    // Match a top-level property declaration starting at this position.
    const slice = body.slice(i);
    const fm = slice.match(/^(?:readonly\s+)?(\w+)(\?)?:\s*/);
    if (!fm) {
      i++;
      continue;
    }
    const name = fm[1]!;
    const optional = !!fm[2];
    i += fm[0].length;
    // Scan type until semicolon at depth 0
    const typeStart = i;
    let tDepth = 0;
    while (i < body.length) {
      const c = body[i]!;
      if (c === '{' || c === '(' || c === '[') tDepth++;
      else if (c === '}' || c === ')' || c === ']') tDepth = Math.max(0, tDepth - 1);
      else if (c === ';' && tDepth === 0) {
        const t = body.slice(typeStart, i).trim();
        // Ignore `| null` inside nested object/array types (e.g. Array<{ x?: string | null }>)
        const topLevel = t.replace(/\{[^}]*\}/g, '{}').replace(/\[[^\]]*\]/g, '[]');
        fields[name] = {
          optional,
          nullable:
            /\|\s*null\b/.test(topLevel) || /\bnull\s*\|/.test(topLevel) || topLevel === 'null',
        };
        i++;
        break;
      }
      i++;
    }
  }
  return fields;
}

function extractInterfaceBody(
  src: string,
  name: string,
): { extendsClause?: string; body: string } | null {
  const startRe = new RegExp(
    `(?:export\\s+)?interface ${name}(?![\\w])(?:\\s+extends\\s+([\\w<>,\\s|'"]+))?\\s*\\{`,
  );
  const m = startRe.exec(src);
  if (!m) return null;
  const extendsClause = m[1]?.trim();
  let depth = 1;
  let i = m.index + m[0].length;
  const start = i;
  while (i < src.length && depth > 0) {
    const c = src[i]!;
    if (c === '{') depth++;
    else if (c === '}') depth--;
    i++;
  }
  return { extendsClause, body: src.slice(start, i - 1) };
}

function parseInterfaceFields(src: string, name: string): Record<string, FieldMeta> | null {
  const extracted = extractInterfaceBody(src, name);
  if (!extracted) return null;
  const fields: Record<string, FieldMeta> = {};
  const extendsClause = extracted.extendsClause;
  if (extendsClause) {
    const omit = extendsClause.match(/^Omit<(\w+)\s*,\s*((?:'[^']+'\s*\|?\s*)+)>$/);
    if (omit) {
      const parent = parseInterfaceFields(src, omit[1]!);
      const omitted = new Set([...omit[2]!.matchAll(/'([^']+)'/g)].map((x) => x[1]!));
      if (parent) {
        for (const [k, v] of Object.entries(parent)) {
          if (!omitted.has(k)) fields[k] = v;
        }
      }
    } else {
      for (const p of extendsClause.split(',').map((s) => s.trim())) {
        if (!/^\w+$/.test(p)) continue;
        const pf = parseInterfaceFields(src, p);
        if (pf) Object.assign(fields, pf);
      }
    }
  }
  Object.assign(fields, parseOwnFields(extracted.body));
  return fields;
}

const COMPARISONS: Array<[string, string, string]> = [
  ['ChannelResponse', 'APIChannel', 'packages/types/src/Api/Channel.ts'],
  ['ChannelPartialResponse', 'APIChannelPartial', 'packages/types/src/Api/Channel.ts'],
  [
    'GuildTextChannelCreateRequest',
    'GuildTextChannelCreateRequest',
    'packages/types/src/Api/Channel.ts',
  ],
  ['GuildResponse', 'APIGuild', 'packages/types/src/Api/Guild.ts'],
  ['UserPartialResponse', 'APIUserPartial', 'packages/types/src/Api/User.ts'],
  ['MessageResponseSchema', 'APIMessage', 'packages/types/src/Api/Message.ts'],
  ['GuildMemberResponse', 'APIGuildMember', 'packages/types/src/Api/User.ts'],
  ['MessageEmbedResponse', 'APIEmbed', 'packages/types/src/Api/Embed.ts'],
  ['RichEmbedRequest', 'RESTPostAPIEmbed', 'packages/types/src/Api/Embed.ts'],
  ['WebhookResponse', 'APIWebhook', 'packages/types/src/Api/Webhook.ts'],
  ['GuildEmojiResponse', 'APIEmoji', 'packages/types/src/Api/Emoji.ts'],
  ['GuildBanResponse', 'APIBan', 'packages/types/src/Api/Ban.ts'],
  ['WellKnownFluxerResponse', 'APIInstance', 'packages/types/src/Api/Instance.ts'],
  ['GuildRoleResponse', 'APIRole', 'packages/types/src/Api/Role.ts'],
  ['GuildInviteResponse', 'APIGuildInvite', 'packages/types/src/Api/Invite.ts'],
  ['GuildAuditLogEntryResponse', 'APIGuildAuditLogEntry', 'packages/types/src/Api/Guild.ts'],
  ['GuildStickerResponse', 'APISticker', 'packages/types/src/Api/Sticker.ts'],
];

/** Known intentional extras (gateway-extended / SDK convenience). */
const ALLOW_EXTRA = new Set([
  'MessageResponseSchema.guild_id',
  'MessageResponseSchema.member',
  // REST snapshot has not caught up; API/gateway messages include classified emoji IDs
  'MessageResponseSchema.nsfw_emojis',
  'WebhookResponse.type',
  'GuildBanResponse.expires_at',
  'ChannelPartialResponse.icon',
  'ChannelPartialResponse.parent_id',
  // InviteShared metadata fields used by list/create responses beyond GuildInviteResponse
  'GuildInviteResponse.created_at',
  'GuildInviteResponse.uses',
  'GuildInviteResponse.max_uses',
  'GuildInviteResponse.max_age',
]);

/** Soften OA required when gateway/REST variants omit the field. */
const ALLOW_OPTIONAL_VS_REQUIRED = new Set([
  'GuildBanResponse.moderator_id',
  'GuildBanResponse.banned_at',
  // REST GuildInviteResponse requires these; gateway INVITE_CREATE often omits them
  'GuildInviteResponse.member_count',
  'GuildInviteResponse.presence_count',
  'GuildInviteResponse.temporary',
]);

function main(): void {
  const doc = JSON.parse(fs.readFileSync(OPENAPI_FILE, 'utf8')) as {
    components: { schemas: Record<string, Schema> };
  };
  const schemas = doc.components.schemas;
  const problems: string[] = [];

  // Nested ValidationErrorItem ↔ APIErrorBody.errors[] element
  const ve = schemas.ValidationErrorItem;
  const errSrc = fs.readFileSync(path.join(ROOT, 'packages/types/src/Api/Errors.ts'), 'utf8');
  const errMatch = errSrc.match(
    /errors\?:\s*Array<\{\s*path:\s*string;\s*message:\s*string;\s*code\?:\s*string\s*\}>/,
  );
  if (ve?.properties && !errMatch) {
    problems.push(
      'ValidationErrorItem: APIErrorBody.errors[] shape does not match { path, message, code? }',
    );
  } else if (ve?.properties) {
    for (const key of ['path', 'message'] as const) {
      if (!(key in ve.properties)) problems.push(`ValidationErrorItem.${key}: missing in OpenAPI`);
    }
  }

  for (const [schemaName, ifaceName, fileRel] of COMPARISONS) {
    const src = fs.readFileSync(path.join(ROOT, fileRel), 'utf8');
    const schema = resolve(schemas, schemas[schemaName]);
    if (!schema?.properties) {
      problems.push(`${schemaName}: missing OpenAPI schema or properties`);
      continue;
    }
    const fields = parseInterfaceFields(src, ifaceName);
    if (!fields) {
      problems.push(`${ifaceName}: missing TS interface in ${fileRel}`);
      continue;
    }
    const required = new Set(schema.required ?? []);
    for (const [key, prop] of Object.entries(schema.properties)) {
      const oaNull = isNullable(schemas, prop);
      const oaOpt = !required.has(key);
      const ts = fields[key];
      const oaDesc = `${oaOpt ? 'opt' : 'req'}${oaNull ? '|null' : ''}`;
      if (!ts) {
        problems.push(`${schemaName}.${key}: missing in ${ifaceName} (OA ${oaDesc})`);
        continue;
      }
      const tsDesc = `${ts.optional ? 'opt' : 'req'}${ts.nullable ? '|null' : ''}`;
      if (oaNull !== ts.nullable || oaOpt !== ts.optional) {
        const keyId = `${schemaName}.${key}`;
        if (
          !oaOpt &&
          ts.optional &&
          oaNull === ts.nullable &&
          ALLOW_OPTIONAL_VS_REQUIRED.has(keyId)
        ) {
          continue;
        }
        if (oaOpt && ts.optional && oaNull && !ts.nullable) {
          continue;
        }
        // TS required nullable vs OA optional nullable is often fine for creates
        if (oaOpt && !ts.optional && oaNull === ts.nullable) {
          continue;
        }
        problems.push(`${schemaName}.${key}: OA ${oaDesc} vs TS ${tsDesc}`);
      }
    }
    for (const key of Object.keys(fields)) {
      if (!(key in schema.properties) && !ALLOW_EXTRA.has(`${schemaName}.${key}`)) {
        problems.push(`${schemaName}.${key}: extra in ${ifaceName}`);
      }
    }
  }

  if (problems.length) {
    console.error(`OpenAPI alignment: ${problems.length} divergence(s)\n`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exitCode = 1;
    return;
  }
  console.log('OpenAPI alignment: ok');
}

main();
