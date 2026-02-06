/* eslint-disable ui-testing/no-browser-commands-in-tests */
import { test } from '@fixtures'
import type { Page } from '@playwright/test'
import {
  type LintRulesetApiType,
  LintRulesetApiTypes,
  LintRulesetLinters,
  LintRulesetStatuses,
  RULESET_API_TYPE_TITLE_MAP,
  type RulesetWithFile,
  VERSION_API_QUALITY_TAB_REST,
} from '@portal/entities'
import type { PortalPage } from '@portal/pages'
import type { RulesetInfoDialog } from '@portal/pages/PortalPage/VersionPage/VersionOverviewTab/OverviewSummaryTab/components/RulesetInfoDialog'
import { expect } from '@services/expect-decorator'
import type { ApihubTestDataManager, LintRulesetsTestDataManager } from '@services/test-data-manager'
import {
  CLASS_ACTIVE_LINE_NUMBER,
  CLASS_CODICON_ERROR,
  CLASS_CODICON_INFO,
  CLASS_CODICON_WARNING,
  CLASS_SELECTED_DECORATOR,
  RAW_VIEW_FORMATS,
  type RawViewFormat,
} from '@shared/components/custom/views/RawView'
import { TestFile } from '@shared/entities'
import { ALIAS_PREFIX } from '@test-data/prefixes'
import type { Version } from '@test-data/props'
import { Package } from '@test-data/props'
import { HOOK_PUBLISH_TIMEOUT } from '@test-setup'
import path from 'node:path'
import { FILE_GRAPHQL, G_AQ, PATH_API_QUALITY_RULESETS, PATH_API_QUALITY_SPECS } from './aq-shared.support'

/**
 * Ruleset file used to generate deterministic linter issues for API Quality tab tests.
 */
export const FILE_QUALITY_TAB_RULESET = new TestFile(path.join(PATH_API_QUALITY_RULESETS, 'aq-tab-ruleset.yaml'), {
  yamlString: 'rules:',
})

/**
 * Large OAS 3.0 spec used to validate navigation/highlighting across different lines.
 */
export const FILE_TAB_OAS30 = new TestFile(path.join(PATH_API_QUALITY_SPECS, 'aq-tab-large-oas30.yaml'), {
  yamlString: 'openapi: 3.0.0',
  jsonString: '"openapi": "3.0.0"',
})

/**
 * OAS 3.1 spec used for multi-issue tooltip and overlapping issue scenarios.
 */
export const FILE_TAB_OAS31 = new TestFile(path.join(PATH_API_QUALITY_SPECS, 'aq-tab-combo-oas31.yaml'), {
  yamlString: 'openapi: 3.1.0',
})

/**
 * Package used by API Quality tab tests.
 */
export const PKG_AQ_TAB_N = new Package({
  name: 'Quality-Tab',
  alias: 'PAQTAB',
  parent: G_AQ,
})

/**
 * Version with two OpenAPI documents. Selector defaults to the first doc by slug ordering.
 */
export const V_AQ_TAB_MIXED_N: Version = {
  pkg: PKG_AQ_TAB_N,
  version: 'v2-tab-mixed',
  status: 'draft',
  files: [{ file: FILE_TAB_OAS30 }, { file: FILE_TAB_OAS31 }],
}

/**
 * Version with multiple files (OpenAPI + GraphQL). GraphQL must not appear in the validated-document selector.
 */
export const V_AQ_TAB_MULTI_N: Version = {
  pkg: PKG_AQ_TAB_N,
  version: 'v1-tab-multi',
  status: 'draft',
  files: [{ file: FILE_TAB_OAS30 }, { file: FILE_TAB_OAS31 }, { file: FILE_GRAPHQL }],
}

/**
 * Setup result: rulesets created for API Quality tab tests.
 */
export type AqTabSetupResult = {
  RUL_QUALITY_TAB_OAS30_N: RulesetWithFile
  RUL_QUALITY_TAB_OAS31_N: RulesetWithFile
}

/**
 * Creates package, rulesets and published versions required by API Quality tab tests.
 *
 * Also waits for validation completion after publishing to make UI assertions stable.
 */
export const setupApiQualityTabTestData = async (
  apihubTDM: ApihubTestDataManager,
  lintRulesetTdm: LintRulesetsTestDataManager,
  testIdN: string,
): Promise<AqTabSetupResult> => {
  test.setTimeout(HOOK_PUBLISH_TIMEOUT)

  await apihubTDM.createPackage([PKG_AQ_TAB_N])

  const RUL_QUALITY_TAB_OAS30_N = await lintRulesetTdm.createRuleset({
    name: `${ALIAS_PREFIX}-Quality-Tab-OAS30-${testIdN}`,
    apiType: LintRulesetApiTypes.OAS_3_0,
    linter: LintRulesetLinters.SPECTRAL,
    file: FILE_QUALITY_TAB_RULESET,
  })

  const RUL_QUALITY_TAB_OAS31_N = await lintRulesetTdm.createRuleset({
    name: `${ALIAS_PREFIX}-Quality-Tab-OAS31-${testIdN}`,
    apiType: LintRulesetApiTypes.OAS_3_1,
    linter: LintRulesetLinters.SPECTRAL,
    file: FILE_QUALITY_TAB_RULESET,
  })

  // Activate rulesets for OAS 3.0 and OAS 3.1
  await lintRulesetTdm.activateRuleset(RUL_QUALITY_TAB_OAS30_N)
  await lintRulesetTdm.activateRuleset(RUL_QUALITY_TAB_OAS31_N)

  // Publish versions for API Quality Tab tests
  await apihubTDM.publishVersion(V_AQ_TAB_MIXED_N)
  await apihubTDM.publishVersion(V_AQ_TAB_MULTI_N)

  // Wait for validation to complete after publishing
  await lintRulesetTdm.waitForValidationToComplete({
    packageId: PKG_AQ_TAB_N.packageId,
    version: V_AQ_TAB_MIXED_N.version,
  })
  await lintRulesetTdm.waitForValidationToComplete({
    packageId: PKG_AQ_TAB_N.packageId,
    version: V_AQ_TAB_MULTI_N.version,
  })

  return { RUL_QUALITY_TAB_OAS30_N, RUL_QUALITY_TAB_OAS31_N }
}

/**
 * Linter message constants used across API Quality tab tests.
 */
export const MSG_ERROR_1 = 'Synthetic Error 1 Found'
export const MSG_ERROR_2 = 'Synthetic Error 2 Found'
export const MSG_WARNING_1 = 'Synthetic Warning 1 Found'
export const MSG_WARNING_2 = 'Synthetic Warning 2 Found'
export const MSG_INFO_1 = 'Synthetic Info 1 Found'
export const MSG_INFO_2 = 'Synthetic Info 2 Found'
export const MSG_HINT_1 = 'Synthetic Hint 1 Found'
export const MSG_HINT_2 = 'Synthetic Hint 2 Found'

/**
 * Rule names from `aq-tab-ruleset.yaml` used in tooltip/popup assertions.
 */
export const RULE_ERROR_1 = 'synth-error-1'
export const RULE_ERROR_2 = 'synth-error-2'
export const RULE_WARNING_1 = 'synth-warn-1'
export const RULE_WARNING_2 = 'synth-warn-2'
export const RULE_INFO_1 = 'synth-info-1'
export const RULE_INFO_2 = 'synth-info-2'
export const RULE_HINT_1 = 'synth-hint-1'
export const RULE_HINT_2 = 'synth-hint-2'

/**
 * Overlapping issue messages for multi-rule same-type tooltip/navigation scenarios.
 */
export const MSG_OVERLAP_ERROR_1 = 'Synthetic Overlap Error 1 Found'
export const MSG_OVERLAP_ERROR_2 = 'Synthetic Overlap Error 2 Found'
export const TEXT_OVERLAP_OPERATION = 'OverlapErr Operation'

/**
 * One issue row in API Quality Issue List + corresponding marker text in the document viewer.
 */
export type IssueTestCase = {
  linterMessage: string
  problemText: string
  yamlLineNumber: number
  jsonLineNumber: number
  ruleName: string
  iconClass: string
}

/**
 * Canonical set of issues used across navigation/highlighting/tooltip/popup tests.
 */
export const ISSUE_TEST_CASES: IssueTestCase[] = [
  {
    linterMessage: MSG_ERROR_1,
    problemText: 'Operation with Error1',
    yamlLineNumber: 9,
    jsonLineNumber: 11,
    ruleName: RULE_ERROR_1,
    iconClass: CLASS_CODICON_ERROR,
  },
  {
    linterMessage: MSG_ERROR_2,
    problemText: 'Operation with Error2',
    yamlLineNumber: 177,
    jsonLineNumber: 275,
    ruleName: RULE_ERROR_2,
    iconClass: CLASS_CODICON_ERROR,
  },
  {
    linterMessage: MSG_WARNING_1,
    problemText: 'Operation with Warn1',
    yamlLineNumber: 51,
    jsonLineNumber: 77,
    ruleName: RULE_WARNING_1,
    iconClass: CLASS_CODICON_WARNING,
  },
  {
    linterMessage: MSG_WARNING_2,
    problemText: 'Operation with Warn2',
    yamlLineNumber: 219,
    jsonLineNumber: 341,
    ruleName: RULE_WARNING_2,
    iconClass: CLASS_CODICON_WARNING,
  },
  {
    linterMessage: MSG_INFO_1,
    problemText: 'Operation with Info1',
    yamlLineNumber: 93,
    jsonLineNumber: 143,
    ruleName: RULE_INFO_1,
    iconClass: CLASS_CODICON_INFO,
  },
  {
    linterMessage: MSG_INFO_2,
    problemText: 'Operation with Info2',
    yamlLineNumber: 261,
    jsonLineNumber: 407,
    ruleName: RULE_INFO_2,
    iconClass: CLASS_CODICON_INFO,
  },
  {
    linterMessage: MSG_HINT_1,
    problemText: 'Operation with Hint1',
    yamlLineNumber: 135,
    jsonLineNumber: 209,
    ruleName: RULE_HINT_1,
    iconClass: CLASS_CODICON_ERROR,
  },
  {
    linterMessage: MSG_HINT_2,
    problemText: 'Operation with Hint2',
    yamlLineNumber: 303,
    jsonLineNumber: 473,
    ruleName: RULE_HINT_2,
    iconClass: CLASS_CODICON_ERROR,
  },
]

/**
 * Returns expected line number for a test case based on selected format.
 */
export const getLineNumber = (testCase: IssueTestCase, format: RawViewFormat): number => {
  return format === RAW_VIEW_FORMATS.YAML ? testCase.yamlLineNumber : testCase.jsonLineNumber
}

/**
 * Navigates directly to API Quality tab for a given version.
 */
export const navigateToApiQualityTab = async (portalPage: PortalPage, version: Version): Promise<void> => {
  await test.step('Navigate to the API Quality tab', async () => {
    await portalPage.gotoVersion(version, VERSION_API_QUALITY_TAB_REST)
  })
}

/**
 * Switches the validated document in the API Quality tab document selector.
 */
export const switchToTestDocument = async (portalPage: PortalPage, documentName: string): Promise<void> => {
  const { apiQualityTab } = portalPage.versionPackagePage

  await test.step('Switch to test document', async () => {
    await apiQualityTab.documentSlt.click()
    await apiQualityTab.documentSlt.getListItem(documentName).click()
  })
}

/**
 * Switches RawView format to JSON (YAML is the default).
 */
export const switchToFormat = async (portalPage: PortalPage, format: RawViewFormat): Promise<void> => {
  const { rawView } = portalPage.versionPackagePage.apiQualityTab

  if (format === RAW_VIEW_FORMATS.JSON) {
    await test.step('Switch to JSON format', async () => {
      await rawView.jsonBtn.click()
      await expect(rawView.jsonBtn).toBePressed()
    })
  }
}

/**
 * Opens the Problem Popup via the Problem Tooltip "View Problem" button.
 */
export const openProblemPopupViaTooltip = async (
  portalPage: PortalPage,
  testCase: IssueTestCase,
): Promise<void> => {
  const { apiQualityTab } = portalPage.versionPackagePage
  const { rawView } = apiQualityTab
  const { problemTooltip } = rawView

  await test.step('Hover over issue marker to show Tooltip and open Problem Popup', async () => {
    await apiQualityTab.getProblemRow(testCase.linterMessage).click()
    await expect(rawView.getTextContent(testCase.problemText)).toBeVisible()
    await rawView.hoverText(testCase.problemText)
    await expect(problemTooltip).toBeVisible()
    await problemTooltip.viewProblemBtn.click()
  })
}

/**
 * Opens the Problem Popup for a marker that contains overlapping issues (same severity, different rules).
 */
export const openProblemPopupForOverlappingIssue = async (
  portalPage: PortalPage,
  linterMessage: string,
  problemText: string,
): Promise<void> => {
  const { apiQualityTab } = portalPage.versionPackagePage
  const { rawView } = apiQualityTab

  await test.step('Navigate to overlapping issue and open Problem Popup', async () => {
    await apiQualityTab.getProblemRow(linterMessage).click()
    await expect(rawView.getTextContent(problemText)).toBeVisible()
    await rawView.hoverText(problemText)
    await rawView.problemTooltip.viewProblemBtn.click()
  })
}

/**
 * Closes the Problem Popup and verifies it disappears.
 */
export const closeAndVerifyProblemPopup = async (portalPage: PortalPage): Promise<void> => {
  const { problemPopUp } = portalPage.versionPackagePage.apiQualityTab.rawView

  await test.step('Close Problem Popup and verify it is hidden', async () => {
    await problemPopUp.closeBtn.click()
    await expect(problemPopUp).toBeHidden()
  })
}

/**
 * Opens the Problem Popup via keyboard shortcut Alt+F8 when cursor is on the issue marker.
 */
export const openProblemPopupViaAltF8 = async (
  portalPage: PortalPage,
  testCase: IssueTestCase,
): Promise<void> => {
  const { apiQualityTab } = portalPage.versionPackagePage
  const { rawView } = apiQualityTab
  const { page } = portalPage

  await test.step('Position cursor on issue marker and open Popup via Alt+F8', async () => {
    await apiQualityTab.getProblemRow(testCase.linterMessage).click()
    await expect(rawView.getTextContent(testCase.problemText)).toBeVisible()
    await rawView.clickText(testCase.problemText)
    await page.keyboard.press('Alt+F8')
  })
}

/**
 * Verifies that the Problem Popup contains the correct message metadata and icon for a given issue.
 */
export const verifyProblemPopupContent = async (portalPage: PortalPage, testCase: IssueTestCase): Promise<void> => {
  const { apiQualityTab } = portalPage.versionPackagePage
  const { rawView } = apiQualityTab
  const { problemPopUp } = rawView

  await test.step('Verify Problem Popup appears with correct content', async () => {
    await expect(problemPopUp).toBeVisible()
    await expect(problemPopUp.message).toContainText(testCase.linterMessage)
    await expect(problemPopUp.message).toContainText(LintRulesetLinters.SPECTRAL)
    await expect(problemPopUp.message).toContainText(testCase.ruleName)
  })

  await test.step('Verify Popup displays problem type icon', async () => {
    await expect(problemPopUp.iconContainer).toHaveIconClass(testCase.iconClass)
  })

  await test.step('Verify Popup shows navigation arrows and Close button', async () => {
    await expect(problemPopUp.nextProblemBtn).toBeVisible()
    await expect(problemPopUp.previousProblemBtn).toBeVisible()
    await expect(problemPopUp.closeBtn).toBeVisible()
  })
}

/**
 * Verifies that Validation Issues list is sorted by severity order:
 * Error → Warning → Info → Hint (then by document position within severity).
 */
export const verifyValidationIssuesSorting = async (portalPage: PortalPage): Promise<void> => {
  const { apiQualityTab } = portalPage.versionPackagePage

  const SORTED_ISSUES_BY_SEVERITY = [
    MSG_ERROR_1,
    MSG_ERROR_2,
    MSG_WARNING_1,
    MSG_WARNING_2,
    MSG_INFO_1,
    MSG_INFO_2,
    MSG_HINT_1,
    MSG_HINT_2,
  ]

  await test.step('Verify the expected number of issues', async () => {
    await expect(apiQualityTab.getProblemRow()).toHaveCount(SORTED_ISSUES_BY_SEVERITY.length)
  })

  await test.step('Verify issues are sorted by severity order', async () => {
    for (let i = 0; i < SORTED_ISSUES_BY_SEVERITY.length; i++) {
      const row = apiQualityTab.getProblemRow(i + 1)
      await expect(row.messageCell).toContainText(SORTED_ISSUES_BY_SEVERITY[i])
    }
  })
}

/**
 * Navigates through each issue and verifies line highlighting + selected marker indicator in RawView.
 */
export const verifyIssueNavigationHighlight = async (portalPage: PortalPage, format: RawViewFormat): Promise<void> => {
  const { apiQualityTab } = portalPage.versionPackagePage
  const { rawView } = apiQualityTab

  for (const testCase of ISSUE_TEST_CASES) {
    await test.step(`Navigate to "${testCase.linterMessage}" and verify highlighting`, async () => {
      const lineNumber = getLineNumber(testCase, format)
      const lineNumberContainer = rawView.getLineNumberContainer(lineNumber)

      await test.step('Navigate to issue location and verify line number container is visible', async () => {
        await apiQualityTab.getProblemRow(testCase.linterMessage).click()
        await expect(lineNumberContainer).toBeInViewport()
      })

      await test.step('Verify selected line number is active', async () => {
        await expect(lineNumberContainer).toHaveClass(CLASS_ACTIVE_LINE_NUMBER)
      })

      await test.step('Verify selected problem is marked with blue indicator', async () => {
        await expect(lineNumberContainer.marker).toHaveClass(CLASS_SELECTED_DECORATOR)
      })

      await test.step('Verify problem text is visible in the viewport', async () => {
        await expect(rawView.getTextContent(testCase.problemText)).toBeInViewport()
      })
    })
  }
}

/**
 * Verifies that Problem Tooltip appears when hovering markers in the document viewer.
 */
export const verifyTooltipOnHover = async (portalPage: PortalPage): Promise<void> => {
  const { apiQualityTab } = portalPage.versionPackagePage
  const { rawView } = apiQualityTab
  const { problemTooltip } = rawView

  for (const testCase of ISSUE_TEST_CASES) {
    await test.step(`Verify Tooltip appears on hover over "${testCase.linterMessage}" issue marker`, async () => {
      await test.step('Locate an issue marker in the Document Viewer', async () => {
        await apiQualityTab.getProblemRow(testCase.linterMessage).click()
        await expect(rawView.getTextContent(testCase.problemText)).toBeVisible()
      })

      await test.step('Hover over the issue marker text', async () => {
        if (testCase.linterMessage === MSG_HINT_1 || testCase.linterMessage === MSG_HINT_2) {
          await rawView.hoverHintText(testCase.problemText)
        } else {
          await rawView.hoverText(testCase.problemText)
        }
      })

      await test.step('Verify Problem Tooltip appears with expected content', async () => {
        await expect(problemTooltip).toBeVisible()
        await expect(problemTooltip).toContainText(testCase.linterMessage)
        await expect(problemTooltip).toContainText(LintRulesetLinters.SPECTRAL)
        await expect(problemTooltip).toContainText(testCase.ruleName)

        if (testCase.linterMessage !== MSG_HINT_1 && testCase.linterMessage !== MSG_HINT_2) {
          await expect(problemTooltip.viewProblemBtn).toBeVisible()
        } else {
          await expect(problemTooltip.viewProblemBtn).toBeHidden()
        }
      })
    })
  }
}

/**
 * Verifies that Problem Tooltip disappears when cursor leaves the marker area.
 */
export const verifyTooltipDisappears = async (portalPage: PortalPage, page: Page): Promise<void> => {
  const { apiQualityTab } = portalPage.versionPackagePage
  const { rawView } = apiQualityTab
  const { problemTooltip } = rawView

  await test.step('Hover over an issue marker to show the Tooltip', async () => {
    await apiQualityTab.getProblemRow(MSG_ERROR_1).click()
    await expect(rawView.getTextContent('Operation with Error1')).toBeVisible()
    await rawView.hoverText('Operation with Error1')
    await expect(problemTooltip).toBeVisible()
  })

  await test.step('Move the cursor away from the issue marker to a neutral area', async () => {
    await page.mouse.move(0, 0)
  })

  await test.step('Verify Problem Tooltip disappears', async () => {
    await expect(problemTooltip).toBeHidden()
  })
}

/**
 * Verifies tooltip content when one marker contains multiple issues of different severities.
 */
export const verifyComboTooltip = async (portalPage: PortalPage): Promise<void> => {
  const { apiQualityTab } = portalPage.versionPackagePage
  const { rawView } = apiQualityTab
  const { problemTooltip } = rawView
  const COMBO_TEXT = 'Combo Error1 Warn1 Info1 Hint1'

  await test.step('Locate a marker with multiple issues of different types in the Document Viewer', async () => {
    await apiQualityTab.getProblemRow(MSG_ERROR_1).click()
    await expect(rawView.getTextContent(COMBO_TEXT)).toBeVisible()
  })

  await test.step('Hover over the issue marker', async () => {
    await rawView.hoverHintText(COMBO_TEXT)
  })

  await test.step('Verify Problem Tooltip appears with all issues for that location', async () => {
    await expect(problemTooltip).toBeVisible()
    await expect(problemTooltip).toContainText(MSG_ERROR_1)
    await expect(problemTooltip).toContainText(MSG_WARNING_1)
    await expect(problemTooltip).toContainText(MSG_INFO_1)
    await expect(problemTooltip).toContainText(MSG_HINT_1)
    await expect(problemTooltip.viewProblemBtn).toBeVisible()
  })
}

/**
 * Verifies tooltip content when one marker triggers multiple rules of the same severity.
 */
export const verifyMultiRuleTooltip = async (portalPage: PortalPage): Promise<void> => {
  const { apiQualityTab } = portalPage.versionPackagePage
  const { rawView } = apiQualityTab
  const { problemTooltip } = rawView

  await test.step('Locate a marker where one element triggers multiple rules of the same type', async () => {
    await apiQualityTab.getProblemRow(MSG_OVERLAP_ERROR_1).click()
    await expect(rawView.getTextContent(TEXT_OVERLAP_OPERATION)).toBeVisible()
  })

  await test.step('Hover over the issue marker', async () => {
    await rawView.hoverText(TEXT_OVERLAP_OPERATION)
  })

  await test.step('Verify Problem Tooltip appears with both error messages from different rules', async () => {
    await expect(problemTooltip).toBeVisible()
    await expect(problemTooltip).toContainText(MSG_OVERLAP_ERROR_1)
    await expect(problemTooltip).toContainText(MSG_OVERLAP_ERROR_2)
    await expect(problemTooltip.viewProblemBtn).toBeVisible()
  })
}

/**
 * Opens API Quality tab and then opens the Ruleset Info dialog via the ruleset link.
 */
export const navigateToApiQualityTabAndOpenRulesetDialog = async (
  portalPage: PortalPage,
  version: Version,
): Promise<RulesetInfoDialog> => {
  const { apiQualityTab } = portalPage.versionPackagePage

  await navigateToApiQualityTab(portalPage, version)

  await test.step('Open ruleset dialog', async () => {
    await apiQualityTab.nameLink.click()
  })

  return portalPage.versionPackagePage.rulesetInfoDialog
}

/**
 * Severity icon IDs used in Issue List.
 */
export const ERROR_ICON = 'ErrorIcon'
export const WARNING_ICON = 'WarningIcon'
export const INFO_ICON = 'InfoIcon'
export const HINT_ICON = 'HintIcon'

/**
 * Verifies navigation between two problems using Popup buttons.
 */
export const verifyProblemNavigation = async (
  portalPage: PortalPage,
  initialTestCase: IssueTestCase,
  nextTestCase: IssueTestCase,
): Promise<void> => {
  const { problemPopUp } = portalPage.versionPackagePage.apiQualityTab.rawView

  await test.step('Verify initial problem is displayed', async () => {
    await expect(problemPopUp.message).toContainText(initialTestCase.linterMessage)
  })

  await test.step('Navigate to next problem and verify Popup updates', async () => {
    await problemPopUp.nextProblemBtn.click()
    await expect(problemPopUp.message).toContainText(nextTestCase.linterMessage)
    await expect(problemPopUp.iconContainer).toHaveIconClass(nextTestCase.iconClass)
  })

  await test.step('Navigate to previous problem and verify Popup updates', async () => {
    await problemPopUp.previousProblemBtn.click()
    await expect(problemPopUp.message).toContainText(initialTestCase.linterMessage)
    await expect(problemPopUp.iconContainer).toHaveIconClass(initialTestCase.iconClass)
  })
}

/**
 * Verifies navigation between problems using keyboard shortcuts (F8 / Shift+F8).
 */
export const verifyKeyboardNavigation = async (
  portalPage: PortalPage,
  initialTestCase: IssueTestCase,
  nextTestCase: IssueTestCase,
): Promise<void> => {
  const { problemPopUp } = portalPage.versionPackagePage.apiQualityTab.rawView
  const { page } = portalPage

  await test.step('Verify initial problem is displayed', async () => {
    await expect(problemPopUp.message).toContainText(initialTestCase.linterMessage)
  })

  await test.step('Navigate to next problem via F8 and verify Popup updates', async () => {
    await page.keyboard.press('F8')
    await expect(problemPopUp.message).toContainText(nextTestCase.linterMessage)
  })

  await test.step('Navigate to previous problem via Shift+F8 and verify Popup updates', async () => {
    await page.keyboard.press('Shift+F8')
    await expect(problemPopUp.message).toContainText(initialTestCase.linterMessage)
  })
}

/**
 * Verifies that popup navigation follows severity order: Error1 → Error2 → Warning1 → Warning2 → Info1 → Info2 → Hint1 → Hint2.
 */
export const verifySeverityOrderNavigation = async (portalPage: PortalPage): Promise<void> => {
  const { problemPopUp } = portalPage.versionPackagePage.apiQualityTab.rawView

  const SORTED_BY_SEVERITY = [
    MSG_ERROR_1,
    MSG_ERROR_2,
    MSG_WARNING_1,
    MSG_WARNING_2,
    MSG_INFO_1,
    MSG_INFO_2,
  ]

  await test.step('Verify initial problem is first Error', async () => {
    await expect(problemPopUp.message).toContainText(SORTED_BY_SEVERITY[0])
  })

  for (let i = 1; i < SORTED_BY_SEVERITY.length; i++) {
    await test.step(`Navigate to problem ${i + 1} and verify severity order`, async () => {
      await problemPopUp.nextProblemBtn.click()
      await expect(problemPopUp.message).toContainText(SORTED_BY_SEVERITY[i])
    })
  }
}

/**
 * Verifies navigation behavior for overlapping issues (same severity, multiple rules at same location).
 */
export const verifyOverlappingIssuesNavigation = async (portalPage: PortalPage): Promise<void> => {
  const { problemPopUp } = portalPage.versionPackagePage.apiQualityTab.rawView

  await test.step('Verify Popup shows one of the overlapping errors', async () => {
    await expect(problemPopUp.message).toContainText(MSG_OVERLAP_ERROR_1)
  })

  await test.step('Navigate to next problem and verify it follows severity order', async () => {
    await problemPopUp.nextProblemBtn.click()
    await expect(problemPopUp.message).toContainText(MSG_OVERLAP_ERROR_2)
  })

  await test.step('Navigate back to verify we can return to first overlap error', async () => {
    await problemPopUp.previousProblemBtn.click()
    await expect(problemPopUp.message).toContainText(MSG_OVERLAP_ERROR_1)
  })
}

/**
 * Message for "No Validation Results" placeholder in API Quality tab.
 * Note: rendered text contains no newline/space between sentences.
 */
export const MSG_TAB_NO_VALIDATION_RESULTS =
  'API Quality results are not availablePlease check the Summary tab for validation status'

/**
 * Mocks validation summary API to return 404 (no validation results available).
 */
export const mockValidationSummaryNotAvailable = async (page: Page): Promise<void> => {
  await test.step('Mock validation summary to return 404 (no validation results)', async () => {
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
 * Returns the API type label used in UI (chip) for a ruleset.
 */
export const getApiTypeLabel = (apiType: LintRulesetApiType): string => {
  return RULESET_API_TYPE_TITLE_MAP[apiType]
}

/**
 * Returns "Active/Inactive" label used in UI for ruleset status chips.
 */
export const { ACTIVE: STATUS_ACTIVE, INACTIVE: STATUS_INACTIVE } = LintRulesetStatuses
