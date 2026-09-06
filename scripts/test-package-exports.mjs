#!/usr/bin/env node
/**
 * Exercise actual code from each published @fluxerjs package.
 * Verifies exports work and basic functionality runs (not just import).
 *
 * Run from repo root after build:
 *   node scripts/test-package-exports.mjs
 */

const TESTS = [
  {
    pkg: '@fluxerjs/types',
    exercise: async (m) => {
      if (typeof m.Routes?.channel !== 'function') throw new Error('Routes.channel missing');
      if (m.Routes.channel('123') !== '/channels/123') throw new Error('Routes.channel() wrong');
    },
  },
  {
    pkg: '@fluxerjs/types/routes',
    exercise: async (m) => {
      if (typeof m.Routes?.channel !== 'function')
        throw new Error('subpath Routes.channel missing');
    },
  },
  {
    pkg: '@fluxerjs/util',
    exercise: async (m) => {
      if (!m.SnowflakeUtil?.isValid('0')) throw new Error('SnowflakeUtil.isValid failed');
      const id = m.SnowflakeUtil?.snowflakeFromTimestamp?.(Date.now());
      if (typeof id !== 'string') throw new Error('SnowflakeUtil.snowflakeFromTimestamp failed');
    },
  },
  {
    pkg: '@fluxerjs/collection',
    exercise: async (m) => {
      const coll = new m.Collection();
      if (coll.size !== 0) throw new Error('Collection.size wrong');
      coll.set('a', 1);
      if (coll.get('a') !== 1) throw new Error('Collection set/get failed');
    },
  },
  {
    pkg: '@fluxerjs/rest',
    exercise: async (m) => {
      const rm = new m.RequestManager({ api: 'https://example.com' });
      if (typeof rm.request !== 'function') throw new Error('RequestManager.request missing');
    },
  },
  {
    pkg: '@fluxerjs/rest/request-manager',
    exercise: async (m) => {
      const rm = new m.RequestManager({});
      if (typeof rm.request !== 'function')
        throw new Error('subpath RequestManager.request missing');
    },
  },
  {
    pkg: '@fluxerjs/ws',
    exercise: async (m) => {
      if (typeof m.GatewayCloseCodes !== 'object') throw new Error('GatewayCloseCodes missing');
      if (m.GatewayCloseCodes.Normal !== 1000) throw new Error('GatewayCloseCodes.Normal wrong');
      if (typeof m.shardIdForGuild !== 'function') throw new Error('shardIdForGuild missing');
      if (m.shardIdForGuild('1', 1) !== 0) throw new Error('shardIdForGuild wrong');
      if (typeof m.SimpleIdentifyThrottler !== 'function') {
        throw new Error('SimpleIdentifyThrottler missing');
      }
      if (typeof m.WorkerShardingStrategy !== 'function') {
        throw new Error('WorkerShardingStrategy missing');
      }
    },
  },
  {
    pkg: '@fluxerjs/builders',
    exercise: async (m) => {
      const embed = new m.EmbedBuilder().setTitle('test').setDescription('desc');
      const json = embed.toJSON();
      if (json.title !== 'test' || json.description !== 'desc') {
        throw new Error('EmbedBuilder toJSON failed');
      }
    },
  },
  {
    pkg: '@fluxerjs/core',
    exercise: async (m) => {
      if (typeof m.Client !== 'function') throw new Error('Client missing');
      if (typeof m.Events !== 'object') throw new Error('Events missing');
      if (!m.Events.Ready) throw new Error('Events.Ready missing');
      if (typeof m.ClientCluster !== 'function') throw new Error('ClientCluster missing');
      if (!m.ClientClusterEvents?.RuntimeAdded) throw new Error('ClientClusterEvents missing');
      if (typeof m.BETA_CLIENT_CLUSTER_WARNING !== 'string') {
        throw new Error('BETA_CLIENT_CLUSTER_WARNING missing');
      }
    },
  },
  {
    pkg: '@fluxerjs/core/client',
    exercise: async (m) => {
      if (typeof m.Client !== 'function') throw new Error('subpath Client missing');
      if (!m.Events?.Ready) throw new Error('subpath Events missing');
    },
  },
  {
    pkg: '@fluxerjs/core/errors',
    exercise: async (m) => {
      if (typeof m.FluxerError !== 'function') throw new Error('subpath FluxerError missing');
      if (!m.ErrorCodes?.ClientNotReady) throw new Error('subpath ErrorCodes missing');
    },
  },
  {
    pkg: '@fluxerjs/core/message',
    exercise: async (m) => {
      if (typeof m.Message !== 'function') throw new Error('subpath Message missing');
    },
  },
  {
    pkg: '@fluxerjs/core/cluster',
    exercise: async (m) => {
      if (typeof m.ClientCluster !== 'function') throw new Error('subpath ClientCluster missing');
      if (!m.ClientClusterEvents?.RuntimeReady) {
        throw new Error('subpath ClientClusterEvents missing');
      }
      const cluster = new m.ClientCluster({ suppressBetaWarning: true });
      if (cluster.size !== 0) throw new Error('ClientCluster should start empty');
    },
  },
  {
    pkg: '@fluxerjs/voice',
    exercise: async (m) => {
      const mockClient = { on: () => {} };
      const manager = m.getVoiceManager(mockClient);
      if (!manager || typeof manager.join !== 'function') {
        throw new Error('getVoiceManager returned invalid VoiceManager');
      }
    },
  },
  {
    pkg: '@fluxerjs/sharding',
    exercise: async (m) => {
      if (typeof m.ShardingManager !== 'function') throw new Error('ShardingManager missing');
      if (typeof m.attachShardClientUtil !== 'function') {
        throw new Error('attachShardClientUtil missing');
      }
      if (typeof m.BETA_SHARDING_WARNING !== 'string') {
        throw new Error('BETA_SHARDING_WARNING missing');
      }
      if (typeof m.ClusterManager === 'function') {
        throw new Error(
          'ClusterManager must stay off the public barrel until plan-change respawns',
        );
      }
    },
  },
  {
    pkg: '@fluxerjs/sharding-redis',
    exercise: async (m) => {
      if (typeof m.RedisClusterCoordinator !== 'function') {
        throw new Error('RedisClusterCoordinator missing');
      }
      if (typeof m.RedisSessionStore !== 'function') throw new Error('RedisSessionStore missing');
      if (typeof m.RedisBroker !== 'function') throw new Error('RedisBroker missing');
    },
  },
];

async function main() {
  const failed = [];
  for (const { pkg, exercise } of TESTS) {
    try {
      const m = await import(pkg);
      await exercise(m);
      console.log(`✓ ${pkg} (exercised)`);
    } catch (err) {
      console.error(`✗ ${pkg}:`, err.message);
      failed.push({ pkg, err });
    }
  }
  if (failed.length > 0) {
    console.error('\nPackage export test failed for:', failed.map((f) => f.pkg).join(', '));
    process.exit(1);
  }
  console.log(`\nAll ${TESTS.length} packages exercised successfully.`);
}

main();
