import { DASHBOARD_KIND, PACKAGE_KIND, type PackageKind } from '../../entities/packages'
import { getApiProcessorMismatchTooltip, PUBLICATION_ERROR_MESSAGES } from '../../utils/publicationErrorMessages'
import {
  resolveVersionProblemDetails,
  VERSION_PROBLEM_DIALOG_SURFACE,
  VERSION_PROBLEM_KIND,
} from './versionProblemDetails'

const MSG = PUBLICATION_ERROR_MESSAGES
const SURFACE = VERSION_PROBLEM_DIALOG_SURFACE
const AP = {
  versionKey: '1.0.0',
  apiProcessorVersion: '1.0.0',
  appApiProcessorVersion: '2.0.0',
} as const

describe('resolveVersionProblemDetails', () => {
  it('returns no problems when no flags are set', () => {
    expect(resolveVersionProblemDetails({})).toEqual({ hasProblems: false, isBlocking: false })
  })

  it('prefers processor mismatch and does not block without a surface', () => {
    const result = resolveVersionProblemDetails({
      ...AP,
      hasErrors: true,
      changelogHasErrors: true,
      deletedAt: '2024-01-01',
    })

    expect(result).toMatchObject({
      hasProblems: true,
      isBlocking: false,
      activeProblemKind: VERSION_PROBLEM_KIND.PROCESSOR_MISMATCH,
      tooltip: getApiProcessorMismatchTooltip('1.0.0'),
    })
    expect(result.formHelperText).toBeUndefined()
  })

  it('suppresses processor mismatch during migration', () => {
    expect(resolveVersionProblemDetails({
      migrationInProgress: true,
      hasErrors: true,
    })).toMatchObject({
      activeProblemKind: VERSION_PROBLEM_KIND.BUILD_ERRORS,
      tooltip: MSG.packageVersion.version,
      isBlocking: false,
    })
  })

  it.each(
    [
      [PACKAGE_KIND, MSG.reference.packageMissing],
      [DASHBOARD_KIND, MSG.reference.dashboardMissing],
    ] as const,
  )('deleted reference tooltip for kind=%s', (kind, tooltip) => {
    expect(resolveVersionProblemDetails({ deletedAt: '2024-01-01', kind: kind })).toEqual({
      hasProblems: true,
      isBlocking: false,
      activeProblemKind: VERSION_PROBLEM_KIND.DELETED_REFERENCE,
      tooltip: tooltip,
    })
  })

  it.each(
    [
      [PACKAGE_KIND, { hasErrors: true }, MSG.packageVersion.version, VERSION_PROBLEM_KIND.BUILD_ERRORS],
      [
        PACKAGE_KIND,
        { changelogHasErrors: true },
        MSG.packageVersion.changelog,
        VERSION_PROBLEM_KIND.COMPARISON_ERRORS,
      ],
      [
        PACKAGE_KIND,
        { hasErrors: true, changelogHasErrors: true },
        MSG.packageVersion.versionChangelog,
        VERSION_PROBLEM_KIND.BUILD_ERRORS,
      ],
      [
        DASHBOARD_KIND,
        { hasErrors: true, changelogHasErrors: true },
        MSG.dashboardVersion.versionChangelog,
        VERSION_PROBLEM_KIND.BUILD_ERRORS,
      ],
    ] as const,
  )('version tooltips without surface (kind=%s)', (kind: PackageKind, params, tooltip, activeProblemKind) => {
    expect(resolveVersionProblemDetails({ ...params, kind: kind })).toEqual({
      hasProblems: true,
      isBlocking: false,
      activeProblemKind: activeProblemKind,
      tooltip: tooltip,
    })
  })

  it.each(
    [
      [SURFACE.COMPARE_CURRENT_VERSION, AP, {
        isBlocking: true,
        formHelperText: MSG.dialog.currentVersionUnsound,
        activeProblemKind: VERSION_PROBLEM_KIND.PROCESSOR_MISMATCH,
      }],
      [SURFACE.COMPARE_CURRENT_REVISION, AP, {
        isBlocking: true,
        formHelperText: MSG.dialog.currentRevisionUnsound,
        activeProblemKind: VERSION_PROBLEM_KIND.PROCESSOR_MISMATCH,
      }],
      [SURFACE.COMPARE_PREVIOUS_VERSION, AP, {
        isBlocking: true,
        formHelperText: MSG.dialog.previousVersionUnsound,
        activeProblemKind: VERSION_PROBLEM_KIND.PROCESSOR_MISMATCH,
      }],
      [SURFACE.ADD_TO_DASHBOARD, AP, {
        isBlocking: true,
        formHelperText: MSG.dialog.dashboardAddUnsound,
        activeProblemKind: VERSION_PROBLEM_KIND.PROCESSOR_MISMATCH,
      }],
      [SURFACE.COMPARE_CURRENT_VERSION, { hasErrors: true }, {
        isBlocking: false,
        activeProblemKind: VERSION_PROBLEM_KIND.BUILD_ERRORS,
      }],
      [SURFACE.COMPARE_CURRENT_REVISION, { hasErrors: true }, {
        isBlocking: false,
        activeProblemKind: VERSION_PROBLEM_KIND.BUILD_ERRORS,
      }],
      [SURFACE.COMPARE_PREVIOUS_VERSION, { hasErrors: true }, {
        isBlocking: true,
        formHelperText: MSG.dialog.previousVersionUnsound,
        activeProblemKind: VERSION_PROBLEM_KIND.BUILD_ERRORS,
      }],
      [SURFACE.COMPARE_PREVIOUS_VERSION, { changelogHasErrors: true }, {
        isBlocking: true,
        formHelperText: MSG.dialog.previousVersionUnsound,
        activeProblemKind: VERSION_PROBLEM_KIND.COMPARISON_ERRORS,
      }],
      [SURFACE.PUBLISH_PREVIOUS_VERSION, { changelogHasErrors: true }, {
        isBlocking: true,
        formHelperText: MSG.dialog.previousVersionUnsound,
        activeProblemKind: VERSION_PROBLEM_KIND.COMPARISON_ERRORS,
      }],
      [SURFACE.COMPARE_PREVIOUS_REVISION, { hasErrors: true }, {
        isBlocking: true,
        formHelperText: MSG.dialog.previousRevisionUnsound,
        activeProblemKind: VERSION_PROBLEM_KIND.BUILD_ERRORS,
      }],
      [SURFACE.COPY_SOURCE_VERSION, { hasErrors: true }, {
        isBlocking: true,
        formHelperText: MSG.dialog.sourceVersionUnsound,
        activeProblemKind: VERSION_PROBLEM_KIND.BUILD_ERRORS,
      }],
      [SURFACE.ADD_TO_DASHBOARD, { hasErrors: true }, {
        isBlocking: false,
        activeProblemKind: VERSION_PROBLEM_KIND.BUILD_ERRORS,
      }],
      [SURFACE.EDIT_STATUS, { hasErrors: true }, {
        isBlocking: true,
        formHelperText: MSG.dialog.releasePromotionRefused,
        activeProblemKind: VERSION_PROBLEM_KIND.BUILD_ERRORS,
      }],
      [SURFACE.EDIT_STATUS, { changelogHasErrors: true }, {
        isBlocking: true,
        formHelperText: MSG.dialog.releasePromotionRefused,
        activeProblemKind: VERSION_PROBLEM_KIND.COMPARISON_ERRORS,
      }],
      [SURFACE.ADD_TO_DASHBOARD, { deletedAt: '2024-01-01', kind: PACKAGE_KIND }, {
        isBlocking: false,
        activeProblemKind: VERSION_PROBLEM_KIND.DELETED_REFERENCE,
      }],
    ] as const,
  )('dialog surface %s', (surface, params, expected) => {
    const result = resolveVersionProblemDetails({ ...params, surface: surface })

    expect(result).toMatchObject({ hasProblems: true, ...expected })
    if (!('formHelperText' in expected)) {
      expect(result.formHelperText).toBeUndefined()
    }
  })
})
