import mapValues from 'lodash-es/mapValues'
import { bypass, http, HttpResponse, passthrough } from 'msw'

import type { McpContractsSummaryDto } from '@netcracker/qubership-apihub-ui-shared/entities/contracts-mcp'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { RevisionDto, RevisionsDto } from '@netcracker/qubership-apihub-ui-shared/entities/revisions'
import type { PackageVersionContentDto } from '@netcracker/qubership-apihub-ui-shared/entities/version-contents'
import type {
  PackageReferenceDto,
  UnresolvedReferenceDto,
  VersionReferencesDto,
} from '@netcracker/qubership-apihub-ui-shared/entities/version-references'
import type { PackageVersionDto, PackageVersionsDto } from '@netcracker/qubership-apihub-ui-shared/entities/versions'
import { getMockVersionFlags } from '@netcracker/qubership-apihub-ui-shared/mocks/mock-version-flags'

const MOCK_DELETION: Pick<PackageReferenceDto, 'deletedAt' | 'deletedBy'> = {
  deletedAt: '2026-08-15T10:30:00Z',
  deletedBy: 'System Mock',
}

export const versionHandlers = [
  http.get('*/api/v3/packages/:packageKey/versions/:versionKey', async ({ request, params }) => {
    const versionKey = String(params.versionKey)

    // processor mismatch and build errors
    if (versionKey.includes('errors-processor-mismatch-and-build')) {
      const originalResponse = await fetch(bypass(request))
      if (!originalResponse.ok) {
        return originalResponse
      }
      const realData: PackageVersionContentDto = await originalResponse.json()
      return HttpResponse.json<PackageVersionContentDto>({
        ...realData,
        apiProcessorVersion: '1.1.1',
        hasErrors: true,
      })
    }

    // api-processor version mismatch
    if (versionKey.includes('errors-processor-mismatch')) {
      const originalResponse = await fetch(bypass(request))
      if (!originalResponse.ok) {
        return originalResponse
      }
      const realData: PackageVersionContentDto = await originalResponse.json()
      return HttpResponse.json<PackageVersionContentDto>({
        ...realData,
        apiProcessorVersion: '1.1.1',
      })
    }

    // build errors and comparison errors
    if (versionKey.includes('errors-build-and-comparison')) {
      const originalResponse = await fetch(bypass(request))
      if (!originalResponse.ok) {
        return originalResponse
      }
      const realData: PackageVersionContentDto = await originalResponse.json()
      return HttpResponse.json<PackageVersionContentDto>({
        ...realData,
        hasErrors: true,
        changelogHasErrors: true,
      })
    }

    // build errors only
    if (versionKey.includes('errors-build')) {
      const originalResponse = await fetch(bypass(request))
      if (!originalResponse.ok) {
        return originalResponse
      }
      const realData: PackageVersionContentDto = await originalResponse.json()
      return HttpResponse.json<PackageVersionContentDto>({
        ...realData,
        hasErrors: true,
        changelogHasErrors: false,
      })
    }

    // comparison errors only
    if (versionKey.includes('errors-comparison')) {
      const originalResponse = await fetch(bypass(request))
      if (!originalResponse.ok) {
        return originalResponse
      }
      const realData: PackageVersionContentDto = await originalResponse.json()
      return HttpResponse.json<PackageVersionContentDto>({
        ...realData,
        hasErrors: false,
        changelogHasErrors: true,
      })
    }

    if (versionKey.includes('errors-documents')) {
      const originalResponse = await fetch(bypass(request))
      if (!originalResponse.ok) {
        return originalResponse
      }
      const realData: PackageVersionContentDto = await originalResponse.json()
      return HttpResponse.json<PackageVersionContentDto>({
        ...realData,
        hasErrors: true,
      })
    }

    // api and contract type errors for selectors, tooltips, and comparison
    if (versionKey.includes('errors-api-types')) {
      const originalResponse = await fetch(bypass(request))
      if (!originalResponse.ok) {
        return originalResponse
      }
      const realData: PackageVersionContentDto = await originalResponse.json()
      return HttpResponse.json<PackageVersionContentDto>(
        patchApiTypeErrorsContent(realData, versionKey),
      )
    }

    return passthrough()
  }),

  http.get('*/api/v2/packages/:packageKey/versions/:versionKey/:apiType/operations', ({ params }) => {
    const versionKey = String(params.versionKey)
    if (isApiTypesEmptyListVersion(versionKey)) {
      return HttpResponse.json({ operations: [], packages: {} })
    }
    return passthrough()
  }),

  http.get('*/api/v2/packages/:packageKey/versions/:versionKey/:apiType/deprecated', ({ params }) => {
    const versionKey = String(params.versionKey)
    if (isApiTypesEmptyListVersion(versionKey)) {
      return HttpResponse.json({ operations: [], packages: {} })
    }
    return passthrough()
  }),

  http.get('*/api/v1/packages/:packageKey/versions/:versionKey/ddl/entities', ({ params }) => {
    const versionKey = String(params.versionKey)
    if (isApiTypesEmptyListVersion(versionKey)) {
      return HttpResponse.json({ entities: [], packages: {} })
    }
    return passthrough()
  }),

  http.get('*/api/v1/packages/:packageKey/versions/:versionKey/mcp/:apiEntity', ({ params }) => {
    const versionKey = String(params.versionKey)
    if (isApiTypesEmptyListVersion(versionKey)) {
      return HttpResponse.json({ entities: [], packages: {} })
    }
    return passthrough()
  }),

  http.get('*/api/v3/packages/:packageKey/versions', async ({ request }) => {
    const originalResponse = await fetch(bypass(request))
    if (!originalResponse.ok) {
      return originalResponse
    }

    // json() consumes the body; clone keeps original bytes/headers when nothing is patched.
    const unmodifiedResponse = originalResponse.clone()
    const realData: PackageVersionsDto = await originalResponse.json()
    if (!realData.versions?.length) {
      return unmodifiedResponse
    }

    let modified = false
    const versions = realData.versions.map((version: PackageVersionDto): PackageVersionDto => {
      const versionFlags = getMockVersionFlags(version.version)
      if (versionFlags) {
        modified = true
        return { ...version, ...versionFlags }
      }

      return version
    })

    return modified
      ? HttpResponse.json<PackageVersionsDto>({ ...realData, versions })
      : unmodifiedResponse
  }),

  http.get('*/api/v3/packages/:packageKey/versions/:versionKey/revisions', async ({ request, params }) => {
    const versionKey = params.versionKey as string | undefined

    if (!versionKey?.includes('errors-revisions')) {
      return passthrough()
    }

    const originalResponse = await fetch(bypass(request))
    if (!originalResponse.ok) {
      return originalResponse
    }

    const unmodifiedResponse = originalResponse.clone()
    const realData: RevisionsDto = await originalResponse.json()
    if (!realData.revisions?.length) {
      return unmodifiedResponse
    }

    let modified = false
    const revisions = realData.revisions.map((revision: RevisionDto): RevisionDto => {
      // processor mismatch and build errors
      if (revision.revision === 1) {
        modified = true
        return { ...revision, apiProcessorVersion: '1.1.1', hasErrors: true }
      }
      // api-processor version mismatch
      if (revision.revision === 2) {
        modified = true
        return { ...revision, apiProcessorVersion: '1.1.1' }
      }
      // build errors and comparison errors
      if (revision.revision === 3) {
        modified = true
        return { ...revision, hasErrors: true, changelogHasErrors: true }
      }
      // build errors only
      if (revision.revision === 4) {
        modified = true
        return { ...revision, hasErrors: true, changelogHasErrors: false }
      }
      // comparison errors only
      if (revision.revision === 5) {
        modified = true
        return { ...revision, hasErrors: false, changelogHasErrors: true }
      }

      return revision
    })

    return modified
      ? HttpResponse.json<RevisionsDto>({ ...realData, revisions })
      : unmodifiedResponse
  }),

  http.get('*/api/v3/packages/:packageKey/versions/:versionKey/references', async ({ request, params }) => {
    const versionKey = String(params.versionKey)
    const originalResponse = await fetch(bypass(request))
    if (!originalResponse.ok) {
      return originalResponse
    }

    const realData: VersionReferencesDto = await originalResponse.json()
    const deletedRefs = getMockDeletedRefs(versionKey, realData.references ?? [])
    return HttpResponse.json<VersionReferencesDto>({
      ...realData,
      packages: mapValues(realData.packages, (packageReference, refKey) => ({
        ...packageReference,
        ...getMockVersionFlags(packageReference.version ?? ''),
        ...(deletedRefs.includes(refKey) && MOCK_DELETION),
      })),
    })
  }),
]

function patchApiTypeErrorsContent(
  realData: PackageVersionContentDto,
  versionKey: string,
): PackageVersionContentDto {
  const isVersionA = versionKey.includes('-after')

  const isTotalError = versionKey.includes('errors-api-types-total')
  const isMixed = !isTotalError && !versionKey.includes('errors-api-types-partial')

  return {
    ...realData,
    operationTypes: realData.operationTypes?.map(operationType => {
      const isErrorType = isVersionA
        ? (operationType.apiType === 'rest' || operationType.apiType === 'asyncapi')
        : (operationType.apiType === 'graphql')

      if (!isErrorType) {
        return { ...operationType, hasErrors: false }
      }

      const hasZeroOperations = isTotalError || (isMixed && operationType.apiType === 'asyncapi')

      return {
        ...operationType,
        hasErrors: true,
        ...(hasZeroOperations && { operationsCount: 0 }),
      }
    }),
    contractsSummary: realData.contractsSummary
      ? {
        ...realData.contractsSummary,
        ...(realData.contractsSummary.ddl && {
          ddl: {
            ...realData.contractsSummary.ddl,
            hasErrors: isVersionA,
            ...(isVersionA && isTotalError && { tablesCount: 0 }),
          },
        }),
        ...(realData.contractsSummary.mcp && {
          mcp: patchMcpContractsSummaryDto(
            realData.contractsSummary.mcp,
            isVersionA,
            isVersionA && (isTotalError || isMixed),
          ),
        }),
      }
      : undefined,
  }
}

// Marks the first child of the first top-level reference and the second top-level reference as deleted.
function getMockDeletedRefs(versionKey: string, references: ReadonlyArray<UnresolvedReferenceDto>): Key[] {
  if (!versionKey.includes('errors-deleted-reference')) {
    return []
  }
  const [firstReference, secondReference] = references.filter(({ parentPackageRef }) => !parentPackageRef)
  const firstChildReference = firstReference &&
    references.find(({ parentPackageRef }) => parentPackageRef === firstReference.packageRef)
  return [firstChildReference?.packageRef, secondReference?.packageRef]
    .filter((ref): ref is Key => ref !== undefined)
}

function isApiTypesEmptyListVersion(versionKey: string): boolean {
  return versionKey.includes('errors-api-types-total')
}

function patchMcpContractsSummaryDto(
  mcp: McpContractsSummaryDto,
  hasErrors: boolean,
  resetEntityCounts: boolean,
): McpContractsSummaryDto {
  return Object.fromEntries(
    Object.entries(mcp).map(([endpoint, summary]) => [
      endpoint,
      {
        ...summary,
        hasErrors,
        ...(resetEntityCounts && {
          toolsCount: 0,
          promptsCount: 0,
          resourcesCount: 0,
        }),
      },
    ]),
  )
}
