// www/community/party-dispenser-card/web-test-runner.config.mjs
// Research lines 1122-1173; UI-SPEC §15.5
import { esbuildPlugin } from '@web/dev-server-esbuild';
import { playwrightLauncher } from '@web/test-runner-playwright';

export default {
  nodeResolve: true,
  files: 'test/**/*.test.ts',
  plugins: [
    esbuildPlugin({
      ts: true,
      target: 'es2020',
      tsconfig: './tsconfig.json',
    }),
  ],
  browsers: [
    playwrightLauncher({ product: 'chromium' }),
    // Phase 5 enables firefox + webkit matrix:
    // playwrightLauncher({ product: 'firefox' }),
    // playwrightLauncher({ product: 'webkit' }),
  ],
  coverage: true,
  coverageConfig: {
    include: ['src/**/*.ts'],
    exclude: ['src/**/*.d.ts', 'src/types.ts'],
    threshold: {
      statements: 70,
      branches: 60,
      functions: 70,
      lines: 70,
    },
    reporters: ['html', 'lcov', 'text-summary'],
  },
  testRunnerHtml: testFramework => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <script type="module" src="${testFramework}"></script>
        <!-- intentionally EMPTY: tests must verify fallback tokens without HA theme vars -->
        <style>:root {}</style>
      </head>
      <body></body>
    </html>
  `,
};
