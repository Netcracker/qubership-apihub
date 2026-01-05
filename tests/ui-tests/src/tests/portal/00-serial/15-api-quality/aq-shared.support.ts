/* eslint-disable ui-testing/no-browser-commands-in-tests */
import { registerRulesetFiles, registerVersionFiles, test } from '@fixtures'
import type { UsedResourcesHelper } from '@fixtures'
import type { Page } from '@playwright/test'
import {
  type LintRulesetApiType,
  LintRulesetApiTypes,
  LintRulesetStatuses,
  RULESET_API_TYPE_TITLE_MAP,
  type RulesetWithFile,
  SERVER_DEFAULT_RULESETS,
} from '@portal/entities'
import type { PortalPage } from '@portal/pages'
import { expect, expectFile, expectText } from '@services/expect-decorator'
import type { LintRulesetsTestDataManager } from '@services/test-data-manager'
import { ROOT_RESOURCES, TestFile } from '@shared/entities'
import { VAR_GR } from '@test-data/portal/groups'
import type { Version } from '@test-data/props'
import { Group } from '@test-data/props'
import path from 'node:path'

/**
 * Shared group used by all API Quality UI tests.
 *
 * The suite creates this group once in a top-level `beforeAll` and then creates
 * packages under it for each scope (ruleset management / summary / tab).
 */
export const G_AQ = new Group({
  name: 'API-Quality',
  alias: 'GAQ',
  parent: VAR_GR,
})

/**
 * Path to API Quality rulesets folder inside `resources/`.
 *
 * Note: `TestFile` resolves this to an absolute path at runtime.
 */
export const PATH_API_QUALITY_RULESETS = path.join(ROOT_RESOURCES, 'portal/api-quality/rulesets')

/**
 * Path to API Quality specs folder inside `resources/`.
 *
 * Note: `TestFile` resolves this to an absolute path at runtime.
 */
export const PATH_API_QUALITY_SPECS = path.join(ROOT_RESOURCES, 'portal/api-quality/specs')

/**
 * GraphQL document used in "mixed REST + GraphQL" scenarios.
 *
 * Important: GraphQL docs are intentionally excluded from API Quality validation
 * and should not appear in the validated-document selector.
 */
export const FILE_GRAPHQL = new TestFile(path.join(PATH_API_QUALITY_SPECS, 'aq-graphql.graphql'))

/**
 * Options for `registerTestResources`.
 */
export type TestResourcesOptions = {
  /**
   * Ruleset(s) used in the test.
   *
   * Attach these when assertions depend on the actual ruleset content.
   */
  rulesets?: RulesetWithFile | RulesetWithFile[]
  /**
   * Version(s) whose files should be attached.
   *
   * Attach these when assertions depend on the actual spec files content.
   */
  versions?: Version | Version[]
}

/**
 * Registers resource files for linter tests.
 *
 * Attaches ruleset and/or version files for debugging on test failure.
 * Only register resources when the test outcome depends on them:
 * tests with mocked APIs (mocked validation responses) usually don't need this.
 */
export const registerTestResources = (
  usedResources: UsedResourcesHelper,
  options: TestResourcesOptions,
): void => {
  if (options.rulesets) {
    registerRulesetFiles(usedResources, options.rulesets)
  }

  if (options.versions) {
    registerVersionFiles(usedResources, options.versions)
  }
}

/**
 * Restores server default rulesets for OAS 3.0/3.1 and deletes test rulesets created during the run.
 *
 * Why: many tests activate custom rulesets. If we leave them active, we can break subsequent suites
 * running in the same environment.
 */
export const activateDefaultRulesets = async (lintRulesetTdm: LintRulesetsTestDataManager): Promise<void> => {
  const apiTypes = [LintRulesetApiTypes.OAS_3_0, LintRulesetApiTypes.OAS_3_1]

  for (const apiType of apiTypes) {
    const defaultRuleset = await lintRulesetTdm.getRulesetByName({
      rulesetName: SERVER_DEFAULT_RULESETS[apiType],
      apiType: apiType,
    })

    if (defaultRuleset) {
      await lintRulesetTdm.activateRuleset(defaultRuleset)
    }
  }
}

/**
 * Mocks system configuration API response so the UI behaves as if the API linter is disabled.
 *
 * Used to verify that Ruleset Management / Quality sections are hidden when the linter extension is absent.
 */
export const mockSystemConfigurationToDisableLinter = async (page: Page): Promise<void> => {
  await test.step('Mock system configuration API to disable linter', async () => {
    await page.route('**/api/v2/system/configuration', async (route) => {
      const response = await route.fetch()
      const json = await response.json()

      const filteredExtensions = json.extensions.filter((ext: { name: string }) => ext.name !== 'api-linter')

      await route.fulfill({
        status: response.status(),
        headers: response.headers(),
        body: JSON.stringify({
          ...json,
          extensions: filteredExtensions,
        }),
      })
    })
  })
}

/**
 * Verifies the Ruleset Info dialog content (title, chips, file name).
 */
export const verifyRulesetInfoDialogContent = async (
  portalPage: PortalPage,
  ruleset: RulesetWithFile,
  status: string,
): Promise<void> => {
  const { rulesetInfoDialog } = portalPage.versionPackagePage
  const apiTypeLabel = RULESET_API_TYPE_TITLE_MAP[ruleset.apiType]

  await test.step('Verify dialog displays correct content', async () => {
    await expect(rulesetInfoDialog.title).toContainText(ruleset.name)
    await expect(rulesetInfoDialog.apiTypeChip).toHaveText(apiTypeLabel)
    await expect(rulesetInfoDialog.statusChip).toHaveText(status)
    await expect(rulesetInfoDialog.rulesetFile).toContainText(ruleset.file.name)
  })
}

/**
 * Downloads a ruleset from the Ruleset Info dialog and verifies file name + key YAML content.
 */
export const verifyRulesetDownload = async (
  portalPage: PortalPage,
  ruleset: RulesetWithFile,
): Promise<void> => {
  const { rulesetInfoDialog } = portalPage.versionPackagePage
  const downloadedFile = await rulesetInfoDialog.downloadRuleset()

  await test.step('Verify downloaded file has correct content', async () => {
    await expectFile(downloadedFile).toHaveName(ruleset.file.name)
    await expectFile(downloadedFile).toContainText(ruleset.file.testMeta!.yamlString!)
  })
}

/**
 * Copies a public ruleset URL from the Ruleset Info dialog and verifies its path format.
 */
export const verifyRulesetCopyLink = async (
  portalPage: PortalPage,
  ruleset: RulesetWithFile,
): Promise<void> => {
  const { rulesetInfoDialog } = portalPage.versionPackagePage
  const copiedUrl = await rulesetInfoDialog.copyPublicUrl()

  await test.step('Verify clipboard contains URL matching expected pattern', async () => {
    await expectText(copiedUrl).toContain(`/api-linter/api/v1/rulesets/${ruleset.id}/data`)
  })
}

/**
 * Returns the user-facing label for the given Ruleset status.
 *
 * Useful for assertions where the UI displays `Active`/`Inactive` instead of raw API values.
 */
export const getRulesetStatusLabel = (status: keyof typeof LintRulesetStatuses): string => {
  return LintRulesetStatuses[status]
}

/**
 * Returns the user-facing label for a Ruleset API type.
 */
export const getRulesetApiTypeLabel = (apiType: LintRulesetApiType): string => {
  return RULESET_API_TYPE_TITLE_MAP[apiType]
}

/**
 * Common labels used in assertions across multiple scopes (OAS 3.0/3.1).
 */
export const OAS_30_LABEL = getRulesetApiTypeLabel(LintRulesetApiTypes.OAS_3_0)
export const OAS_31_LABEL = getRulesetApiTypeLabel(LintRulesetApiTypes.OAS_3_1)
