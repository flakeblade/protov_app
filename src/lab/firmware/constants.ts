/** Matches protov-nvm FWUP limits (4096-byte flash pages). */
export const FWUP_MAX_BLOCK_LEN = 4096
export const FWUP_SIGNATURE_LEN = 64
export const FWUP_DEFAULT_CHUNK_SIZE = 4096

/** Same timeouts as protov/scripts/fwup_upload.py (STAR_TIMEOUT_S / IO_TIMEOUT_S). */
export const FWUP_STAR_TIMEOUT_MS = 120_000
export const FWUP_IO_TIMEOUT_MS = 30_000
export const FWUP_FLUSH_TIMEOUT_MS = 800
