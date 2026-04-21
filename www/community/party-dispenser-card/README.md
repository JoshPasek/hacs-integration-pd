# party-dispenser-card

Custom Lovelace card for the Party Dispenser HACS integration (lit-element + TypeScript + rollup).

## Build workflow

    cd www/community/party-dispenser-card
    npm ci
    npm run typecheck      # tsc --noEmit
    npm test               # @web/test-runner with coverage gate >=70%
    npm run build          # rollup -> dist/party-dispenser-card.js -> copied to custom_components/party_dispenser/frontend/

The Python integration auto-registers `/party_dispenser_frontend/party-dispenser-card.js` as a Lovelace resource on startup. No user action required beyond installing the integration.

## Source layout

- `src/party-dispenser-card.ts` — root custom element (Plan 04-02)
- `src/components/pd-*.ts` — leaf components (Plan 04-02)
- `src/editor/pd-editor.ts` — visual config editor (Plan 04-02)
- `src/state.ts` — pure state-derivation helper (Plan 04-02)
- `src/types.ts` — shared TS types (this plan — Plan 04-01)
- `test/fixtures/hass-*.ts` — HomeAssistant mock factories (this plan)
- `test/*.test.ts` — @web/test-runner + @open-wc/testing specs (Plan 04-03)

## Commit policy

- `dist/` is gitignored. The committed artifact is `custom_components/party_dispenser/frontend/party-dispenser-card.js` (+ `.js.map`), produced by rollup's `rollup-plugin-copy` step.
- Bundle version is injected from `custom_components/party_dispenser/manifest.json::version` at build time.
