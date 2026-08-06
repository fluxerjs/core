/**
 * Offline OpenAPI verify: JSON validity, manifest hash, schema presence.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import { EXPECTED_OPENAPI, MANIFEST_FILE, OPENAPI_FILE } from './paths.js';

function main(): void {
  if (!fs.existsSync(OPENAPI_FILE) || !fs.existsSync(MANIFEST_FILE)) {
    throw new Error('Missing vendor/openapi/fluxer-api.json or manifest.json — run openapi:update');
  }
  const text = fs.readFileSync(OPENAPI_FILE, 'utf8');
  const normalizedText = text.replace(/\r\n?/g, '\n');
  const sha256 = crypto.createHash('sha256').update(normalizedText).digest('hex');
  const manifestRaw = fs.readFileSync(MANIFEST_FILE, 'utf8').replace(/^\uFEFF/, '');
  const manifest = JSON.parse(manifestRaw) as {
    sha256: string;
    openapi: string;
    pathCount: number;
    schemaCount: number;
  };
  if (manifest.sha256 !== sha256) {
    throw new Error(`SHA-256 mismatch: manifest=${manifest.sha256} file=${sha256}`);
  }
  const doc = JSON.parse(normalizedText) as {
    openapi?: string;
    paths?: Record<string, unknown>;
    components?: { schemas?: Record<string, unknown> };
  };
  if (doc.openapi !== EXPECTED_OPENAPI) {
    throw new Error(`Expected openapi ${EXPECTED_OPENAPI}, got ${doc.openapi}`);
  }
  const pathCount = Object.keys(doc.paths ?? {}).length;
  const schemaCount = Object.keys(doc.components?.schemas ?? {}).length;
  if (pathCount !== manifest.pathCount || schemaCount !== manifest.schemaCount) {
    throw new Error('Manifest path/schema counts do not match file');
  }
  // Required schemas for SDK rewrite
  const required = [
    'RichEmbedRequest',
    'MessageEmbedResponse',
    'GuildLinkChannelCreateRequest',
    'ChannelCreateRequest',
    'MessageRequestSchema',
    'MessageResponseSchema',
  ];
  const schemas = doc.components?.schemas ?? {};
  const missing = required.filter((n) => !(n in schemas));
  if (missing.length) {
    throw new Error(`Missing required schemas: ${missing.join(', ')}`);
  }
  console.log(`openapi:verify OK (paths=${pathCount} schemas=${schemaCount})`);
}

try {
  main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
