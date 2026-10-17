import type { PackageKey, VersionKey } from '../../entities/keys'
import { DASHBOARD_KIND, PACKAGE_KIND, type PackageKind } from '../../entities/packages'
import type { PackageReference } from '../../entities/version-references'
import { getApiProcessorMismatchTooltip, PUBLICATION_ERROR_MESSAGES } from '../../utils/publicationErrorMessages'
import { Apps, type AppTypeApiHub } from '../../utils/version-info'

export const VERSION_PROBLEM_KIND = {
  PROCESSOR_MISMATCH: 'processor-mismatch',
  DELETED_REFERENCE: 'deleted-reference',
  BUILD_ERRORS: 'build-errors',
  COMPARISON_ERRORS: 'comparison-errors',
} as const

export type VersionProblemKind = typeof VERSION_PROBLEM_KIND[keyof typeof VERSION_PROBLEM_KIND]

export const VERSION_PROBLEM_DIALOG_SURFACE = {
  COMPARE_CURRENT_VERSION: 'compare-current-version',
  COMPARE_PREVIOUS_VERSION: 'compare-previous-version',
  COMPARE_CURRENT_REVISION: 'compare-current-revision',
  COMPARE_PREVIOUS_REVISION: 'compare-previous-revision',
  PUBLISH_PREVIOUS_VERSION: 'publish-previous-version',
  COPY_SOURCE_VERSION: 'copy-source-version',
  ADD_TO_DASHBOARD: 'add-to-dashboard',
  EDIT_STATUS: 'edit-status',
} as const

export type VersionProblemDialogSurface =
  typeof VERSION_PROBLEM_DIALOG_SURFACE[keyof typeof VERSION_PROBLEM_DIALOG_SURFACE]

export type UseVersionProblemDetailsParams = {
  packageKey?: PackageKey
  versionKey?: VersionKey
  hasErrors?: boolean
  changelogHasErrors?: boolean
  deletedAt?: string
  kind?: PackageKind
  apiProcessorVersion?: string
  surface?: VersionProblemDialogSurface
  /** Selects the tooltip messages of the app that shows the version; defaults to the portal. */
  app?: AppTypeApiHub
}

export type VersionProblemDetails = {
  hasProblems: boolean
  activeProblemKind?: VersionProblemKind
  tooltip?: string
  isBlocking: boolean
  formHelperText?: string
}

export type VersionProblemProcessorContext = {
  appApiProcessorVersion?: string
  migrationInProgress?: boolean
}

type ResolveVersionProblemDetailsParams = UseVersionProblemDetailsParams & VersionProblemProcessorContext

type VersionProblemCore = {
  hasProblems: boolean
  activeProblemKind?: VersionProblemKind
  tooltip?: string
}

type VersionProblemDialogView = {
  isBlocking: boolean
  formHelperText?: string
}

type VersionProblemDialogRule = {
  formHelperText: string
  blocksVersionErrors: boolean
}

type VersionProblemMessageSet = {
  build: string
  comparison: string
  buildAndComparison: string
}

const PACKAGE_ERROR_MESSAGES: VersionProblemMessageSet = {
  build: PUBLICATION_ERROR_MESSAGES.packageVersion.version,
  comparison: PUBLICATION_ERROR_MESSAGES.packageVersion.changelog,
  buildAndComparison: PUBLICATION_ERROR_MESSAGES.packageVersion.versionChangelog,
}

const AGENT_PACKAGE_ERROR_MESSAGES: VersionProblemMessageSet = {
  build: PUBLICATION_ERROR_MESSAGES.agent.version,
  comparison: PUBLICATION_ERROR_MESSAGES.packageVersion.changelog,
  buildAndComparison: PUBLICATION_ERROR_MESSAGES.agent.versionChangelog,
}

const DASHBOARD_ERROR_MESSAGES: VersionProblemMessageSet = {
  build: PUBLICATION_ERROR_MESSAGES.dashboardVersion.version,
  comparison: PUBLICATION_ERROR_MESSAGES.dashboardVersion.changelog,
  buildAndComparison: PUBLICATION_ERROR_MESSAGES.dashboardVersion.versionChangelog,
}

const NO_VERSION_PROBLEMS: VersionProblemCore = {
  hasProblems: false,
}

const NO_DIALOG_PROBLEM_VIEW: VersionProblemDialogView = {
  isBlocking: false,
}

const VERSION_PROBLEM_DIALOG_RULES: Record<VersionProblemDialogSurface, VersionProblemDialogRule> = {
  [VERSION_PROBLEM_DIALOG_SURFACE.COMPARE_CURRENT_VERSION]: {
    formHelperText: PUBLICATION_ERROR_MESSAGES.dialog.currentVersionUnsound,
    blocksVersionErrors: false,
  },
  [VERSION_PROBLEM_DIALOG_SURFACE.COMPARE_CURRENT_REVISION]: {
    formHelperText: PUBLICATION_ERROR_MESSAGES.dialog.currentRevisionUnsound,
    blocksVersionErrors: false,
  },
  [VERSION_PROBLEM_DIALOG_SURFACE.ADD_TO_DASHBOARD]: {
    formHelperText: PUBLICATION_ERROR_MESSAGES.dialog.dashboardAddUnsound,
    blocksVersionErrors: false,
  },
  [VERSION_PROBLEM_DIALOG_SURFACE.COMPARE_PREVIOUS_VERSION]: {
    formHelperText: PUBLICATION_ERROR_MESSAGES.dialog.previousVersionUnsound,
    blocksVersionErrors: true,
  },
  [VERSION_PROBLEM_DIALOG_SURFACE.PUBLISH_PREVIOUS_VERSION]: {
    formHelperText: PUBLICATION_ERROR_MESSAGES.dialog.previousVersionUnsound,
    blocksVersionErrors: true,
  },
  [VERSION_PROBLEM_DIALOG_SURFACE.COMPARE_PREVIOUS_REVISION]: {
    formHelperText: PUBLICATION_ERROR_MESSAGES.dialog.previousRevisionUnsound,
    blocksVersionErrors: true,
  },
  [VERSION_PROBLEM_DIALOG_SURFACE.COPY_SOURCE_VERSION]: {
    formHelperText: PUBLICATION_ERROR_MESSAGES.dialog.sourceVersionUnsound,
    blocksVersionErrors: true,
  },
  [VERSION_PROBLEM_DIALOG_SURFACE.EDIT_STATUS]: {
    formHelperText: PUBLICATION_ERROR_MESSAGES.dialog.releasePromotionRefused,
    blocksVersionErrors: true,
  },
}

export function resolveVersionProblemDetails(
  params: ResolveVersionProblemDetailsParams,
): VersionProblemDetails {
  const problem = resolveVersionProblemCore(params)
  const dialogView = params.surface
    ? toVersionProblemDialogView(problem, params.surface)
    : NO_DIALOG_PROBLEM_VIEW

  return {
    ...problem,
    ...dialogView,
  }
}

/**
 * Reports errors, changelog errors, or an outdated api-processor of the referenced version. A deleted reference is
 * left to the caller.
 */
export function hasVersionProblems(
  { hasErrors, changelogHasErrors, apiProcessorVersion, kind }: PackageReference,
  processorContext: VersionProblemProcessorContext,
): boolean {
  return resolveVersionProblemDetails({
    ...processorContext,
    hasErrors,
    changelogHasErrors,
    apiProcessorVersion,
    kind,
  }).hasProblems
}

function resolveVersionProblemCore(
  params: ResolveVersionProblemDetailsParams,
): VersionProblemCore {
  const processorProblem = resolveProcessorMismatch(params)
  if (processorProblem) {
    return processorProblem
  }

  if (params.deletedAt) {
    return {
      hasProblems: true,
      activeProblemKind: VERSION_PROBLEM_KIND.DELETED_REFERENCE,
      tooltip: params.kind === PACKAGE_KIND
        ? PUBLICATION_ERROR_MESSAGES.reference.packageMissing
        : PUBLICATION_ERROR_MESSAGES.reference.dashboardMissing,
    }
  }

  const buildAndComparisonProblem = resolveBuildAndComparisonProblems(params)
  if (buildAndComparisonProblem) {
    return buildAndComparisonProblem
  }

  return NO_VERSION_PROBLEMS
}

function toVersionProblemDialogView(
  { activeProblemKind }: VersionProblemCore,
  surface: VersionProblemDialogSurface,
): VersionProblemDialogView {
  const { formHelperText, blocksVersionErrors } = VERSION_PROBLEM_DIALOG_RULES[surface]
  const hasVersionErrors = activeProblemKind === VERSION_PROBLEM_KIND.BUILD_ERRORS ||
    activeProblemKind === VERSION_PROBLEM_KIND.COMPARISON_ERRORS
  const isBlocking = activeProblemKind === VERSION_PROBLEM_KIND.PROCESSOR_MISMATCH ||
    (blocksVersionErrors && hasVersionErrors)

  if (!isBlocking) {
    return NO_DIALOG_PROBLEM_VIEW
  }

  return {
    isBlocking: true,
    formHelperText: formHelperText,
  }
}

function resolveBuildAndComparisonProblems(
  params: ResolveVersionProblemDetailsParams,
): VersionProblemCore | undefined {
  const hasErrors = params.hasErrors ?? false
  const changelogHasErrors = params.changelogHasErrors ?? false

  if (!hasErrors && !changelogHasErrors) {
    return undefined
  }

  const versionErrorMessageSet = resolveVersionErrorMessageSet(params)

  if (hasErrors && changelogHasErrors) {
    return {
      hasProblems: true,
      activeProblemKind: VERSION_PROBLEM_KIND.BUILD_ERRORS,
      tooltip: versionErrorMessageSet.buildAndComparison,
    }
  }

  if (hasErrors) {
    return {
      hasProblems: true,
      activeProblemKind: VERSION_PROBLEM_KIND.BUILD_ERRORS,
      tooltip: versionErrorMessageSet.build,
    }
  }

  return {
    hasProblems: true,
    activeProblemKind: VERSION_PROBLEM_KIND.COMPARISON_ERRORS,
    tooltip: versionErrorMessageSet.comparison,
  }
}

function resolveVersionErrorMessageSet({ kind, app }: ResolveVersionProblemDetailsParams): VersionProblemMessageSet {
  if (kind === DASHBOARD_KIND) {
    return DASHBOARD_ERROR_MESSAGES
  }
  return app === Apps.agent ? AGENT_PACKAGE_ERROR_MESSAGES : PACKAGE_ERROR_MESSAGES
}

function resolveProcessorMismatch(
  params: ResolveVersionProblemDetailsParams,
): VersionProblemCore | undefined {
  const {
    apiProcessorVersion,
    appApiProcessorVersion,
    migrationInProgress,
    versionKey,
  } = params

  if (migrationInProgress) {
    return undefined
  }

  if (!apiProcessorVersion || !appApiProcessorVersion) {
    return undefined
  }

  if (apiProcessorVersion === appApiProcessorVersion) {
    return undefined
  }

  return {
    hasProblems: true,
    activeProblemKind: VERSION_PROBLEM_KIND.PROCESSOR_MISMATCH,
    tooltip: getApiProcessorMismatchTooltip(versionKey),
  }
}
