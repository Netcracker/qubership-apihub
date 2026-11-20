import type { PackageReference } from '@netcracker/qubership-apihub-ui-shared/entities/version-references'
import type { VersionProblemProcessorContext } from '@netcracker/qubership-apihub-ui-shared/hooks/versions/versionProblemDetails'

import { getComparisonProblemReferences } from './comparisonProblemReferences'

const PACKAGE_KEY = 'p'

const PROCESSOR_CONTEXT: VersionProblemProcessorContext = { appApiProcessorVersion: '2.0.0' }

const CURRENT: PackageReference = { key: PACKAGE_KEY, version: '2.0' }
const CURRENT_WITH_ERRORS: PackageReference = { ...CURRENT, hasErrors: true }
const CURRENT_WITH_CHANGELOG_ERRORS: PackageReference = { ...CURRENT, changelogHasErrors: true }
const PREVIOUS: PackageReference = { key: PACKAGE_KEY, version: '1.0' }
const PREVIOUS_WITH_ERRORS: PackageReference = { ...PREVIOUS, hasErrors: true }

describe('getComparisonProblemReferences', () => {
  test.each<[string, PackageReference[], PackageReference[], PackageReference | undefined]>([
    ['only the current version has a problem', [CURRENT_WITH_ERRORS], [PREVIOUS], CURRENT_WITH_ERRORS],
    ['only the previous version has a problem', [CURRENT], [PREVIOUS_WITH_ERRORS], PREVIOUS_WITH_ERRORS],
    [
      'both versions have a problem',
      [CURRENT_WITH_CHANGELOG_ERRORS],
      [PREVIOUS_WITH_ERRORS],
      CURRENT_WITH_CHANGELOG_ERRORS,
    ],
    ['neither version has a problem', [CURRENT], [PREVIOUS], undefined],
    ['the package is only in the previous dashboard', [], [PREVIOUS_WITH_ERRORS], PREVIOUS_WITH_ERRORS],
  ])('%s', (_, changedReferences, originReferences, expected) => {
    expect(getComparisonProblemReferences(changedReferences, originReferences, PROCESSOR_CONTEXT).get(PACKAGE_KEY))
      .toBe(expected)
  })
})
