import mapValues from 'lodash-es/mapValues'
import { http, passthrough } from 'msw'

import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { RevisionsDto } from '@netcracker/qubership-apihub-ui-shared/entities/revisions'
import type { PackageVersionContentDto } from '@netcracker/qubership-apihub-ui-shared/entities/version-contents'
import type {
  PackageReferenceDto,
  UnresolvedReferenceDto,
  VersionReferencesDto,
} from '@netcracker/qubership-apihub-ui-shared/entities/version-references'
import type { PackageVersionsDto } from '@netcracker/qubership-apihub-ui-shared/entities/versions'
import {
  getMockRevisionFlags,
  getMockVersionFlags,
} from '@netcracker/qubership-apihub-ui-shared/mocks/mock-version-flags'
import { patchJsonResponse } from '@netcracker/qubership-apihub-ui-shared/mocks/patch-json-response'

const MOCK_REVISIONS_MARKER = 'errors-revisions'
const MOCK_DELETED_REFERENCE_MARKER = 'errors-deleted-reference'

const MOCK_DELETION: Pick<PackageReferenceDto, 'deletedAt' | 'deletedBy'> = {
  deletedAt: '2026-08-15T10:30:00Z',
  deletedBy: 'System Mock',
}

export const versionHandlers = [
  http.get('*/api/v3/packages/:packageKey/versions/:versionKey', ({ request, params }) => {
    const flags = getMockVersionFlags(String(params.versionKey))
    if (!flags) {
      return passthrough()
    }
    return patchJsonResponse<PackageVersionContentDto>(request, content => ({ ...content, ...flags }))
  }),

  http.get('*/api/v3/packages/:packageKey/versions', ({ request }) => (
    patchJsonResponse<PackageVersionsDto>(request, data => ({
      ...data,
      versions: data.versions.map(version => ({ ...version, ...getMockVersionFlags(version.version) })),
    }))
  )),

  http.get('*/api/v3/packages/:packageKey/versions/:versionKey/revisions', ({ request, params }) => {
    if (!String(params.versionKey).includes(MOCK_REVISIONS_MARKER)) {
      return passthrough()
    }
    return patchJsonResponse<RevisionsDto>(request, data => ({
      ...data,
      revisions: data.revisions.map(revision => ({ ...revision, ...getMockRevisionFlags(revision.revision) })),
    }))
  }),

  http.get('*/api/v3/packages/:packageKey/versions/:versionKey/references', ({ request, params }) => (
    patchJsonResponse<VersionReferencesDto>(request, data => {
      const deletedRefs = getMockDeletedRefs(String(params.versionKey), data.references ?? [])
      return {
        ...data,
        packages: mapValues(data.packages, (packageReference, refKey) => ({
          ...packageReference,
          ...getMockVersionFlags(packageReference.version ?? ''),
          ...(deletedRefs.includes(refKey) && MOCK_DELETION),
        })),
      }
    })
  )),
]

// Marks the first child of the first top-level reference and the second top-level reference as deleted.
function getMockDeletedRefs(versionKey: string, references: ReadonlyArray<UnresolvedReferenceDto>): Key[] {
  if (!versionKey.includes(MOCK_DELETED_REFERENCE_MARKER)) {
    return []
  }
  const [firstReference, secondReference] = references.filter(({ parentPackageRef }) => !parentPackageRef)
  const firstChildReference = firstReference &&
    references.find(({ parentPackageRef }) => parentPackageRef === firstReference.packageRef)
  return [firstChildReference?.packageRef, secondReference?.packageRef]
    .filter((ref): ref is Key => ref !== undefined)
}
