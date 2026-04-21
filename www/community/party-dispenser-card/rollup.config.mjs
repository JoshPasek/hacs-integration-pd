// www/community/party-dispenser-card/rollup.config.mjs
// Research lines 1037-1108; UI-SPEC §17.2
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import copy from 'rollup-plugin-copy';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve as pathResolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const manifestPath = pathResolve(__dirname, '../../../custom_components/party_dispenser/manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const CARD_VERSION = manifest.version;

export default {
  input: 'src/party-dispenser-card.ts',
  output: {
    file: 'dist/party-dispenser-card.js',
    format: 'es',
    sourcemap: true,
    inlineDynamicImports: true,
  },
  plugins: [
    resolve({ browser: true, preferBuiltins: false }),
    commonjs(),
    json(),
    typescript({
      tsconfig: './tsconfig.json',
      declaration: false,
      inlineSources: true,
    }),
    {
      name: 'inject-card-version',
      renderChunk(code) {
        return code.replace(/__CARD_VERSION__/g, JSON.stringify(CARD_VERSION));
      },
    },
    copy({
      targets: [
        {
          src: 'dist/party-dispenser-card.js',
          dest: '../../../custom_components/party_dispenser/frontend/',
        },
        {
          src: 'dist/party-dispenser-card.js.map',
          dest: '../../../custom_components/party_dispenser/frontend/',
        },
      ],
      hook: 'writeBundle',
    }),
  ],
  onwarn(warning, warn) {
    if (warning.code === 'CIRCULAR_DEPENDENCY') return;
    warn(warning);
  },
};
