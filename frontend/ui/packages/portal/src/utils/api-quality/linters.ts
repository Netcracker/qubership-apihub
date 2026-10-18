import type { Linter } from '@portal/entities/api-quality/linters'

export function getLinterById(linterId: Linter['linter'], linters: readonly Linter[]): Linter | undefined {
  return linters.find(linter => linter.linter === linterId)
}

export function getLinterName(linterId: Linter['linter'], linters: readonly Linter[]): string {
  return getLinterById(linterId, linters)?.displayName ?? linterId
}
