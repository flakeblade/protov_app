from __future__ import annotations

import pytest

from protov_scpi.device_pool import (
    MAX_MOCK_DEVICES,
    MOCK_DEVICE_PROFILES,
    DevicePool,
)


def test_pool_has_four_profiles():
    assert len(MOCK_DEVICE_PROFILES) == MAX_MOCK_DEVICES


def test_pool_acquire_release():
    pool = DevicePool()
    acquired = [pool.acquire() for _ in range(MAX_MOCK_DEVICES)]
    assert all(entry is not None for entry in acquired)
    assert pool.acquire() is None

    serials = {entry[1].handle("*IDN?").response.split(",")[2] for entry in acquired if entry}
    assert serials == {profile["serial"] for profile in MOCK_DEVICE_PROFILES}

    pool.release(0)
    again = pool.acquire()
    assert again is not None
    index, device = again
    assert index == 0
    assert device.handle("*IDN?").response.split(",")[2] == MOCK_DEVICE_PROFILES[0]["serial"]


def test_pool_release_resets_device_state():
    pool = DevicePool()
    acquired = pool.acquire()
    assert acquired is not None
    index, device = acquired
    device.handle("CH1:COLR 255,255,0")
    assert device.handle("CH1:COLR?").response == "255,255,0"
    pool.release(index)
    fresh = pool._devices[index]
    assert fresh.handle("CH1:COLR?").response == "234,67,53"
