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

## WebSocket bridge (browser dev)

Browsers often cannot see socat/virtual serial ports in the WebSerial picker. The mock device therefore includes a **built-in WebSocket SCPI bridge** — one process, up to **four simultaneous browser connections**:

```bash
# From repo root
npm run dev:mock

# Equivalent
cd mock-device && ./scripts/run.sh --state states/ch1-active.yaml
```

This starts:

- **Four pooled mock devices** with distinct serial numbers (`550e8400`, `32983fe4`, `deadbeef`, `a1b2c3d4`)
- **WebSocket bridge** at `ws://127.0.0.1:8765` (written to `.protov-mock.bridge`) — each Connect click in the web app acquires one slot
- Control socket at `.protov-mock.ctrl` (Playwright / CI)

In Vite dev mode the web app connects through the bridge automatically when you click **Connect** — no serial port picker. Click Connect up to four times to attach all mock devices; disconnecting releases a slot back to the pool.

For **pyvisa** / serial testing, run with a PTY instead:

```bash
PROTOV_MOCK_WEB_BRIDGE=0 PROTOV_MOCK_SERVER_PORT=auto ./scripts/run.sh
```

## Stable port for pyvisa (optional)

For a fixed symlink rather than a random `/dev/pts/N`:

```bash
# Terminal 1
./scripts/create_port.sh

# Terminal 2
PROTOV_MOCK_WEB_BRIDGE=0 PROTOV_MOCK_SERVER_PORT=/tmp/protov-mini-peer ./scripts/run.sh
```

| Path | Role |
|------|------|
| `/tmp/protov-mini` | pyvisa client |
| `/tmp/protov-mini-peer` | Mock SCPI server |

## SCPI commands

| Group | Commands |
|-------|----------|
| Common | `*IDN?`, `*RST`, `*SAV <1-9>`, `*RCL <1-9>`, `*DEL <1-9>` |
| Measure | `MEAS:CURR? CHn`, `MEAS:VOLT? CHn`, `MEAS:POW? CHn` |
| Setpoints | `CHn:VOLT`, `CHn:CURR`, `CHn:OVP`, `CHn:OCP` (+ `?` queries) |
| Mode | `CHn:MODE?` → `OFF`, `CV`, `CC`, `SHORT`, `TEMP`, `OCP`, `OVP` |
| Appearance | `CHn:COLR r,g,b`, `CHn:COLR?` — RGB u8 triplet (default CH1=`234,67,53`, CH2=`66,133,244`) |
| Display | `LCD:BRIG n`, `LCD:BRIG?`, `LED:BRIG n`, `LED:BRIG?` — brightness u8 (0–255) |
| Output | `OUTP CHn,ON\|OFF`, `OUTP? CHn`, `OUTP:RESET:PROT [CHn]` |
| System | `SYST:ERR?`, `SYST:VERS?`, `SYST:LOC`, `SYST:REM` |
| Telemetry | `TELEM?`, `TEMP? CHA\|CHB\|MCU`, `INP?`, `DIAG?` |
| Register dump | `INA226:REG? CHA\|CHB`, `TPS55289:REG? CHA\|CHB` (also `ina226 dump cha`, `tps55289 dump chb`) |

Responses use three decimal places for V/A/W (e.g. `3.300`, `0.243`).

`TELEM?` returns a comma-separated snapshot for live UI polling:

```
<temp_chA>,<temp_chB>,<temp_mcu>,<PD|STD>,<input_V>,<input_A>,<sense_ok>,<converter_ok>
```

Register dump responses use `|` as a line separator (the web app splits these for display).

`*IDN?` returns:

```
FBRD Inc.,ProtoV MINI,<serial>,<fw_version>,<hw_version>
```

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

The fixture starts the mock SCPI server for Playwright control-socket tests. For WebSerial UI testing, run `npm run dev:mock` and use the browser port picker.

### Web app (dev)

```bash
# Terminal 1
npm run dev:mock

# Terminal 2
npm run dev
```

Open `/lab/devices` and click **Connect** up to four times. Dev mode uses the mock device's WebSocket bridge (`ws://127.0.0.1:8765`) automatically. Each connection receives a distinct serial number. Channel colors are assigned in add order (red/blue first, then yellow/green, orange/teal, violet/pink) and stay with that serial while connected. Disconnecting frees that color pair for the next device to connect; remaining devices keep their colors.

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
