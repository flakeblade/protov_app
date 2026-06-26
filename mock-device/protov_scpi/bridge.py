from __future__ import annotations

import asyncio
import logging
import threading
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .device_pool import DevicePool

logger = logging.getLogger(__name__)


class WebBridgeServer:
    """WebSocket SCPI bridge — one pooled mock device per browser connection."""

    def __init__(self, pool: DevicePool, host: str = "127.0.0.1", port: int = 8765) -> None:
        self.pool = pool
        self.host = host
        self.port = port
        self._thread: threading.Thread | None = None
        self._loop: asyncio.AbstractEventLoop | None = None

    async def _handle_client(self, websocket) -> None:
        acquired = self.pool.acquire()
        if acquired is None:
            await websocket.send('-221,"All four mock device slots are in use"\n')
            await websocket.close(1013, "All four mock device slots are in use")
            return

        slot_index, device = acquired
        serial = device.state.serial
        logger.info("WebSocket client assigned mock device slot %s (%s)", slot_index, serial)

        try:
            async for message in websocket:
                command = message if isinstance(message, str) else message.decode("utf-8")
                command = command.strip()
                if not command:
                    continue
                result = device.handle(command)
                if result.response is not None:
                    await websocket.send(result.response + "\n")
        finally:
            self.pool.release(slot_index)
            logger.info("Released mock device slot %s (%s)", slot_index, serial)

    def _run(self) -> None:
        import websockets

        self._loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self._loop)

        async def serve() -> None:
            async with websockets.serve(
                self._handle_client,
                self.host,
                self.port,
                max_size=2**16,
            ):
                await asyncio.Future()

        self._loop.run_until_complete(serve())

    def start(self) -> None:
        self._thread = threading.Thread(target=self._run, daemon=True, name="protov-web-bridge")
        self._thread.start()
        logger.info("Web SCPI bridge listening on ws://%s:%s (up to 4 devices)", self.host, self.port)

    def stop(self) -> None:
        if self._loop is not None:
            self._loop.call_soon_threadsafe(self._loop.stop)
        if self._thread is not None:
            self._thread.join(timeout=2)
