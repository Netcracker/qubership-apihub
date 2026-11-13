import { isEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'

export const WITH_BASELINE_PACKAGE_GROUP = 'with-baseline-package'
export const WITHOUT_BASELINE_PACKAGE_GROUP = 'without-baseline-package'
export const WITHOUT_API_DOCUMENTS_GROUP = 'without-api-documents'

export type DiscoveredServiceGroup =
  | typeof WITH_BASELINE_PACKAGE_GROUP
  | typeof WITHOUT_BASELINE_PACKAGE_GROUP
  | typeof WITHOUT_API_DOCUMENTS_GROUP

type DiscoveredService = Readonly<{
  specs?: ReadonlyArray<unknown>
  baseline?: unknown
}>

/**
 * A service without API documents has a group of its own, whatever its baseline package; the others split by whether
 * a baseline package is linked to them.
 */
export function discoveredServiceGroupOf({ specs, baseline }: DiscoveredService): DiscoveredServiceGroup {
  if (isEmpty(specs)) {
    return WITHOUT_API_DOCUMENTS_GROUP
  }
  return baseline ? WITH_BASELINE_PACKAGE_GROUP : WITHOUT_BASELINE_PACKAGE_GROUP
}
