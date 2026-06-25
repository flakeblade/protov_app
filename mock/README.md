# Mock device (WebSerial)

This folder will host a **mock ProtoV device** for end-to-end and integration tests.

The real app will talk to hardware over **Web Serial**. Tests should not depend on physical hardware; instead, a mock in this directory will:

1. Expose a virtual serial port (or Playwright `addInitScript` shim) that implements the future host protocol.
2. Emit telemetry frames aligned with firmware types in `src/lab/telemetry/types.ts`.
3. Accept commands issued from the lab serial console and telemetry register-dump actions.

## Planned layout

```
mock-device/
  README.md           ← this file
  protocol/           ← message framing, shared types (future)
  server/             ← Node process or test fixture entrypoint (future)
  fixtures/           ← canned responses for Playwright (future)
```

## Playwright integration (future)

- `e2e/fixtures/test-base.ts` can gain a `mockDevice` fixture that starts the mock server and grants a fake `SerialPort` in the browser context.
- Engineering-view tests (telemetry, register dumps) will use this fixture before exercising WebSerial code paths.

Until the protocol is defined in firmware, keep mock data in sync with `protovolt` telemetry structs and `MOCK_TELEMETRY_DEVICES` in the web app.
