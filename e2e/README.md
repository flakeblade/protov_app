# End-to-end tests (Playwright)

Browser tests live under `e2e/` and run against the Vite dev server.

## Layout

```
e2e/
  fixtures/
    test-base.ts          # Shared page-object fixtures (app, lab, controls, graphs, telemetry)
    lab-devices.ts          # Connected mock backend + mockControl fixture
  pages/                    # Page object models
  states/                   # JSON presets for protov-hal-mock control socket
  support/                  # mock-control client, slot profiles, graph helpers
  tests/
    general/                # Cross-browser smoke + theme toggle specs
    navigation/             # Navigation specs (no mock backend)
    lab/                    # Connected-device specs (*-connected.spec.ts)
playwright.config.ts
```

Playwright projects: **chromium**, **msedge**, and **firefox** run the general suite; **chromium-devices-mock** runs connected lab tests against protov-hal-mock.

## Commands

```bash
# Connected lab tests require protov-hal-mock running first:
#   cd ../protov && just run-mock

npm run test:e2e          # Run all tests (starts dev server automatically)
npm run test:e2e:ui       # Interactive UI mode
npm run test:e2e:report   # Open HTML report after a run

# General suite only (all three desktop browsers):
npm run test:e2e -- e2e/tests/general --project=chromium --project=msedge --project=firefox

# Connected mock suite only:
npm run test:e2e -- --project=chromium-devices-mock
```

Install extra browser binaries once if needed:

```bash
npx playwright install msedge firefox
```

## Adding tests

- Put specs in `e2e/tests/<area>/`.
- Reuse `test` and `expect` from `e2e/fixtures/test-base.ts` for page-only tests.
- Connected device tests should import from `e2e/fixtures/lab-devices.ts` and use the `mockControl` fixture to load state from `e2e/states/`.
- Add page interactions to `e2e/pages/` rather than duplicating selectors in specs.
