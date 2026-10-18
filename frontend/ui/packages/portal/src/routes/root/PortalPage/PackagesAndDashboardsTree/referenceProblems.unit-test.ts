import type {
  PackageReference,
  VersionReferences,
} from '@netcracker/qubership-apihub-ui-shared/entities/version-references'
import type { VersionProblemProcessorContext } from '@netcracker/qubership-apihub-ui-shared/hooks/versions/versionProblemDetails'

import { getDeletedDescendantRefs, hasReferenceProblems } from './referenceProblems'

const D1 = 'd1@1.0@1'
const D2 = 'd2@1.0@1'
const D3 = 'd3@1.0@1'
const P1 = 'p1@1.0@1'
const P2 = 'p2@1.0@1'

const DELETED_AT = '2026-08-15T10:30:00Z'
const APP_API_PROCESSOR_VERSION = '2.0.0'
const OUTDATED_API_PROCESSOR_VERSION = '1.1.1'

const PROCESSOR_CONTEXT: VersionProblemProcessorContext = { appApiProcessorVersion: APP_API_PROCESSOR_VERSION }
const MIGRATION_CONTEXT: VersionProblemProcessorContext = {
  appApiProcessorVersion: APP_API_PROCESSOR_VERSION,
  migrationInProgress: true,
}

describe('getDeletedDescendantRefs', () => {
  test('marks every ancestor of a deleted reference and none of a reference with errors', () => {
    // D2 is included under both D1 and D3.
    const tree: VersionReferences = {
      references: [
        { packageRef: D1 },
        { packageRef: D3 },
        { packageRef: D2, parentPackageRef: D1 },
        { packageRef: D2, parentPackageRef: D3 },
        { packageRef: P1, parentPackageRef: D2 },
        { packageRef: P2, parentPackageRef: D3 },
      ],
      packages: {
        [D1]: { kind: 'dashboard' },
        [D2]: { kind: 'dashboard' },
        [D3]: { kind: 'dashboard' },
        [P1]: { kind: 'package', deletedAt: DELETED_AT },
        [P2]: { kind: 'package', hasErrors: true },
      },
    }

    expect(getDeletedDescendantRefs(tree)).toEqual(new Set([D1, D2, D3]))
  })
})

describe('hasReferenceProblems', () => {
  test.each<[string, VersionReferences, VersionProblemProcessorContext, boolean]>([
    ['a clean list', nestedPackage({}), PROCESSOR_CONTEXT, false],
    ['a deleted nested reference', nestedPackage({ deletedAt: DELETED_AT }), PROCESSOR_CONTEXT, true],
    ['errors of a nested reference only', nestedPackage({ hasErrors: true }), PROCESSOR_CONTEXT, false],
    ['build errors of a top-level reference', topLevelPackage({ hasErrors: true }), PROCESSOR_CONTEXT, true],
    [
      'changelog errors of a top-level reference',
      topLevelPackage({ changelogHasErrors: true }),
      PROCESSOR_CONTEXT,
      true,
    ],
    [
      'the current api-processor of a top-level reference',
      topLevelPackage({ apiProcessorVersion: APP_API_PROCESSOR_VERSION }),
      PROCESSOR_CONTEXT,
      false,
    ],
    [
      'an outdated api-processor of a top-level reference',
      topLevelPackage({ apiProcessorVersion: OUTDATED_API_PROCESSOR_VERSION }),
      PROCESSOR_CONTEXT,
      true,
    ],
    [
      'an outdated api-processor of a top-level reference during a migration',
      topLevelPackage({ apiProcessorVersion: OUTDATED_API_PROCESSOR_VERSION }),
      MIGRATION_CONTEXT,
      false,
    ],
    [
      'an outdated api-processor of a nested reference only',
      nestedPackage({ apiProcessorVersion: OUTDATED_API_PROCESSOR_VERSION }),
      PROCESSOR_CONTEXT,
      false,
    ],
  ])('returns whether %s is a problem', (_, versionReferences, processorContext, expected) => {
    expect(hasReferenceProblems(versionReferences, processorContext)).toBe(expected)
  })
})

function nestedPackage(flags: PackageReference): VersionReferences {
  return {
    references: [{ packageRef: D1 }, { packageRef: P1, parentPackageRef: D1 }],
    packages: { [D1]: { kind: 'dashboard' }, [P1]: { kind: 'package', ...flags } },
  }
}

function topLevelPackage(flags: PackageReference): VersionReferences {
  return {
    references: [{ packageRef: P1 }],
    packages: { [P1]: { kind: 'package', ...flags } },
  }
}
