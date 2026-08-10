/** TEMP: skip firmware-update (DFU) E2E until mock timing / CI stability is restored. */
export const SKIP_DFU_E2E = true

export const DFU_E2E_TEST_PATTERNS = [
  'software-update-check.spec.ts',
  'software-update-flow.spec.ts',
  'software-update-dfu.spec.ts',
] as const

export function isDfuE2eTest(pattern: string): boolean {
  return DFU_E2E_TEST_PATTERNS.some((name) => pattern.includes(name))
}
