import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/worker/ShardWorker.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  clean: true,
});
