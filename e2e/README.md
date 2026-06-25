# End-to-end tests (Playwright)

Browser tests live under `e2e/` and run against the Vite dev server.

## Layout

```
e2e/
  fixtures/test-base.ts   # Shared Playwright fixtures (app, lab, docs page objects)
  pages/                  # Page object models
  support/constants.ts    # Route paths and shared test constants
  tests/
    navigation/           # Navigation specs by area
playwright.config.ts
mock-device/              # SCPI mock power supply (see mock-device/README.md)
```

## Commands

```bash
npm run test:e2e          # Run all tests (starts dev server automatically)
npm run test:e2e:ui       # Interactive UI mode
npm run test:e2e:report   # Open HTML report after a run
```

## Adding tests

- Put specs in `e2e/tests/<area>/`.
- Reuse `test` and `expect` from `e2e/fixtures/test-base.ts`.
- Add page interactions to `e2e/pages/` rather than duplicating selectors in specs.
- Device/WebSerial tests should use the `mockDevice` fixture from `e2e/fixtures/mock-device.ts`.
