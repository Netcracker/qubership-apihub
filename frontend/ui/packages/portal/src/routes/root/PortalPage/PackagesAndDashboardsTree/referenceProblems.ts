import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type {
  UnresolvedReference,
  VersionReferences,
} from '@netcracker/qubership-apihub-ui-shared/entities/version-references'
import {
  hasVersionProblems,
  type VersionProblemProcessorContext,
} from '@netcracker/qubership-apihub-ui-shared/hooks/versions/versionProblemDetails'

/**
 * Reports a deleted reference at any depth, or a problem of a top-level reference version: errors, changelog errors,
 * or an outdated api-processor. The backend already sets `hasErrors` of a dashboard when one of its non-excluded
 * references has errors or changelog errors.
 */
export function hasReferenceProblems(
  versionReferences: VersionReferences,
  processorContext: VersionProblemProcessorContext,
): boolean {
  const { references = [], packages = {} } = versionReferences
  return hasDeletedReferences(versionReferences) || references.some(({ packageRef, parentPackageRef }) => {
    const packageReference = packageRef ? packages[packageRef] : undefined
    return !parentPackageRef && packageReference !== undefined &&
      hasVersionProblems(packageReference, processorContext)
  })
}

export function hasDeletedReferences(versionReferences: VersionReferences): boolean {
  return getDeletedReferences(versionReferences).length > 0
}

export function getDeletedDescendantRefs(versionReferences: VersionReferences): ReadonlySet<Key> {
  const parentRefsByRef = getParentRefsByRef(versionReferences.references ?? [])
  const markedRefs = new Set<Key>()
  getDeletedReferences(versionReferences).forEach(({ parentPackageRef }) => {
    if (parentPackageRef) {
      markAncestors(parentPackageRef, parentRefsByRef, markedRefs)
    }
  })
  return markedRefs
}

function getDeletedReferences({ references = [], packages = {} }: VersionReferences): UnresolvedReference[] {
  return references.filter(({ packageRef }) => !!packageRef && !!packages[packageRef]?.deletedAt)
}

function getParentRefsByRef(references: ReadonlyArray<UnresolvedReference>): Map<Key, Key[]> {
  const parentRefsByRef = new Map<Key, Key[]>()
  references.forEach(({ packageRef, parentPackageRef }) => {
    if (packageRef && parentPackageRef) {
      parentRefsByRef.set(packageRef, [...(parentRefsByRef.get(packageRef) ?? []), parentPackageRef])
    }
  })
  return parentRefsByRef
}

function markAncestors(
  parentPackageRef: Key,
  parentRefsByRef: ReadonlyMap<Key, Key[]>,
  markedRefs: Set<Key>,
): void {
  // A marked reference already has its ancestors marked, so the walk stops there. This also ends the walk when one
  // dashboard version is included under several parents.
  const pendingRefs = [parentPackageRef]
  for (let ref = pendingRefs.pop(); ref !== undefined; ref = pendingRefs.pop()) {
    if (!markedRefs.has(ref)) {
      markedRefs.add(ref)
      pendingRefs.push(...(parentRefsByRef.get(ref) ?? []))
    }
  }
}
