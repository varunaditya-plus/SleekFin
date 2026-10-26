import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { transformAsync } from '@babel/core';
import presetEnv from '@babel/preset-env';
import { build } from 'esbuild';

const root = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.join(root, 'src/Jellyfin.Plugin.SleekFin/Frontend');
const outputRoot = path.join(root, 'src/Jellyfin.Plugin.SleekFin/Inject/Build');
const checking = process.argv.includes('--check');
const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const preactLicense = await readFile(path.join(root, 'node_modules/preact/LICENSE'), 'utf8');
const preactNotice = `\n/*! Preact ${packageJson.dependencies.preact}\n${preactLicense.trim()}\n*/\n`;

const result = await build({
  absWorkingDir: root,
  banner: { js: "'use strict';" },
  bundle: true,
  charset: 'utf8',
  define: { 'process.env.NODE_ENV': '"production"' },
  entryPoints: {
    'sleekfin-runtime': path.join(frontendRoot, 'runtime/index.jsx'),
    'sleekfin-theme': path.join(frontendRoot, 'features/theme/index.js'),
    'sleekfin-header': path.join(frontendRoot, 'features/header/index.js'),
    'sleekfin-hero': path.join(frontendRoot, 'features/hero/index.jsx'),
    'sleekfin-media': path.join(frontendRoot, 'features/media/index.js'),
    'sleekfin-details': path.join(frontendRoot, 'features/details/index.js'),
    'sleekfin-details-builder': path.join(frontendRoot, 'features/detailsBuilder/index.jsx'),
  },
  format: 'iife',
  jsxFactory: 'h',
  jsxFragment: 'Fragment',
  logLevel: 'silent',
  minify: true,
  outdir: outputRoot,
  platform: 'browser',
  target: 'es2015',
  write: false,
});

const outputs = await Promise.all(result.outputFiles.map(async (output) => {
  const transformed = await transformAsync(output.text, {
    babelrc: false,
    compact: true,
    configFile: false,
    filename: output.path,
    presets: [[presetEnv, { bugfixes: true, modules: false, targets: packageJson.browserslist }]],
  });

  if (!transformed?.code) throw new Error(`Babel did not produce ${path.relative(root, output.path)}.`);

  const notice = path.basename(output.path) === 'sleekfin-runtime.js' ? preactNotice : '\n';
  return { contents: Buffer.from(`(function(){${transformed.code}}());${notice}`), path: output.path };
}));

if (checking) {
  const stale = [];
  for (const output of outputs) {
    let current;
    try {
      current = await readFile(output.path);
    } catch {
      stale.push(path.relative(root, output.path));
      continue;
    }
    if (!current.equals(output.contents)) {
      stale.push(path.relative(root, output.path));
    }
  }
  if (stale.length) {
    throw new Error(`Generated frontend bundles are stale: ${stale.join(', ')}`);
  }
  console.log(`Verified ${outputs.length} generated frontend bundles.`);
} else {
  await mkdir(outputRoot, { recursive: true });
  await Promise.all(outputs.map((output) => writeFile(output.path, output.contents)));
  console.log(`Built ${outputs.length} Jellyfin-compatible frontend bundles.`);
}
