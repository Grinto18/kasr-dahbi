import * as esbuild from 'esbuild';
import path from 'path';

async function buildElectron() {
  console.log('Building Electron main & server bundles with esbuild...');

  // 1. Build server bundle for production Node runtime
  await esbuild.build({
    entryPoints: ['server.ts'],
    bundle: true,
    platform: 'node',
    target: 'node20',
    outfile: 'dist-electron/server.cjs',
    format: 'cjs',
    external: [
      'fsevents',
      'electron',
      'vite',
      '@vitejs/devtools/config',
      'lightningcss',
      'esbuild',
    ],
    sourcemap: false,
    define: {
      'process.env.NODE_ENV': '"production"',
      'process.env.IS_ELECTRON': '"true"',
    },
  });

  // 2. Build Electron main process
  await esbuild.build({
    entryPoints: ['electron/main.ts'],
    bundle: true,
    platform: 'node',
    target: 'node20',
    outfile: 'dist-electron/main.cjs',
    format: 'cjs',
    external: [
      'electron',
      'fsevents',
    ],
    sourcemap: false,
  });

  // 3. Build Preload script
  await esbuild.build({
    entryPoints: ['electron/preload.ts'],
    bundle: true,
    platform: 'node',
    target: 'node20',
    outfile: 'dist-electron/preload.cjs',
    format: 'cjs',
    external: ['electron'],
    sourcemap: false,
  });

  console.log('Electron build completed successfully in ./dist-electron');
}

buildElectron().catch((err) => {
  console.error('Electron build failed:', err);
  process.exit(1);
});
