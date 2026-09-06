import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    client: 'src/SubpathClient.ts',
    errors: 'src/SubpathErrors.ts',
    message: 'src/SubpathMessage.ts',
    cluster: 'src/SubpathCluster.ts',
    internal: 'src/SubpathInternal.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  clean: true,
});
