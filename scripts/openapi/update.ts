/**
 * Fetch and pin OpenAPI snapshot (network). Rejects truncated/invalid JSON.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  EXPECTED_OPENAPI,
  MANIFEST_FILE,
  OPENAPI_DIR,
  OPENAPI_FILE,
  OPENAPI_URL,
} from './paths.js';

async function main(): Promise<void> {
  fs.mkdirSync(OPENAPI_DIR, { recursive: true });
  const res = await fetch(OPENAPI_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch OpenAPI: ${res.status} ${res.statusText}`);
  }
  const text = (await res.text()).replace(/\r\n?/g, '\n');
  let doc: {
    openapi?: string;
    info?: { title?: string; version?: string };
    paths?: Record<string, unknown>;
    components?: { schemas?: Record<string, unknown> };
  };
  try {
    doc = JSON.parse(text) as typeof doc;
  } catch {
    throw new Error('Downloaded OpenAPI is not valid JSON');
  }
  if (doc.openapi !== EXPECTED_OPENAPI) {
    throw new Error(`Expected openapi ${EXPECTED_OPENAPI}, got ${doc.openapi}`);
  }
  if (!doc.paths || !doc.components?.schemas) {
    throw new Error('OpenAPI missing paths or components.schemas (truncated?)');
  }
  const pathCount = Object.keys(doc.paths).length;
  const schemaCount = Object.keys(doc.components.schemas).length;
  if (pathCount < 50 || schemaCount < 50) {
    throw new Error(`OpenAPI looks truncated: paths=${pathCount} schemas=${schemaCount}`);
  }
  // Ensure referenced schemas resolve for a sample of $refs
  const schemas = doc.components.schemas;
  let missingRefs = 0;
  const refRe = /"\$ref"\s*:\s*"#\/components\/schemas\/([^"]+)"/g;
  for (const match of text.matchAll(refRe)) {
    if (!(match[1]! in schemas)) missingRefs++;
  }
  if (missingRefs > 0) {
    throw new Error(`OpenAPI has ${missingRefs} unresolved schema $refs`);
  }

  const sha256 = crypto.createHash('sha256').update(text).digest('hex');
  fs.writeFileSync(OPENAPI_FILE, text, 'utf8');
  const manifest = {
    sourceUrl: OPENAPI_URL,
    openapi: doc.openapi,
    apiVersion: doc.info?.version ?? 'unknown',
    title: doc.info?.title ?? 'unknown',
    fetchedAt: new Date().toISOString(),
    sha256,
    pathCount,
    schemaCount,
  };
  fs.writeFileSync(MANIFEST_FILE, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${path.relative(process.cwd(), OPENAPI_FILE)}`);
  console.log(`paths=${pathCount} schemas=${schemaCount} sha256=${sha256}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
