import type { Key } from './keys'
import type { PackageRef } from './operations'

export function getContractListKey(
  packageRef: PackageRef | undefined,
  entityId: Key,
): string {
  return `${packageRef?.key ?? ''}:${entityId}`
}
