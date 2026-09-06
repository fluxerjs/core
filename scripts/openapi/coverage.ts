/**
 * Classify every OpenAPI operation for bot SDK coverage.
 */
import fs from 'node:fs';
import path from 'node:path';
import { COVERAGE_FILE, OPENAPI_FILE, REPO_ROOT } from './paths.js';

type Op = {
  operationId?: string;
  security?: Array<Record<string, string[]>>;
  tags?: string[];
  summary?: string;
};

type Classified = {
  method: string;
  path: string;
  operationId: string;
  auth: 'botToken' | 'sessionToken' | 'public' | 'mixed' | 'none';
  category: 'bot' | 'session' | 'public' | 'voice' | 'other';
  status:
    | 'needs_wrapper'
    | 'route_only'
    | 'wrapped'
    | 'session_only'
    | 'voice_excluded'
    | 'public'
    | 'bot_denied';
};

const VOICE_HINTS = [/voice/i, /rtc/i, /stream/i, /livekit/i];

/**
 * DefaultUserOnly: 403 for `user.isBot`. Classify as session-only even if an
 * older spec listed botToken. After current Fluxer OpenAPI these are already
 * sessionToken-only; the list is a safety net.
 */
const DEFAULT_USER_ONLY_OPS = new Set([
  'POST /channels/messages/bulk',
  'GET /channels/{channel_id}/rtc-regions',
  'POST /streams/{stream_key}/preview',
  'GET /streams/{stream_key}/preview',
  'DELETE /streams/{stream_key}/preview',
  'POST /streams/{stream_key}/preview/upload-url',
]);

/**
 * OpenAPI lists botToken, but Fluxer throws BotsCannotCreateGuildsError.
 * Never treat as a missing bot wrapper.
 */
const BOT_DENIED_OPS = new Set(['POST /guilds']);

/**
 * Captcha-gated (bots are not exempt). Never treat as a missing bot wrapper.
 * POST /users/@me/channels stays mixed: 1:1 `recipient_id` is bot-legal;
 * group-DM `recipients` is captcha (do not add createGroupDM).
 */
const CAPTCHA_GATED_OPS = new Set(['PUT /channels/{channel_id}/recipients/{user_id}']);

function authOf(op: Op): Classified['auth'] {
  const secs = op.security ?? [];
  if (!secs.length) return 'none';
  const keys = new Set<string>();
  for (const s of secs) {
    for (const k of Object.keys(s)) keys.add(k);
  }
  const hasBot = keys.has('botToken');
  const hasSession = keys.has('sessionToken');
  if (hasBot && hasSession) return 'mixed';
  if (hasBot) return 'botToken';
  if (hasSession) return 'sessionToken';
  return 'public';
}

function main(): void {
  const doc = JSON.parse(fs.readFileSync(OPENAPI_FILE, 'utf8')) as {
    paths: Record<string, Record<string, Op>>;
  };

  // Load Routes keys if available for rough route coverage
  let routeSource = '';
  const routesPath = path.join(REPO_ROOT, 'packages', 'types', 'src', 'Rest', 'Routes.ts');
  if (fs.existsSync(routesPath)) {
    routeSource = fs.readFileSync(routesPath, 'utf8');
  }

  // Core package sources: if Routes.* path builders are referenced, treat as wrapped
  let coreSource = '';
  const coreRoot = path.join(REPO_ROOT, 'packages', 'fluxer-core', 'src');
  if (fs.existsSync(coreRoot)) {
    const walk = (dir: string): void => {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) walk(full);
        else if (ent.name.endsWith('.ts') && !ent.name.endsWith('.test.ts')) {
          coreSource += `${fs.readFileSync(full, 'utf8')}\n`;
        }
      }
    };
    walk(coreRoot);
  }

  /** True when `source` contains `pathLit` as a complete string/template literal (not a longer path). */
  const hasExactPathLiteral = (source: string, pathLit: string): boolean => {
    const escaped = pathLit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(['"\`])${escaped}\\1`).test(source);
  };

  const routeBuilderNames = [...routeSource.matchAll(/^\s{2}(\w+)\s*:/gm)].map((m) => m[1]!);
  const usedBuilders = new Set(
    routeBuilderNames.filter((name) => coreSource.includes(`Routes.${name}`)),
  );

  const ops: Classified[] = [];
  for (const [p, methods] of Object.entries(doc.paths)) {
    for (const [method, op] of Object.entries(methods)) {
      if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;
      const auth = authOf(op);
      const id = op.operationId ?? `${method}_${p}`;
      const voice = VOICE_HINTS.some(
        (re) => re.test(p) || re.test(id) || (op.tags ?? []).some((t) => re.test(t)),
      );
      let category: Classified['category'] = 'other';
      let status: Classified['status'] = 'needs_wrapper';
      if (voice) {
        category = 'voice';
        status = 'voice_excluded';
      } else if (auth === 'sessionToken') {
        category = 'session';
        status = 'session_only';
      } else if (auth === 'none' || auth === 'public') {
        category = 'public';
        status = 'public';
      } else if (auth === 'botToken' || auth === 'mixed') {
        category = 'bot';
        const open = p.replace(/\{[^}]+\}/g, '{}');
        const builderUsedForPath = [...usedBuilders].some((name) => {
          const block = routeSource.match(
            new RegExp(`${name}:[\\s\\S]*?(?=\\r?\\n  \\w+:|\\r?\\n\\})`),
          );
          if (!block) return false;
          const lit = [
            ...block[0].matchAll(/`(\/[^`]+)`/g),
            ...block[0].matchAll(/'(\/[^']+)'/g),
            ...block[0].matchAll(/"(\/[^"]+)"/g),
          ].map((x) => x[1]!.replace(/\$\{[^}]+\}/g, '{}'));
          return lit.some((t) => t === open);
        });
        const routeDefined = [
          ...routeSource.matchAll(/`(\/[^`]+)`/g),
          ...routeSource.matchAll(/'(\/[^']+)'/g),
          ...routeSource.matchAll(/"(\/[^"]+)"/g),
        ].some((m) => {
          const t = m[1]!.replace(/\$\{[^}]+\}/g, '{}');
          return t === open;
        });
        // Exact path literals only (avoids `/guilds` matching `/guilds/{id}` comments / CDN paths).
        const pathUsedInCore =
          hasExactPathLiteral(coreSource, open) ||
          hasExactPathLiteral(coreSource, p) ||
          (open.includes('/@me') &&
            [...usedBuilders].some((name) => {
              const block = routeSource.match(
                new RegExp(`${name}:[\\s\\S]*?(?=\\r?\\n  \\w+:|\\r?\\n\\})`),
              );
              if (!block) return false;
              return [...block[0].matchAll(/`(\/[^`]+)`/g)].some((x) => {
                const t = x[1]!.replace(/\$\{[^}]+\}/g, '{}');
                return open.startsWith(`${t}/`) || open === t;
              });
            }));
        if (builderUsedForPath || pathUsedInCore) status = 'wrapped';
        else if (routeDefined) status = 'route_only';
        else status = 'needs_wrapper';
      }
      const opKey = `${method.toUpperCase()} ${p}`;
      if (DEFAULT_USER_ONLY_OPS.has(opKey) && status !== 'voice_excluded') {
        category = 'session';
        status = 'session_only';
      } else if (
        (status === 'needs_wrapper' || status === 'route_only') &&
        (BOT_DENIED_OPS.has(opKey) || CAPTCHA_GATED_OPS.has(opKey))
      ) {
        status = 'bot_denied';
      }
      ops.push({
        method: method.toUpperCase(),
        path: p,
        operationId: id,
        auth,
        category,
        status,
      });
    }
  }

  const summary = {
    total: ops.length,
    byCategory: {} as Record<string, number>,
    byStatus: {} as Record<string, number>,
    generatedAt: new Date().toISOString(),
  };
  for (const o of ops) {
    summary.byCategory[o.category] = (summary.byCategory[o.category] ?? 0) + 1;
    summary.byStatus[o.status] = (summary.byStatus[o.status] ?? 0) + 1;
  }

  const report = { summary, operations: ops };
  fs.writeFileSync(COVERAGE_FILE, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${path.relative(process.cwd(), COVERAGE_FILE)}`);
  console.log(JSON.stringify(summary, null, 2));
}

try {
  main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
