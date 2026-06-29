/// <reference types="vite/client" />

declare const __APP_VERSION__: string
declare const __BUILD_YEAR__: string

interface ImportMetaEnv {
  /** Dev transport: `mock` (WebSocket bridge) or `webserial` (Chrome picker). */
  readonly VITE_PROTOV_DEV_TRANSPORT?: 'mock' | 'webserial'
  readonly VITE_PROTOV_MOCK_WS?: string
  readonly MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
