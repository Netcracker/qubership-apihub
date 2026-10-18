import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { PackageReference } from '@netcracker/qubership-apihub-ui-shared/entities/version-references'
import {
  hasVersionProblems,
  type VersionProblemProcessorContext,
} from '@netcracker/qubership-apihub-ui-shared/hooks/versions/versionProblemDetails'

/**
 * Returns, by package key, the reference whose problem the package selector of a dashboard comparison shows: the
 * version in the current dashboard version when it has a problem, otherwise the version in the previous one. A
 * package whose versions have no problem gets no entry. For each side, the first reference of a package counts, as
 * in the option list.
 */
export function getComparisonProblemReferences(
  changedReferences: ReadonlyArray<PackageReference>,
  originReferences: ReadonlyArray<PackageReference>,
  processorContext: VersionProblemProcessorContext,
): ReadonlyMap<Key, PackageReference> {
  const problemReferences = new Map<Key, PackageReference>()
  const sides = [getFirstReferencesByKey(changedReferences), getFirstReferencesByKey(originReferences)]
  sides.forEach(referencesByKey =>
    referencesByKey.forEach((reference, key) => {
      if (!problemReferences.has(key) && hasVersionProblems(reference, processorContext)) {
        problemReferences.set(key, reference)
      }
    }),
  )
  return problemReferences
}

function getFirstReferencesByKey(references: ReadonlyArray<PackageReference>): Map<Key, PackageReference> {
  const referencesByKey = new Map<Key, PackageReference>()
  references.forEach(reference => {
    if (reference.key && !referencesByKey.has(reference.key)) {
      referencesByKey.set(reference.key, reference)
    }
  })
  return referencesByKey
}
