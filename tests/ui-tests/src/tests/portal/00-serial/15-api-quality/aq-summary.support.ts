/* eslint-disable ui-testing/no-browser-commands-in-tests */
import { test } from '@fixtures'
import type { Page } from '@playwright/test'
import { LintRulesetApiTypes, LintRulesetLinters, LintRulesetStatuses, type RulesetWithFile } from '@portal/entities'
import type { ApihubTestDataManager, LintRulesetsTestDataManager } from '@services/test-data-manager'
import { TestFile } from '@shared/entities'
import { ALIAS_PREFIX } from '@test-data/prefixes'
import type { Version } from '@test-data/props'
import { Package } from '@test-data/props'
import { HOOK_PUBLISH_TIMEOUT } from '@test-setup'
import path from 'node:path'
import { FILE_GRAPHQL, G_AQ, PATH_API_QUALITY_RULESETS, PATH_API_QUALITY_SPECS } from './aq-shared.support'

/**
 * Ruleset file used to generate deterministic validation results for Summary tab tests.
 */
export const FILE_SUMMARY_RULESET = new TestFile(path.join(PATH_API_QUALITY_RULESETS, 'aq-summary-ruleset.yaml'), {
  yamlString: 'rules:',
})

/**
 * Minimal ruleset file used as an "alternate" ruleset to build activation history.
 */
export const FILE_SIMPLE_RULESET = new TestFile(path.join(PATH_API_QUALITY_RULESETS, 'aq-rm-simple-ruleset.yaml'), {
  yamlString: 'rules:',
})

/**
 * OAS 3.0 spec used in Summary tab tests.
 */
export const FILE_SUMMARY_OAS30 = new TestFile(path.join(PATH_API_QUALITY_SPECS, 'aq-summary-oas30.yaml'))

/**
 * OAS 3.1 spec used in Summary tab tests.
 */
export const FILE_SUMMARY_OAS31 = new TestFile(path.join(PATH_API_QUALITY_SPECS, 'aq-summary-oas31.yaml'))

/**
 * Placeholder message for "Not validated yet" state.
 */
export const MSG_NO_VALIDATION_RESULTS = 'No validation results.'

/**
 * Placeholder message for "Checking validation status..." (loading) state.
 */
export const MSG_CHECKING_VALIDATION = 'Checking validation status...'

/**
 * Placeholder message for "Validation is in progress" state.
 */
export const MSG_VALIDATION_IN_PROGRESS = 'Validation is in progress, please wait...'

/**
 * Expected issue counters for a single-document version (initial state).
 */
export const ISSUE_COUNTS_INITIAL = {
  error: '1',
  warning: '1',
  info: '1',
  hint: '1',
} as const

/**
 * Expected issue counters for a single-document version after a ruleset change.
 */
export const ISSUE_COUNTS_CHANGED = {
  error: '0',
  warning: '1',
  info: '0',
  hint: '0',
} as const

/**
 * Expected aggregated issue counters for a multi-document version (initial state).
 */
export const MULTI_DOC_ISSUE_COUNTS_INITIAL = {
  error: '2',
  warning: '2',
  info: '2',
  hint: '2',
} as const

/**
 * Expected aggregated issue counters for a multi-document version after a ruleset change.
 */
export const MULTI_DOC_ISSUE_COUNTS_CHANGED = {
  error: '1',
  warning: '2',
  info: '1',
  hint: '1',
} as const

/**
 * Tooltip text for Error severity.
 */
export const TIP_ISSUE_ERROR =
  'ErrorA critical violation of the OpenAPI specification that must be fixed. These issues break compliance and may prevent the API from functioning or integrating correctly.'

/**
 * Tooltip text for Warning severity.
 */
export const TIP_ISSUE_WARNING =
  'WarningA significant deviation from recommended practices that should be addressed. While not invalid, it may lead to misunderstandings or misuse by API consumers.'

/**
 * Tooltip text for Info severity.
 */
export const TIP_ISSUE_INFO =
  'InfoA non-blocking suggestion to improve clarity, completeness, or usability. These enhancements help make the API more developer-friendly.'

/**
 * Tooltip text for Hint severity.
 */
export const TIP_ISSUE_HINT =
  'HintAn optional recommendation for advanced design improvements or optimizations. Helps raise the overall quality, consistency, and maintainability of the API.'

/**
 * Tooltip text for Validation Failed state.
 */
export const TIP_VALIDATION_FAILED =
  'Validation failed. Some documents could not be processed during quality validation. See information icon below for details about failed documents.'

/**
 * Mocked failed document name used in "Validation Failed" UI state tests.
 */
export const MOCK_FAILED_DOC_1 = 'failed-doc-1.yaml'

/**
 * Mocked failed document name used in "Validation Failed" UI state tests.
 */
export const MOCK_FAILED_DOC_2 = 'failed-doc-2.yaml'

/**
 * Expected failed documents counter displayed in the UI for the mocked error state.
 */
export const FAILED_DOCS_COUNT = '2'

/**
 * Package for Summary tab tests.
 */
export const PKG_AQ_SUMMARY_N = new Package({
  name: 'Quality-Summary',
  alias: 'PAQSUM',
  parent: G_AQ,
})

/**
 * Version with a single OAS 3.0 document used in Summary tab tests.
 */
export const V_OAS30_N: Version = {
  pkg: PKG_AQ_SUMMARY_N,
  version: 'v1-oas30',
  status: 'draft',
  files: [{ file: FILE_SUMMARY_OAS30 }],
}

/**
 * Version with two OpenAPI documents (OAS 3.0 + OAS 3.1) used in Summary tab tests.
 */
export const V_MULTI_SPEC_N: Version = {
  pkg: PKG_AQ_SUMMARY_N,
  version: 'v2-multi',
  status: 'draft',
  files: [{ file: FILE_SUMMARY_OAS30 }, { file: FILE_SUMMARY_OAS31 }],
}

/**
 * Version with mixed file types (REST OAS + GraphQL) used to verify that GraphQL is excluded from validation.
 */
export const V_MIXED_REST_GQL_N: Version = {
  pkg: PKG_AQ_SUMMARY_N,
  version: 'v3-mixed',
  status: 'draft',
  files: [{ file: FILE_SUMMARY_OAS30 }, { file: FILE_GRAPHQL }],
}

/**
 * Summary tab setup result: references to rulesets created for the suite.
 */
export type AqSummarySetupResult = {
  RUL_SUMMARY_OAS30_N: RulesetWithFile
  RUL_SUMMARY_OAS31_N: RulesetWithFile
  RUL_ALT_OAS30_N: RulesetWithFile
}

/**
 * Creates packages/versions and rulesets required by Summary tab tests.
 *
 * Includes activation history setup and publishing of versions so that validation results exist.
 */
export const setupQualitySummaryTabTestData = async (
  apihubTDM: ApihubTestDataManager,
  lintRulesetTdm: LintRulesetsTestDataManager,
  testIdN: string,
): Promise<AqSummarySetupResult> => {
  test.setTimeout(HOOK_PUBLISH_TIMEOUT)

  await apihubTDM.createPackage([PKG_AQ_SUMMARY_N])

  const RUL_SUMMARY_OAS30_N = await lintRulesetTdm.createRuleset({
    name: `${ALIAS_PREFIX}-Summary-OAS30-${testIdN}`,
    apiType: LintRulesetApiTypes.OAS_3_0,
    linter: LintRulesetLinters.SPECTRAL,
    file: FILE_SUMMARY_RULESET,
  })

  const RUL_SUMMARY_OAS31_N = await lintRulesetTdm.createRuleset({
    name: `${ALIAS_PREFIX}-Summary-OAS31-${testIdN}`,
    apiType: LintRulesetApiTypes.OAS_3_1,
    linter: LintRulesetLinters.SPECTRAL,
    file: FILE_SUMMARY_RULESET,
  })

  const RUL_ALT_OAS30_N = await lintRulesetTdm.createRuleset({
    name: `${ALIAS_PREFIX}-Alt-OAS30-${testIdN}`,
    apiType: LintRulesetApiTypes.OAS_3_0,
    linter: LintRulesetLinters.SPECTRAL,
    file: FILE_SIMPLE_RULESET,
  })

  // Establish activation history
  await lintRulesetTdm.activateRuleset(RUL_SUMMARY_OAS30_N)
  await lintRulesetTdm.activateRuleset(RUL_ALT_OAS30_N)

  // Activate final rulesets for tests
  await lintRulesetTdm.activateRuleset(RUL_SUMMARY_OAS30_N)
  await lintRulesetTdm.activateRuleset(RUL_SUMMARY_OAS31_N)

  // Publish versions for quality validation tests
  await apihubTDM.publishVersion(V_OAS30_N)
  await apihubTDM.publishVersion(V_MULTI_SPEC_N)
  await apihubTDM.publishVersion(V_MIXED_REST_GQL_N)

  return { RUL_SUMMARY_OAS30_N, RUL_SUMMARY_OAS31_N, RUL_ALT_OAS30_N }
}

/**
 * Mocks validation summary API to return `error` status with a list of failed documents.
 */
export const mockValidationSummaryError = async (page: Page): Promise<void> => {
  await test.step('Mock validation summary to return error status with failed documents', async () => {
    await page.route('**/validation/summary', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'error',
          rulesets: [{
            id: 'mock-ruleset-id',
            name: 'Mock Ruleset',
            apiType: LintRulesetApiTypes.OAS_3_0,
            status: LintRulesetStatuses.ACTIVE,
          }],
          documents: [
            {
              slug: 'doc-1',
              documentName: MOCK_FAILED_DOC_1,
              apiType: LintRulesetApiTypes.OAS_3_0,
              status: 'error',
            },
            {
              slug: 'doc-2',
              documentName: MOCK_FAILED_DOC_2,
              apiType: LintRulesetApiTypes.OAS_3_0,
              status: 'error',
            },
          ],
        }),
      })
    })
  })
}

/**
 * Mocks validation summary API to return 404 `LintResultNotFound`.
 */
export const mockValidationSummaryNotFound = async (page: Page): Promise<void> => {
  await test.step('Mock validation summary to return 404 LintResultNotFound', async () => {
    await page.route('**/validation/summary', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'LintResultNotFound',
          message: 'Lint result not found',
        }),
      })
    })
  })
}

/**
 * Mocks validation summary API to never resolve (infinite loading), used to verify "Checking..." state.
 */
export const mockValidationSummaryLoading = async (page: Page): Promise<void> => {
  await test.step('Mock validation summary to delay response indefinitely', async () => {
    await page.route('**/validation/summary', async () => {
      await new Promise(() => {})
    })
  })
}

/**
 * Mocks validation summary API to return `inProgress` status.
 */
export const mockValidationSummaryInProgress = async (page: Page): Promise<void> => {
  await test.step('Mock validation summary to return inProgress status', async () => {
    await page.route('**/validation/summary', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'inProgress',
          rulesets: [],
        }),
      })
    })
  })
}
