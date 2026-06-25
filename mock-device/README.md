# Mock ProtoV MINI power supply (SCPI)

Python mock of the ProtoV MINI dual-channel supply for **pyvisa-py**, **WebSerial**, and **Playwright** tests. Commands match the lab SCPI subset used by the web app.

## Quick start

```bash
cd mock-device
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install -e ".[test]"

# Auto PTY (client path written to .protov-mock.port)
python -m protov_scpi --state states/ch1-active.yaml

# Or use the helper script
./scripts/run.sh --state states/ch1-active.yaml -v
```

Connect with pyvisa-py:

```python
import pyvisa
rm = pyvisa.ResourceManager("@py")
port = open(".protov-mock.port").read().strip()
inst = rm.open_resource(f"ASRL{port}::INSTR", read_termination="\n", write_termination="\n")
print(inst.query("*IDN?"))
```

## Stable port for WebSerial (Linux)

WebSerial and browser tests benefit from a **fixed symlink** rather than a random `/dev/pts/N`:

```bash
# Terminal 1 — create PTY pair (requires socat)
./scripts/create_port.sh

# Terminal 2 — run mock on server side
PROTOV_MOCK_SERVER_PORT=/tmp/protov-mini-peer ./scripts/run.sh --state states/default.yaml
```

| Path | Role |
|------|------|
| `/tmp/protov-mini` | Client — Chrome WebSerial, pyvisa, lab app |
| `/tmp/protov-mini-peer` | Server — mock SCPI process |

Grant access if needed: `sudo chmod 666 /tmp/protov-mini`

## SCPI commands

| Group | Commands |
|-------|----------|
| Common | `*IDN?`, `*RST`, `*SAV <1-9>`, `*RCL <1-9>`, `*DEL <1-9>` |
| Measure | `MEAS:CURR? CHn`, `MEAS:VOLT? CHn`, `MEAS:POW? CHn` |
| Setpoints | `CHn:VOLT`, `CHn:CURR`, `CHn:OVP`, `CHn:OCP` (+ `?` queries) |
| Output | `OUTP CHn,ON\|OFF`, `OUTP? CHn`, `OUTP:RESET:PROT [CHn]` |
| System | `SYST:ERR?`, `SYST:VERS?`, `SYST:LOC`, `SYST:REM` |

Responses use three decimal places for V/A/W (e.g. `3.300`, `0.243`).

## Preset states (JSON / YAML)

Files under `states/` preload the device for test scenarios:

| File | Scenario |
|------|----------|
| `default.yaml` | Factory setpoints, outputs off |
| `ch1-active.yaml` | CH1 on with example MEAS readings |
| `dual-output.json` | Both channels on (JSON example) |
| `protection-tripped.yaml` | OVP/OCP latched, error queued |

Load at startup:

```bash
python -m protov_scpi --state states/protection-tripped.yaml
```

Or hot-reload during a test via the **control socket**:

```bash
python scripts/control.py "LOAD states/ch1-active.yaml"
python scripts/control.py STATUS
python scripts/control.py RESET
```

Control socket path defaults to `.protov-mock.ctrl` (Unix domain socket).

## Playwright integration

Use the `mockDevice` fixture from `e2e/fixtures/mock-device.ts`:

```typescript
import { test, expect } from '../fixtures/mock-device'

test('mock supply exposes serial port', async ({ mockDevice }) => {
  expect(mockDevice.clientPort).toBeTruthy()
  await mockDevice.loadState('ch1-active.yaml')
  const status = await mockDevice.status()
  expect(status.channels).toBeDefined()
})
```

The fixture:

1. Starts `./scripts/run.sh` with `states/default.yaml`
2. Exposes `clientPort` for future WebSerial wiring in the lab app
3. Provides `loadState()` / `status()` over the control socket

When the web app gains real WebSerial support, point it at `mockDevice.clientPort` (or `/tmp/protov-mini` with `create_port.sh`).

## Python tests

```bash
cd mock-device
pytest
```

Tests cover unit SCPI parsing, pyvisa serial I/O, and control-socket state loading.

## pyvisa-py backend

Install system packages if needed:

```bash
sudo apt install socat   # optional, for stable symlinks
pip install pyvisa pyvisa-py pyserial pyyaml
```

Resource string format on Linux:

```
ASRL/dev/pts/NN::INSTR
ASRL/tmp/protov-mini::INSTR   # with create_port.sh
```

Use `@py` as the VISA backend (no NI-VISA required):

```python
pyvisa.ResourceManager("@py")
```

## Layout

```
mock-device/
  protov_scpi/          # SCPI parser, server, control socket
  states/               # YAML/JSON presets
  scripts/
    run.sh              # Start server (creates venv if needed)
    create_port.sh      # socat PTY pair for WebSerial
    control.py          # CLI for control socket
  tests/                # pytest + pyvisa
  requirements.txt
  pyproject.toml
```
