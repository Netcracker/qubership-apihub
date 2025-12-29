import { test } from '@fixtures'
import {
  type LintRulesetApiType,
  LintRulesetApiTypes,
  LintRulesetLinters,
  LintRulesetStatuses,
  RULESET_API_TYPE_TITLE_MAP,
  type RulesetWithFile,
  VERSION_API_QUALITY_TAB_REST,
} from '@portal/entities'
import { PortalPage } from '@portal/pages'
import { expect, expectFile, expectText } from '@services/expect-decorator'
import { formatDateToUI } from '@services/utils'
import { RAW_VIEW_FORMATS } from '@shared/components/custom/views/RawView'
import { OPENAPI_ICON, type TestFile } from '@shared/entities'
import { NO_PERM_SEE_PAGE } from '@test-data/portal'
import { ALIAS_PREFIX } from '@test-data/prefixes'
import * as aqRm from './aq-rm.support'
import * as aqShared from './aq-shared.support'
import * as aqSummary from './aq-summary.support'
import * as aqTab from './aq-tab.support'

test.describe('API Quality Validation', () => {
  const testIdN = process.env.TEST_ID_N!

  // Shared constants
  const { ACTIVE: STATUS_ACTIVE, INACTIVE: STATUS_INACTIVE } = LintRulesetStatuses
  const currentFormattedDate = formatDateToUI(new Date())
  const { OAS_30_LABEL, OAS_31_LABEL } = aqShared

  // Shared test data entities / resource files
  const { G_AQ, FILE_GRAPHQL } = aqShared

  // Shared helper functions
  const {
    activateDefaultRulesetsAndCleanup,
    mockSystemConfigurationToDisableLinter,
    registerTestResources,
    verifyRulesetCopyLink,
    verifyRulesetDownload,
    verifyRulesetInfoDialogContent,
  } = aqShared

  test.beforeAll(async ({ apihubTDM }) => {
    // Create shared group for all API Quality tests
    await apihubTDM.createPackage([G_AQ])
  })

  test.afterAll(async ({ lintRulesetTdm }) => {
    await activateDefaultRulesetsAndCleanup(lintRulesetTdm, testIdN)
  })

  test.describe('Ruleset Management', () => {
    const {
      DEFAULT_API_TYPE_LABEL,
      FILE_INVALID_EXTENSION,
      FILE_SIMPLE_RULESET,
      MSG_DUPLICATE_NAME,
      MSG_INVALID_FILE_FORMAT,
      MSG_PUBLIC_URL_COPIED_SUCCESS,
      MSG_RULESET_CREATED_SUCCESS,
      MSG_RULESET_DELETED_SUCCESS,
      TIP_CANNOT_DELETE_ACTIVE,
      TIP_CANNOT_DELETE_WITH_HISTORY,
      navigateToRulesetManagement,
      setupRulesetManagementRulesets,
    } = aqRm

    // Ruleset data
    let RUL_INACTIVE_OAS30_N: RulesetWithFile
    let RUL_PREVIOUSLY_ACTIVE_OAS30_N: RulesetWithFile
    let RUL_INACTIVE_OAS31_N: RulesetWithFile
    let RUL_GENERAL_OAS30_N: RulesetWithFile

    test.beforeAll(async ({ lintRulesetTdm }) => {
      ({
        RUL_INACTIVE_OAS30_N,
        RUL_PREVIOUSLY_ACTIVE_OAS30_N,
        RUL_INACTIVE_OAS31_N,
        RUL_GENERAL_OAS30_N,
      } = await setupRulesetManagementRulesets(lintRulesetTdm, testIdN))
    })

    test.describe('Initial State and Core UI', () => {
      test('P-AQ-RM-UI-1 Verify initial state for admin', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { rulesetManagementTab } = portalPage.portalSettingsPage

        await test.step('Navigate to Ruleset Management tab', async () => {
          await portalPage.goto()
          await portalPage.header.portalSettingsBtn.click()
          await rulesetManagementTab.click()
        })

        await test.step('Verify main header is visible', async () => {
          await expect(rulesetManagementTab.title).toBeVisible()
        })

        await test.step('Verify API type selector is visible with default value', async () => {
          await expect(rulesetManagementTab.rulesetTypeSlt).toBeVisible()
          await expect(rulesetManagementTab.rulesetTypeSlt).toHaveText(DEFAULT_API_TYPE_LABEL)
        })

        await test.step('Verify Add Ruleset button is visible and enabled', async () => {
          await expect(rulesetManagementTab.addRulesetBtn).toBeVisible()
          await expect(rulesetManagementTab.addRulesetBtn).toBeEnabled()
        })

        await test.step('Verify ruleset table with correct columns is visible', async () => {
          const firstRulesetRow = rulesetManagementTab.getRulesetRow(1)

          await expect(firstRulesetRow.nameCell).toBeVisible()
          await expect(firstRulesetRow.activationHistoryCell).toBeVisible()
          await expect(firstRulesetRow.statusCell).toBeVisible()
          await expect(firstRulesetRow.createdAtCell).toBeVisible()
        })
      })

      test('P-AQ-RM-UI-2 Verify Ruleset Management tab is hidden when linter is disabled', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { portalSettingsPage } = portalPage

        await test.step('Mock system configuration API to disable linter', async () => {
          await mockSystemConfigurationToDisableLinter(page)
        })

        await test.step('Navigate to Portal Settings', async () => {
          await portalPage.goto()
          await portalPage.header.portalSettingsBtn.click()
        })

        await test.step('Verify another tab is visible to confirm page loaded correctly', async () => {
          await expect(portalSettingsPage.userRolesTabBtn).toBeVisible()
        })

        await test.step('Verify Ruleset Management tab is not visible', async () => {
          await expect(portalSettingsPage.rulesetManagementTab).toBeHidden()
        })
      })

      test('P-AQ-RM-UI-3 Verify no permission placeholder when non-admin user navigates directly via URL', {
        tag: '@smoke',
      }, async ({ browser, usersTDM }) => {
        // Create a non-admin user with TEST_ID_N for cleanup
        const nonAdminUser = {
          id: `x_atui_nonadmin_${testIdN}`,
          email: `x_atui_nonadmin_${testIdN}@qa.at`,
          name: `x_ATUI_NonAdmin_${testIdN}`,
          password: process.env.TEST_USER_PASSWORD as string,
        }

        await test.step('Create non-admin test user via API', async () => {
          await usersTDM.createGeneralUser(nonAdminUser)
        })

        // Create page context for the non-admin user
        const { createUserStorageStateWithAuthCookieFromApi } = await import('@services/storage-state/save')
        const context = await browser.newContext({
          storageState: await createUserStorageStateWithAuthCookieFromApi(nonAdminUser),
        })
        const page = await context.newPage()

        try {
          const portalPage = new PortalPage(page)

          await navigateToRulesetManagement(portalPage)

          await test.step('Verify no permission placeholder is displayed', async () => {
            await expect(portalPage.noPermissionPlaceholder).toBeVisible()
            await expect(portalPage.noPermissionPlaceholder).toContainText(NO_PERM_SEE_PAGE)
          })
        } finally {
          await context.close()
        }
      })

      test.skip('P-AQ-RM-UI-4 Verify direct URL navigation redirects to User Roles tab when linter is disabled', {
        tag: '@smoke',
        annotation: {
          type: 'Issue',
          description: 'Tab opens and UI elements are accessible, can open Add Ruleset dialog',
        },
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { portalSettingsPage } = portalPage

        await mockSystemConfigurationToDisableLinter(page)

        await navigateToRulesetManagement(portalPage)

        await test.step('Verify redirect to User Roles tab occurred', async () => {
          await expect(portalSettingsPage.userRolesTabBtn).toBeVisible()
        })

        await test.step('Verify User Roles tab content is visible', async () => {
          await expect(portalSettingsPage.createRoleBtn).toBeVisible()
        })

        await test.step('Verify Ruleset Management tab is not visible', async () => {
          await expect(portalSettingsPage.rulesetManagementTab).toBeHidden()
        })
      })
    })

    test.describe('Ruleset Creation', () => {
      test('P-AQ-RM-CREATE-1 Open, verify title, and close the Create Ruleset dialog', async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { rulesetManagementTab } = portalPage.portalSettingsPage
        const { createRulesetDialog } = rulesetManagementTab

        await navigateToRulesetManagement(portalPage)

        await rulesetManagementTab.openCreateRulesetDialog()

        await test.step('Verify dialog title matches expected format', async () => {
          await expect(createRulesetDialog.title).toHaveText(`Create Ruleset for ${DEFAULT_API_TYPE_LABEL}`)
        })

        await test.step('Close dialog without creating ruleset', async () => {
          await createRulesetDialog.cancelBtn.click()
        })

        await test.step('Verify dialog is closed and we remain on Ruleset Management tab', async () => {
          await expect(createRulesetDialog.title).toBeHidden()
          await expect(rulesetManagementTab.title).toBeVisible()
          await expect(rulesetManagementTab.addRulesetBtn).toBeVisible()
        })
      })

      test('P-AQ-RM-CREATE-2 Create a new inactive ruleset', {
        tag: '@smoke',
      }, async ({ sysadminPage: page, usedResources }) => {
        const portalPage = new PortalPage(page)
        const { rulesetManagementTab } = portalPage.portalSettingsPage
        const { createRulesetDialog } = rulesetManagementTab

        const retryIndex = test.info().retry + 1
        const rulesetName = `${ALIAS_PREFIX}-Create-New-${retryIndex}-${testIdN}`

        usedResources.addFiles(FILE_SIMPLE_RULESET)

        await navigateToRulesetManagement(portalPage)

        await rulesetManagementTab.openCreateRulesetDialog()

        await test.step('Fill in unique name and upload file', async () => {
          const file = { path: FILE_SIMPLE_RULESET.path, name: FILE_SIMPLE_RULESET.name }
          await createRulesetDialog.fillForm({
            rulesetName,
            file,
          })
        })

        await createRulesetDialog.createBtn.click()

        const rulesetRow = rulesetManagementTab.getRulesetRow(rulesetName)

        await test.step('Verify success notification appears', async () => {
          await expect(portalPage.snackbar).toContainText(MSG_RULESET_CREATED_SUCCESS(rulesetName))
        })

        await test.step('Verify new Inactive ruleset is in the table', async () => {
          await expect(rulesetRow.nameCell).toHaveText(rulesetName)
          await expect(rulesetRow.statusCell).toHaveText(STATUS_INACTIVE)
          await expect(rulesetRow.activationHistoryCell).toBeEmpty()
        })

        await test.step('Verify created date format', async () => {
          await expect(rulesetRow.createdAtCell).toHaveText(currentFormattedDate)
        })
      })

      test('P-AQ-RM-CREATE-3 Attempt to create a ruleset with a duplicate name', {
        tag: '@smoke',
      }, async ({ sysadminPage: page, usedResources }) => {
        const portalPage = new PortalPage(page)
        const { rulesetManagementTab } = portalPage.portalSettingsPage
        const { createRulesetDialog } = rulesetManagementTab

        usedResources.addFiles(FILE_SIMPLE_RULESET)

        await navigateToRulesetManagement(portalPage)

        await rulesetManagementTab.openCreateRulesetDialog()

        await test.step('Fill in duplicate name and upload file', async () => {
          const file = { path: FILE_SIMPLE_RULESET.path, name: FILE_SIMPLE_RULESET.name }
          const rulesetName = RUL_GENERAL_OAS30_N.name
          await createRulesetDialog.fillForm({
            rulesetName,
            file,
          })
        })

        await createRulesetDialog.createBtn.click()

        await test.step('Verify error message appears in the dialog', async () => {
          await expect(createRulesetDialog.nameTxtFld.errorMsg).toBeVisible()
          await expect(createRulesetDialog.nameTxtFld.errorMsg).toContainText(
            MSG_DUPLICATE_NAME(RUL_GENERAL_OAS30_N.name, LintRulesetApiTypes.OAS_3_0),
          )
        })
      })

      test('P-AQ-RM-CREATE-4 Attempt to create a ruleset without a name', async ({ sysadminPage: page, usedResources }) => {
        const portalPage = new PortalPage(page)
        const { rulesetManagementTab } = portalPage.portalSettingsPage
        const { createRulesetDialog } = rulesetManagementTab

        usedResources.addFiles(FILE_SIMPLE_RULESET)

        await navigateToRulesetManagement(portalPage)

        await rulesetManagementTab.openCreateRulesetDialog()

        await test.step('Upload a file but leave name field blank', async () => {
          const file = { path: FILE_SIMPLE_RULESET.path, name: FILE_SIMPLE_RULESET.name }
          await createRulesetDialog.fillForm({
            file,
          })
        })

        await test.step('Verify Create button remains disabled', async () => {
          await expect(createRulesetDialog.createBtn).toBeDisabled()
        })
      })

      test('P-AQ-RM-CREATE-5 Attempt to create a ruleset without a file', async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { rulesetManagementTab } = portalPage.portalSettingsPage
        const { createRulesetDialog } = rulesetManagementTab

        await navigateToRulesetManagement(portalPage)

        await rulesetManagementTab.openCreateRulesetDialog()

        await test.step('Fill in a name but do not upload a file', async () => {
          const rulesetName = `${ALIAS_PREFIX}-Test-Name-${testIdN}`
          await createRulesetDialog.fillForm({
            rulesetName,
          })
        })

        await test.step('Verify Create button remains disabled', async () => {
          await expect(createRulesetDialog.createBtn).toBeDisabled()
        })
      })

      test('P-AQ-RM-CREATE-6 Attempt to create a ruleset with an invalid file extension', async ({ sysadminPage: page, usedResources }) => {
        const portalPage = new PortalPage(page)
        const { rulesetManagementTab } = portalPage.portalSettingsPage
        const { createRulesetDialog } = rulesetManagementTab

        const retryIndex = test.info().retry + 1
        const rulesetName = `${ALIAS_PREFIX}-Invalid-File-${retryIndex}-${testIdN}`

        usedResources.addFiles(FILE_INVALID_EXTENSION)

        await navigateToRulesetManagement(portalPage)

        await rulesetManagementTab.openCreateRulesetDialog()

        await test.step('Fill in a unique name', async () => {
          await createRulesetDialog.fillForm({
            rulesetName,
          })
        })

        await test.step('Attempt to upload the invalid extension file', async () => {
          const file = { path: FILE_INVALID_EXTENSION.path, name: FILE_INVALID_EXTENSION.name }
          await createRulesetDialog.fillForm({
            rulesetName,
            file,
          })
        })

        await createRulesetDialog.createBtn.click()

        await test.step('Verify error message is displayed within the dialog', async () => {
          await expect(createRulesetDialog.fileUploadAlert).toBeVisible()
          await expect(createRulesetDialog.fileUploadAlert).toContainText(MSG_INVALID_FILE_FORMAT)
        })

        await test.step('Verify dialog remains open', async () => {
          await expect(createRulesetDialog.title).toBeVisible()
        })
      })
    })

    test.describe('Ruleset Activation', () => {
      test('P-AQ-RM-ACTIVATE-1 Activate a new ruleset and verify deactivation of previous active', {
        tag: '@smoke',
      }, async ({ sysadminPage: page, lintRulesetTdm, usedResources }) => {
        const portalPage = new PortalPage(page)
        const { rulesetManagementTab } = portalPage.portalSettingsPage
        const { activateRulesetDialog } = rulesetManagementTab

        const retryIndex = test.info().retry + 1
        const rulesetName = `${ALIAS_PREFIX}-Activate-New-${retryIndex}-${testIdN}`

        usedResources.addFiles(FILE_SIMPLE_RULESET)

        // Create a new ruleset for activation
        await lintRulesetTdm.createRuleset({
          name: rulesetName,
          apiType: LintRulesetApiTypes.OAS_3_0,
          linter: LintRulesetLinters.SPECTRAL,
          file: FILE_SIMPLE_RULESET,
        })

        await lintRulesetTdm.activateRuleset(RUL_GENERAL_OAS30_N)

        await navigateToRulesetManagement(portalPage)

        const rulesetRow = rulesetManagementTab.getRulesetRow(rulesetName)
        const previouslyActiveRow = rulesetManagementTab.getRulesetRow(RUL_GENERAL_OAS30_N.name)

        await test.step('Verify previously active ruleset is active', async () => {
          await expect(previouslyActiveRow.statusCell).toHaveText(STATUS_ACTIVE)
        })

        await test.step('Click the Activate button for the inactive ruleset', async () => {
          await rulesetRow.openActivateRulesetDialog()
        })

        await test.step('Confirm the action in the dialog', async () => {
          await activateRulesetDialog.proceedBtn.click()
        })

        await test.step('Verify the status of the target ruleset changes to Active', async () => {
          await expect(rulesetRow.statusCell).toHaveText(STATUS_ACTIVE)
        })

        await test.step('Verify its activation history is updated', async () => {
          await expect(rulesetRow.activationHistoryCell).toHaveText(`${currentFormattedDate} - ...`)
          await expect(rulesetRow.infoIcon).toBeHidden()
        })

        await test.step('Verify the status of the previously active ruleset changes to Inactive', async () => {
          await expect(previouslyActiveRow.statusCell).toHaveText(STATUS_INACTIVE)
        })
      })

      test('P-AQ-RM-ACTIVATE-2 Verify Activate button is disabled for an already active ruleset', async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { rulesetManagementTab } = portalPage.portalSettingsPage

        await navigateToRulesetManagement(portalPage)

        const firstRulesetRow = rulesetManagementTab.getRulesetRow(1)

        await test.step('Verify first ruleset row is active', async () => {
          await expect(firstRulesetRow.statusCell).toHaveText(STATUS_ACTIVE)
        })

        await firstRulesetRow.hover()

        await test.step('Verify Activate button is disabled', async () => {
          await expect(firstRulesetRow.activateBtn).toBeDisabled()
        })
      })

      test('P-AQ-RM-ACTIVATE-3 Verify activation history tooltip for a ruleset with multiple activations', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { rulesetManagementTab } = portalPage.portalSettingsPage

        await navigateToRulesetManagement(portalPage)

        const rulesetRow = rulesetManagementTab.getRulesetRow(RUL_PREVIOUSLY_ACTIVE_OAS30_N.name)
        const tooltip = rulesetRow.activationHistoryTooltip
        const firstRecord = tooltip.getActivationRecord(1)
        const secondRecord = tooltip.getActivationRecord(2)

        await test.step('Hover over the info icon in the Activation History column', async () => {
          await rulesetRow.infoIcon.hover()
        })

        await test.step('Verify tooltip appears with at least two activation records', async () => {
          await expect(tooltip.title).toBeVisible()
          await expect(firstRecord).toBeVisible()
          await expect(secondRecord).toBeVisible()
        })

        await test.step('Verify activation history dates format', async () => {
          await expect(firstRecord).toHaveText(`${currentFormattedDate} - ${currentFormattedDate}`)
          await expect(secondRecord).toHaveText(`${currentFormattedDate} - ${currentFormattedDate}`)
        })
      })
    })

    test.describe('Ruleset Deletion', () => {
      test('P-AQ-RM-DEL-1 Verify deletion is disabled for an active ruleset', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { rulesetManagementTab } = portalPage.portalSettingsPage

        await navigateToRulesetManagement(portalPage)

        const firstRulesetRow = rulesetManagementTab.getRulesetRow(1)

        await test.step('Verify first ruleset row is active', async () => {
          await expect(firstRulesetRow.statusCell).toHaveText(STATUS_ACTIVE)
        })

        await firstRulesetRow.hover()

        await firstRulesetRow.deleteBtn.hover({ force: true })

        await test.step('Verify tooltip reads Cannot delete active ruleset', async () => {
          await expect(portalPage.tooltip).toHaveText(TIP_CANNOT_DELETE_ACTIVE)
        })
      })

      test('P-AQ-RM-DEL-2 Verify deletion is disabled for a previously activated ruleset', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { rulesetManagementTab } = portalPage.portalSettingsPage

        await navigateToRulesetManagement(portalPage)

        const rulesetRow = rulesetManagementTab.getRulesetRow(RUL_PREVIOUSLY_ACTIVE_OAS30_N.name)

        await test.step('Verify ruleset is inactive', async () => {
          await expect(rulesetRow.statusCell).toHaveText(STATUS_INACTIVE)
        })

        await rulesetRow.hover()

        await rulesetRow.deleteBtn.hover({ force: true })

        await test.step('Verify tooltip reads The ruleset cannot be deleted due to existing versions', async () => {
          await expect(portalPage.tooltip).toHaveText(TIP_CANNOT_DELETE_WITH_HISTORY)
        })

        await test.step('Verify activation history date format for inactive ruleset with history', async () => {
          await expect(rulesetRow.activationHistoryCell).toHaveText(`${currentFormattedDate} - ${currentFormattedDate}`)
        })
      })

      test('P-AQ-RM-DEL-3 Delete a never-activated inactive ruleset', async ({ sysadminPage: page, lintRulesetTdm, usedResources }) => {
        const portalPage = new PortalPage(page)
        const { rulesetManagementTab } = portalPage.portalSettingsPage
        const { deleteRulesetDialog } = rulesetManagementTab

        const retryIndex = test.info().retry + 1
        const rulesetName = `${ALIAS_PREFIX}-Delete-NeverActivated-${retryIndex}-${testIdN}`

        usedResources.addFiles(FILE_SIMPLE_RULESET)

        await lintRulesetTdm.createRuleset({
          name: rulesetName,
          apiType: LintRulesetApiTypes.OAS_3_0,
          linter: LintRulesetLinters.SPECTRAL,
          file: FILE_SIMPLE_RULESET,
        })

        await navigateToRulesetManagement(portalPage)

        const rulesetRow = rulesetManagementTab.getRulesetRow(rulesetName)
        await rulesetRow.openDeleteRulesetDialog()

        await test.step('Confirm deletion', async () => {
          await deleteRulesetDialog.deleteBtn.click()
        })

        await test.step('Verify success notification appears', async () => {
          await expect(portalPage.snackbar).toContainText(MSG_RULESET_DELETED_SUCCESS(rulesetName))
        })

        await test.step('Verify the ruleset is removed from the table', async () => {
          await expect(rulesetRow).toBeHidden()
        })
      })
    })

    test.describe('Ruleset Export and Sharing', () => {
      test('P-AQ-RM-SHARE-1 Download a ruleset file', async ({ sysadminPage: page, usedResources }) => {
        const portalPage = new PortalPage(page)
        const { rulesetManagementTab } = portalPage.portalSettingsPage

        usedResources.addFiles(FILE_SIMPLE_RULESET)

        await navigateToRulesetManagement(portalPage)

        const rulesetRow = rulesetManagementTab.getRulesetRow(RUL_GENERAL_OAS30_N.name)
        const downloadedFile = await rulesetRow.downloadRuleset()

        await test.step('Verify the browser initiates a download of the correct ruleset file', async () => {
          await expectFile(downloadedFile).toHaveName(FILE_SIMPLE_RULESET.name)
          await expectFile(downloadedFile).toContainText(FILE_SIMPLE_RULESET.testMeta!.yamlString!)
        })
      })

      test('P-AQ-RM-SHARE-2 Copy a ruleset link and verify URL format', async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { rulesetManagementTab } = portalPage.portalSettingsPage

        await navigateToRulesetManagement(portalPage)

        const rulesetRow = rulesetManagementTab.getRulesetRow(RUL_GENERAL_OAS30_N.name)
        const copiedUrl = await rulesetRow.copyPublicUrl()

        await test.step('Verify success notification appears', async () => {
          await expect(portalPage.snackbar).toContainText(MSG_PUBLIC_URL_COPIED_SUCCESS)
        })

        await test.step('Verify clipboard contains a valid, direct URL', async () => {
          await expectText(copiedUrl).toContain(`/api-linter/api/v1/rulesets/${RUL_GENERAL_OAS30_N.id}/data`)
        })
      })
    })

    test.describe('Filtering and Data Display', () => {
      test('P-AQ-RM-FILTER-1 Filter rulesets by API type', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { rulesetManagementTab } = portalPage.portalSettingsPage

        await navigateToRulesetManagement(portalPage)

        await test.step('Verify OAS 3.0 rulesets are visible', async () => {
          const rulesetRow = rulesetManagementTab.getRulesetRow(RUL_INACTIVE_OAS30_N.name)
          await expect(rulesetRow.nameCell).toBeVisible()
        })

        await test.step('Switch the API type selector from OAS 3.0 to OAS 3.1', async () => {
          await rulesetManagementTab.rulesetTypeSlt.click()
          const oas31Option = rulesetManagementTab.rulesetTypeSlt.getListItem(
            RULESET_API_TYPE_TITLE_MAP[LintRulesetApiTypes.OAS_3_1],
          )
          await oas31Option.click()
        })

        await test.step('Verify the table updates to show only the rulesets for OAS 3.1', async () => {
          const rulesetRow = rulesetManagementTab.getRulesetRow(RUL_INACTIVE_OAS31_N.name)
          await expect(rulesetRow.nameCell).toBeVisible()

          // Verify OAS 3.0 ruleset is not visible
          const oas30RulesetRow = rulesetManagementTab.getRulesetRow(RUL_INACTIVE_OAS30_N.name)
          await expect(oas30RulesetRow.nameCell).toBeHidden()
        })
      })
    })
  })

  test.describe('Quality Summary Tab', () => {
    const {
      FAILED_DOCS_COUNT,
      ISSUE_COUNTS_CHANGED,
      ISSUE_COUNTS_INITIAL,
      MOCK_FAILED_DOC_1,
      MOCK_FAILED_DOC_2,
      MSG_CHECKING_VALIDATION,
      MSG_NO_VALIDATION_RESULTS,
      MSG_VALIDATION_IN_PROGRESS,
      MULTI_DOC_ISSUE_COUNTS_CHANGED,
      MULTI_DOC_ISSUE_COUNTS_INITIAL,
      PKG_AQ_SUMMARY_N,
      TIP_ISSUE_ERROR,
      TIP_ISSUE_HINT,
      TIP_ISSUE_INFO,
      TIP_ISSUE_WARNING,
      TIP_VALIDATION_FAILED,
      V_MIXED_REST_GQL_N,
      V_MULTI_SPEC_N,
      V_OAS30_N,
      mockValidationSummaryError,
      mockValidationSummaryInProgress,
      mockValidationSummaryLoading,
      mockValidationSummaryNotFound,
      setupQualitySummaryTabTestData,
    } = aqSummary

    let RUL_SUMMARY_OAS30_N: RulesetWithFile
    let RUL_SUMMARY_OAS31_N: RulesetWithFile
    let RUL_ALT_OAS30_N: RulesetWithFile

    test.beforeAll(async ({ apihubTDM, lintRulesetTdm }) => {
      ({
        RUL_SUMMARY_OAS30_N,
        RUL_SUMMARY_OAS31_N,
        RUL_ALT_OAS30_N,
      } = await setupQualitySummaryTabTestData(apihubTDM, lintRulesetTdm, testIdN))
    })

    test.describe('UI Visibility and Access Control', () => {
      test('P-AQ-SM-UI-1 Verify Quality Validation section visibility for REST API', {
        tag: '@smoke',
      }, async ({ sysadminPage: page, usedResources }) => {
        const portalPage = new PortalPage(page)
        const { restApi } = portalPage.versionPackagePage.overviewTab.summaryTab.body
        const { qualityValidation } = restApi

        registerTestResources(usedResources, {
          rulesets: RUL_SUMMARY_OAS30_N,
          versions: V_OAS30_N,
        })

        await portalPage.gotoVersion(V_OAS30_N)

        await test.step('Verify REST API section is visible', async () => {
          await expect(restApi.operations).toBeVisible()
        })

        await test.step('Verify the Quality Validation section is visible within the REST section', async () => {
          await expect(qualityValidation.title).toBeVisible()
        })
      })

      test('P-AQ-SM-UI-2 Verify Mixed API Types display - REST with GraphQL', async ({ sysadminPage: page, usedResources }) => {
        const portalPage = new PortalPage(page)
        const { body } = portalPage.versionPackagePage.overviewTab.summaryTab
        const { restApi, graphQl } = body

        registerTestResources(usedResources, {
          rulesets: RUL_SUMMARY_OAS30_N,
          versions: V_MIXED_REST_GQL_N,
        })

        await portalPage.gotoVersion(V_MIXED_REST_GQL_N)

        await test.step('Verify REST API section is visible WITH Quality Validation section', async () => {
          await expect(restApi.operations).toBeVisible()
          await expect(restApi.qualityValidation.title).toBeVisible()
        })

        await test.step('Verify GraphQL API section is visible WITHOUT Quality Validation section', async () => {
          await expect(graphQl.operations).toBeVisible()
          await expect(graphQl.qualityValidation.title).toBeHidden()
        })
      })

      test('P-AQ-SM-UI-3-M Verify Quality Validation section is hidden when linter is disabled', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        // No resources registered - test uses mocked API, file content doesn't affect outcome
        const portalPage = new PortalPage(page)
        const { restApi } = portalPage.versionPackagePage.overviewTab.summaryTab.body
        const { qualityValidation } = restApi

        await mockSystemConfigurationToDisableLinter(page)

        await portalPage.gotoVersion(V_OAS30_N)

        await test.step('Verify REST API section is visible to confirm page loaded correctly', async () => {
          await expect(restApi.operations).toBeVisible()
        })

        await test.step('Verify the Quality Validation section is NOT visible', async () => {
          await expect(qualityValidation.title).toBeHidden()
        })
      })
    })

    test.describe('Content', () => {
      test('P-AQ-SM-CONTENT-1 Verify Ruleset info for single document', {
        tag: '@smoke',
      }, async ({ sysadminPage: page, usedResources }) => {
        const portalPage = new PortalPage(page)
        const { qualityValidation } = portalPage.versionPackagePage.overviewTab.summaryTab.body.restApi

        registerTestResources(usedResources, {
          rulesets: RUL_SUMMARY_OAS30_N,
          versions: V_OAS30_N,
        })

        await portalPage.gotoVersion(V_OAS30_N)

        await test.step('Verify one ruleset is listed', async () => {
          await expect(qualityValidation.getValidationRuleset()).toHaveCount(1)
        })

        const ruleset = qualityValidation.getValidationRuleset(RUL_SUMMARY_OAS30_N.name)

        await test.step('Verify ruleset displays correct info', async () => {
          await expect(ruleset.nameLink).toBeVisible()
          await expect(ruleset.apiTypeChip).toHaveText(OAS_30_LABEL)
          await expect(ruleset.statusChip).toHaveText(STATUS_ACTIVE)
        })
      })

      test('P-AQ-SM-CONTENT-2 Verify Ruleset list items for multi-document version', {
        tag: '@smoke',
      }, async ({ sysadminPage: page, usedResources }) => {
        const portalPage = new PortalPage(page)
        const { qualityValidation } = portalPage.versionPackagePage.overviewTab.summaryTab.body.restApi

        registerTestResources(usedResources, {
          rulesets: [RUL_SUMMARY_OAS30_N, RUL_SUMMARY_OAS31_N],
          versions: V_MULTI_SPEC_N,
        })

        await portalPage.gotoVersion(V_MULTI_SPEC_N)

        await test.step('Verify two rulesets are listed', async () => {
          await expect(qualityValidation.getValidationRuleset()).toHaveCount(2)
        })

        const firstRuleset = qualityValidation.getValidationRuleset(RUL_SUMMARY_OAS30_N.name)
        const secondRuleset = qualityValidation.getValidationRuleset(RUL_SUMMARY_OAS31_N.name)

        await test.step('Verify first ruleset displays correct info', async () => {
          await expect(firstRuleset.nameLink).toBeVisible()
          await expect(firstRuleset.apiTypeChip).toHaveText(OAS_30_LABEL)
          await expect(firstRuleset.statusChip).toHaveText(STATUS_ACTIVE)
        })

        await test.step('Verify second ruleset displays correct info', async () => {
          await expect(secondRuleset.nameLink).toBeVisible()
          await expect(secondRuleset.apiTypeChip).toHaveText(OAS_31_LABEL)
          await expect(secondRuleset.statusChip).toHaveText(STATUS_ACTIVE)
        })
      })

      test('P-AQ-SM-CONTENT-3 Verify Issue Counts tooltip content', async ({ sysadminPage: page, usedResources }) => {
        const portalPage = new PortalPage(page)
        const { qualityValidation } = portalPage.versionPackagePage.overviewTab.summaryTab.body.restApi

        registerTestResources(usedResources, {
          rulesets: RUL_SUMMARY_OAS30_N,
          versions: V_OAS30_N,
        })

        await portalPage.gotoVersion(V_OAS30_N)

        await test.step('Verify issue counts are visible', async () => {
          await expect(qualityValidation.errorCount).toBeVisible()
          await expect(qualityValidation.warningCount).toBeVisible()
          await expect(qualityValidation.infoCount).toBeVisible()
          await expect(qualityValidation.hintCount).toBeVisible()
        })

        await test.step('Hover over the Error count and verify tooltip', async () => {
          await qualityValidation.errorCount.hover()
          await expect(portalPage.tooltip).toHaveText(TIP_ISSUE_ERROR)
        })

        await test.step('Hover over the Warning count and verify tooltip', async () => {
          await qualityValidation.warningCount.hover()
          await expect(portalPage.tooltip).toHaveText(TIP_ISSUE_WARNING)
        })

        await test.step('Hover over the Info count and verify tooltip', async () => {
          await qualityValidation.infoCount.hover()
          await expect(portalPage.tooltip).toHaveText(TIP_ISSUE_INFO)
        })

        await test.step('Hover over the Hint count and verify tooltip', async () => {
          await qualityValidation.hintCount.hover()
          await expect(portalPage.tooltip).toHaveText(TIP_ISSUE_HINT)
        })
      })

      test('P-AQ-SM-CONTENT-4-M Verify Validation Failed state', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        // No resources registered - test uses mocked validation error, file content doesn't affect outcome
        const portalPage = new PortalPage(page)
        const { qualityValidation } = portalPage.versionPackagePage.overviewTab.summaryTab.body.restApi

        await mockValidationSummaryError(page)
        await portalPage.gotoVersion(V_OAS30_N)

        await test.step('Verify red warning icon is visible', async () => {
          await expect(qualityValidation.alertIcon).toBeVisible()
        })

        await test.step('Hover over warning icon and verify tooltip shows failure message', async () => {
          await qualityValidation.alertIcon.hover()
          await expect(portalPage.tooltip).toHaveText(TIP_VALIDATION_FAILED)
        })

        await test.step('Verify failed documents count', async () => {
          await expect(qualityValidation.failedDocuments).toHaveText(FAILED_DOCS_COUNT)
        })

        await test.step('Hover over info icon and verify tooltip shows failed document names', async () => {
          await qualityValidation.failedDocumentsInfoIcon.hover()
          await expect(portalPage.tooltip).toContainText(MOCK_FAILED_DOC_1)
          await expect(portalPage.tooltip).toContainText(MOCK_FAILED_DOC_2)
        })

        await test.step('Verify API Quality tab is disabled', async () => {
          await expect(portalPage.versionPackagePage.apiQualityTab).toBeDisabled()
        })

        await test.step('Hover over API Quality tab and verify tooltip', async () => {
          await portalPage.versionPackagePage.apiQualityTab.hover({ force: true })
          await expect(portalPage.tooltip).toHaveText('API quality check is failed')
        })

        // Direct URL navigation to API Quality tab when validation failed
        await test.step('Navigate directly to API Quality tab via URL', async () => {
          await portalPage.gotoVersion(V_OAS30_N, VERSION_API_QUALITY_TAB_REST)
        })

        await test.step('Verify placeholder is displayed on direct navigation', async () => {
          const { apiQualityTab } = portalPage.versionPackagePage
          await expect(apiQualityTab.noResultsPlaceholder).toBeVisible()
        })
      })
    })

    test.describe('Ruleset Info Popup Interactions', () => {
      test('P-AQ-SM-POPUP-1 Verify Ruleset Info Popup opens and displays correct content', {
        tag: '@smoke',
      }, async ({ sysadminPage: page, usedResources }) => {
        const portalPage = new PortalPage(page)
        const { summaryTab } = portalPage.versionPackagePage.overviewTab
        const { qualityValidation } = summaryTab.body.restApi

        registerTestResources(usedResources, {
          rulesets: RUL_SUMMARY_OAS30_N,
          versions: V_OAS30_N,
        })

        await portalPage.gotoVersion(V_OAS30_N)

        const ruleset = qualityValidation.getValidationRuleset(RUL_SUMMARY_OAS30_N.name)
        await ruleset.nameLink.click()

        await verifyRulesetInfoDialogContent(portalPage, RUL_SUMMARY_OAS30_N, STATUS_ACTIVE)
      })

      test('P-AQ-SM-POPUP-2 Verify multiple Rulesets can be opened in multi-spec version', {
        tag: '@smoke',
      }, async ({ sysadminPage: page, usedResources }) => {
        const portalPage = new PortalPage(page)
        const { summaryTab } = portalPage.versionPackagePage.overviewTab
        const { qualityValidation } = summaryTab.body.restApi
        const { rulesetInfoDialog } = portalPage.versionPackagePage

        const firstRuleset = qualityValidation.getValidationRuleset(RUL_SUMMARY_OAS30_N.name)
        const secondRuleset = qualityValidation.getValidationRuleset(RUL_SUMMARY_OAS31_N.name)

        registerTestResources(usedResources, {
          rulesets: [RUL_SUMMARY_OAS30_N, RUL_SUMMARY_OAS31_N],
          versions: V_MULTI_SPEC_N,
        })

        await portalPage.gotoVersion(V_MULTI_SPEC_N)

        await test.step('Click on the first ruleset and verify popup content', async () => {
          await firstRuleset.nameLink.click()
          await verifyRulesetInfoDialogContent(portalPage, RUL_SUMMARY_OAS30_N, STATUS_ACTIVE)
        })

        await rulesetInfoDialog.closeBtn.click()

        await test.step('Click on the second ruleset and verify popup content', async () => {
          await secondRuleset.nameLink.click()
          await verifyRulesetInfoDialogContent(portalPage, RUL_SUMMARY_OAS31_N, STATUS_ACTIVE)
        })
      })

      test('P-AQ-SM-POPUP-3 Verify Download ruleset file', async ({ sysadminPage: page, usedResources }) => {
        const portalPage = new PortalPage(page)
        const { summaryTab } = portalPage.versionPackagePage.overviewTab
        const { qualityValidation } = summaryTab.body.restApi

        registerTestResources(usedResources, {
          rulesets: RUL_SUMMARY_OAS30_N,
          versions: V_OAS30_N,
        })

        await portalPage.gotoVersion(V_OAS30_N)

        const ruleset = qualityValidation.getValidationRuleset(RUL_SUMMARY_OAS30_N.name)
        await ruleset.nameLink.click()

        await verifyRulesetDownload(portalPage, RUL_SUMMARY_OAS30_N)
      })

      test('P-AQ-SM-POPUP-4 Verify Copy Link to ruleset', async ({ sysadminPage: page, usedResources }) => {
        const portalPage = new PortalPage(page)
        const { summaryTab } = portalPage.versionPackagePage.overviewTab
        const { qualityValidation } = summaryTab.body.restApi

        registerTestResources(usedResources, {
          rulesets: RUL_SUMMARY_OAS30_N,
          versions: V_OAS30_N,
        })

        await portalPage.gotoVersion(V_OAS30_N)

        const ruleset = qualityValidation.getValidationRuleset(RUL_SUMMARY_OAS30_N.name)
        await ruleset.nameLink.click()

        await verifyRulesetCopyLink(portalPage, RUL_SUMMARY_OAS30_N)
      })

      test('P-AQ-SM-POPUP-5 Verify Activation History table content', async ({ sysadminPage: page, usedResources }) => {
        const portalPage = new PortalPage(page)
        const { summaryTab } = portalPage.versionPackagePage.overviewTab
        const { qualityValidation } = summaryTab.body.restApi
        const { rulesetInfoDialog } = portalPage.versionPackagePage

        const ruleset = qualityValidation.getValidationRuleset(RUL_SUMMARY_OAS30_N.name)

        registerTestResources(usedResources, {
          rulesets: RUL_SUMMARY_OAS30_N,
          versions: V_OAS30_N,
        })

        await portalPage.gotoVersion(V_OAS30_N)

        await ruleset.nameLink.click()

        const firstRecord = rulesetInfoDialog.getActivationRecord(1)
        const secondRecord = rulesetInfoDialog.getActivationRecord(2)

        await test.step('Verify activation history contains at least two rows with correct date formats', async () => {
          await expect(firstRecord).toBeVisible()
          await expect(secondRecord).toBeVisible()
          await expect(firstRecord).toContainText(`${currentFormattedDate} - ...`)
          await expect(secondRecord).toContainText(`${currentFormattedDate} - ${currentFormattedDate}`)
        })
      })
    })

    test.describe('Manual Validation', () => {
      test.skip('P-AQ-SM-RUN-1 Verify re-validation updates status and issue counts for single document', {
        tag: '@smoke',
        annotation: { type: 'Issue', description: 'https://github.com/Netcracker/qubership-apihub/issues/437' },
      }, async ({ sysadminPage: page, lintRulesetTdm }) => {
        const portalPage = new PortalPage(page)
        const { qualityValidation } = portalPage.versionPackagePage.overviewTab.summaryTab.body.restApi

        // Setup: Ensure initial state with Summary ruleset active, then run validation, then activate Alt ruleset
        await test.step('Setup initial state via API', async () => {
          await lintRulesetTdm.activateRuleset(RUL_SUMMARY_OAS30_N)
          await lintRulesetTdm.runValidation({
            packageId: PKG_AQ_SUMMARY_N.packageId,
            version: V_OAS30_N.version,
          })
          await lintRulesetTdm.activateRuleset(RUL_ALT_OAS30_N)
        })

        await portalPage.gotoVersion(V_OAS30_N)

        await test.step('Verify initial state shows Inactive status and original issue counts', async () => {
          const ruleset = qualityValidation.getValidationRuleset(RUL_SUMMARY_OAS30_N.name)
          await expect(ruleset.statusChip).toHaveText(STATUS_INACTIVE)
          await expect(qualityValidation.errorCount).toHaveText(ISSUE_COUNTS_INITIAL.error)
          await expect(qualityValidation.warningCount).toHaveText(ISSUE_COUNTS_INITIAL.warning)
          await expect(qualityValidation.infoCount).toHaveText(ISSUE_COUNTS_INITIAL.info)
          await expect(qualityValidation.hintCount).toHaveText(ISSUE_COUNTS_INITIAL.hint)
        })

        await qualityValidation.runValidationLink.click()

        await test.step('Wait for validation to complete and verify status and issue counts updated', async () => {
          const ruleset = qualityValidation.getValidationRuleset(RUL_SUMMARY_OAS30_N.name)
          await expect(ruleset.statusChip).toHaveText(STATUS_ACTIVE)
          await expect(qualityValidation.errorCount).toHaveText(ISSUE_COUNTS_CHANGED.error)
          await expect(qualityValidation.warningCount).toHaveText(ISSUE_COUNTS_CHANGED.warning)
          await expect(qualityValidation.infoCount).toHaveText(ISSUE_COUNTS_CHANGED.info)
          await expect(qualityValidation.hintCount).toHaveText(ISSUE_COUNTS_CHANGED.hint)
        })
      })

      test.skip('P-AQ-SM-RUN-2 Verify re-validation updates aggregated issue counts for multi-document version', {
        tag: '@smoke',
        annotation: { type: 'Issue', description: 'https://github.com/Netcracker/qubership-apihub/issues/437' },
      }, async ({ sysadminPage: page, lintRulesetTdm }) => {
        const portalPage = new PortalPage(page)
        const { qualityValidation } = portalPage.versionPackagePage.overviewTab.summaryTab.body.restApi

        // Setup: Ensure both rulesets active, run validation, then make OAS 3.0 inactive
        await test.step('Setup initial state via API', async () => {
          await lintRulesetTdm.activateRuleset(RUL_SUMMARY_OAS30_N)
          await lintRulesetTdm.activateRuleset(RUL_SUMMARY_OAS31_N)
          await lintRulesetTdm.runValidation({
            packageId: PKG_AQ_SUMMARY_N.packageId,
            version: V_MULTI_SPEC_N.version,
          })
          await lintRulesetTdm.activateRuleset(RUL_ALT_OAS30_N)
        })

        await portalPage.gotoVersion(V_MULTI_SPEC_N)

        await test.step('Verify initial state: OAS 3.0 shows Inactive, OAS 3.1 shows Active', async () => {
          const firstRuleset = qualityValidation.getValidationRuleset(RUL_SUMMARY_OAS30_N.name)
          const secondRuleset = qualityValidation.getValidationRuleset(RUL_SUMMARY_OAS31_N.name)
          await expect(firstRuleset.statusChip).toHaveText(STATUS_INACTIVE)
          await expect(secondRuleset.statusChip).toHaveText(STATUS_ACTIVE)
        })

        await test.step('Verify aggregated counts initially', async () => {
          await expect(qualityValidation.errorCount).toHaveText(MULTI_DOC_ISSUE_COUNTS_INITIAL.error)
          await expect(qualityValidation.warningCount).toHaveText(MULTI_DOC_ISSUE_COUNTS_INITIAL.warning)
          await expect(qualityValidation.infoCount).toHaveText(MULTI_DOC_ISSUE_COUNTS_INITIAL.info)
          await expect(qualityValidation.hintCount).toHaveText(MULTI_DOC_ISSUE_COUNTS_INITIAL.hint)
        })

        await qualityValidation.runValidationLink.click()

        await test.step('Wait for validation to complete and verify both rulesets show Active and aggregated counts updated', async () => {
          const firstRuleset = qualityValidation.getValidationRuleset(RUL_SUMMARY_OAS30_N.name)
          const secondRuleset = qualityValidation.getValidationRuleset(RUL_SUMMARY_OAS31_N.name)
          await expect(firstRuleset.statusChip).toHaveText(STATUS_ACTIVE)
          await expect(secondRuleset.statusChip).toHaveText(STATUS_ACTIVE)
          await expect(qualityValidation.errorCount).toHaveText(MULTI_DOC_ISSUE_COUNTS_CHANGED.error)
          await expect(qualityValidation.warningCount).toHaveText(MULTI_DOC_ISSUE_COUNTS_CHANGED.warning)
          await expect(qualityValidation.infoCount).toHaveText(MULTI_DOC_ISSUE_COUNTS_CHANGED.info)
          await expect(qualityValidation.hintCount).toHaveText(MULTI_DOC_ISSUE_COUNTS_CHANGED.hint)
        })
      })
    })

    test.describe('Status Transitions', () => {
      test('P-AQ-SM-STATUS-1-M Verify Not Validated state display', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        // No resources registered - test uses mocked 404 response, file content doesn't affect outcome
        const portalPage = new PortalPage(page)
        const { qualityValidation } = portalPage.versionPackagePage.overviewTab.summaryTab.body.restApi

        await mockValidationSummaryNotFound(page)
        await portalPage.gotoVersion(V_OAS30_N)

        await expect(qualityValidation.placeholder).toContainText(MSG_NO_VALIDATION_RESULTS)
        await expect(qualityValidation.runValidationLink).toBeVisible()
      })

      test('P-AQ-SM-STATUS-2-M Verify Checking status display', async ({ sysadminPage: page }) => {
        // No resources registered - test uses mocked loading state, file content doesn't affect outcome
        const portalPage = new PortalPage(page)
        const { qualityValidation } = portalPage.versionPackagePage.overviewTab.summaryTab.body.restApi

        await mockValidationSummaryLoading(page)
        await portalPage.gotoVersion(V_OAS30_N)

        await expect(qualityValidation.placeholder).toContainText(MSG_CHECKING_VALIDATION)
      })

      test('P-AQ-SM-STATUS-3-M Verify In Progress status display', async ({ sysadminPage: page }) => {
        // No resources registered - test uses mocked in-progress state, file content doesn't affect outcome
        const portalPage = new PortalPage(page)
        const { qualityValidation } = portalPage.versionPackagePage.overviewTab.summaryTab.body.restApi

        await mockValidationSummaryInProgress(page)
        await portalPage.gotoVersion(V_OAS30_N)

        await test.step('Verify placeholder shows in progress message', async () => {
          await expect(qualityValidation.placeholder).toContainText(MSG_VALIDATION_IN_PROGRESS)
        })

        await test.step('Verify API Quality tab is disabled', async () => {
          await expect(portalPage.versionPackagePage.apiQualityTab).toBeDisabled()
        })

        await test.step('Hover over API Quality tab and verify tooltip', async () => {
          await portalPage.versionPackagePage.apiQualityTab.hover({ force: true })
          await expect(portalPage.tooltip).toHaveText('API quality check is in progress')
        })
      })
    })
  })

  test.describe('API Quality Tab', () => {
    const {
      FILE_TAB_OAS30,
      FILE_TAB_OAS31,
      V_AQ_TAB_MIXED_N,
      V_AQ_TAB_MULTI_N,
    } = aqTab

    // Ruleset data
    let RUL_QUALITY_TAB_OAS30_N: RulesetWithFile
    let RUL_QUALITY_TAB_OAS31_N: RulesetWithFile

    const {
      ISSUE_TEST_CASES,
      MSG_ERROR_1,
      MSG_HINT_1,
      MSG_INFO_1,
      MSG_OVERLAP_ERROR_1,
      MSG_WARNING_1,
      TEXT_OVERLAP_OPERATION,
    } = aqTab

    const {
      closeAndVerifyProblemPopup,
      navigateToApiQualityTab,
      openProblemPopupForOverlappingIssue,
      openProblemPopupViaAltF8,
      openProblemPopupViaTooltip,
      switchToFormat,
      switchToTestDocument,
      verifyIssueNavigationHighlight,
      verifyProblemPopupContent,
      verifyTooltipDisappears,
      verifyTooltipOnHover,
      verifyValidationIssuesSorting,
    } = aqTab

    test.beforeAll(async ({ apihubTDM, lintRulesetTdm }) => {
      ({
        RUL_QUALITY_TAB_OAS30_N,
        RUL_QUALITY_TAB_OAS31_N,
      } = await aqTab.setupApiQualityTabTestData(apihubTDM, lintRulesetTdm, testIdN))
    })

    test.describe('UI Visibility and Navigation', () => {
      test('P-AQ-TAB-UI-1 Verify API Quality Tab visibility and navigation', {
        tag: '@smoke',
      }, async ({ sysadminPage: page, usedResources }) => {
        const portalPage = new PortalPage(page)
        const { apiQualityTab } = portalPage.versionPackagePage

        registerTestResources(usedResources, {
          rulesets: RUL_QUALITY_TAB_OAS31_N,
          versions: { ...V_AQ_TAB_MIXED_N, files: [{ file: FILE_TAB_OAS31 }] },
        })

        await test.step('Navigate to the Package Version page', async () => {
          await portalPage.gotoVersion(V_AQ_TAB_MIXED_N)
        })

        await test.step('Open the API Quality tab', async () => {
          await apiQualityTab.click()
        })

        await test.step('Verify API Quality tab opening and document selector', async () => {
          await expect(apiQualityTab.documentSlt).toBeVisible()
          await expect(apiQualityTab.documentSlt).not.toBeEmpty()
        })

        await test.step('Verify the Issue List table is visible', async () => {
          await expect(apiQualityTab.getProblemRow(1)).toBeVisible()
        })

        await test.step('Verify the Document Viewer is visible', async () => {
          await expect(apiQualityTab.rawView).toBeVisible()
        })
      })

      test('P-AQ-TAB-UI-2-M Verify direct URL navigation shows placeholder when linter is disabled', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        // No resources registered - test uses mocked API, file content doesn't affect outcome
        const portalPage = new PortalPage(page)
        const { apiQualityTab } = portalPage.versionPackagePage

        await mockSystemConfigurationToDisableLinter(page)

        await test.step('Navigate directly to API Quality tab via URL', async () => {
          await portalPage.gotoVersion(V_AQ_TAB_MIXED_N, VERSION_API_QUALITY_TAB_REST)
        })

        await test.step('Verify no results placeholder is displayed', async () => {
          await expect(apiQualityTab.noResultsPlaceholder).toBeVisible()
        })
      })
    })

    test.describe('Document Selector', () => {
      // Note: Documents in selector are ordered alphabetically by their slug.
      // For V_AQ_TAB_MIXED_N: aq-tab-combo-oas31.yaml comes before aq-tab-large-oas30.yaml (combo < large).
      // So by default OAS 3.1 document is selected, which corresponds to RUL_QUALITY_TAB_OAS31_N.

      test.beforeEach(async ({ usedResources }) => {
        registerTestResources(usedResources, {
          rulesets: [RUL_QUALITY_TAB_OAS30_N, RUL_QUALITY_TAB_OAS31_N],
          versions: V_AQ_TAB_MULTI_N,
        })
      })

      test('P-AQ-TAB-DOC-1 Verify Document Selector list content and icons', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { apiQualityTab } = portalPage.versionPackagePage
        const { documentSlt } = apiQualityTab

        const oas30Doc = documentSlt.getListItem(FILE_TAB_OAS30.name)
        const oas31Doc = documentSlt.getListItem(FILE_TAB_OAS31.name)
        const graphqlDoc = documentSlt.getListItem(FILE_GRAPHQL.name)

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MULTI_N)

        await test.step('Open the Document Selector dropdown', async () => {
          await documentSlt.click()
        })

        await test.step('Verify list contains all validated OAS documents with correct icons and names', async () => {
          await expect(oas30Doc).toBeVisible()
          await expect(oas30Doc).toHaveIcon(OPENAPI_ICON)
          await expect(oas30Doc).toHaveText(FILE_TAB_OAS30.name)

          await expect(oas31Doc).toBeVisible()
          await expect(oas31Doc).toHaveIcon(OPENAPI_ICON)
          await expect(oas31Doc).toHaveText(FILE_TAB_OAS31.name)
        })

        await test.step('Verify the list does NOT contain the GraphQL document', async () => {
          await expect(graphqlDoc).toBeHidden()
        })
      })

      test('P-AQ-TAB-DOC-2 Verify Document Selector Search', async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { apiQualityTab } = portalPage.versionPackagePage
        const { documentSlt } = apiQualityTab

        const oas30Doc = documentSlt.getListItem(FILE_TAB_OAS30.name)
        const oas31Doc = documentSlt.getListItem(FILE_TAB_OAS31.name)

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MULTI_N)

        await test.step('Open the Document Selector dropdown', async () => {
          await documentSlt.click()
        })

        await test.step('Part of a word', async () => {
          await documentSlt.searchBar.fill('oas')
          await expect(oas30Doc).toBeVisible()
          await expect(oas31Doc).toBeVisible()
        })

        await test.step('Adding part of a word', async () => {
          await documentSlt.searchBar.type('30')
          await expect(oas30Doc).toBeVisible()
          await expect(oas31Doc).toBeHidden()
        })

        await test.step('Clearing a search query', async () => {
          await documentSlt.searchBar.clear()
          await expect(oas30Doc).toBeVisible()
          await expect(oas31Doc).toBeVisible()
        })

        await test.step('Case insensitive search', async () => {
          await documentSlt.searchBar.fill('OAS30')
          await expect(oas30Doc).toBeVisible()
          await expect(oas31Doc).toBeHidden()
        })

        await test.step('Invalid search query', async () => {
          await documentSlt.searchBar.fill('nonexistent-document')
          await expect(oas30Doc).toBeHidden()
          await expect(oas31Doc).toBeHidden()
        })
      })

      test('P-AQ-TAB-DOC-3 Verify Switching Documents', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { apiQualityTab } = portalPage.versionPackagePage
        const { documentSlt } = apiQualityTab

        const oas30Doc = documentSlt.getListItem(FILE_TAB_OAS30.name)

        const verifyDocumentContent = async (
          document: TestFile,
          ruleset: { id: string; name: string; apiType: LintRulesetApiType },
        ): Promise<void> => {
          const apiTypeLabel = RULESET_API_TYPE_TITLE_MAP[ruleset.apiType]

          await test.step(`Verify Document Selector shows "${document.name}"`, async () => {
            await expect(documentSlt).toHaveText(document.name)
          })

          await test.step(`Verify Issue List updates to show issues for "${document.name}"`, async () => {
            await expect(apiQualityTab.getProblemRow(1)).toBeVisible()
          })

          await test.step(`Verify Document Viewer updates to show content of "${document.name}"`, async () => {
            await expect(apiQualityTab.rawView).toBeVisible()
            await expect(apiQualityTab.rawView).toContainText(document.testMeta!.yamlString!)
          })

          await test.step(`Verify ruleset link updates to show ruleset for "${document.name}"`, async () => {
            await expect(apiQualityTab.nameLink).toBeVisible()
            await expect(apiQualityTab.nameLink).toContainText(ruleset.name)
            await expect(apiQualityTab.apiTypeChip).toBeVisible()
            await expect(apiQualityTab.apiTypeChip).toHaveText(apiTypeLabel)
            await expect(apiQualityTab.statusChip).toBeVisible()
            await expect(apiQualityTab.statusChip).toHaveText(STATUS_ACTIVE)
          })
        }

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MULTI_N)

        await verifyDocumentContent(FILE_TAB_OAS31, RUL_QUALITY_TAB_OAS31_N)

        await test.step(`Open Document Selector and select "${FILE_TAB_OAS30.name}"`, async () => {
          await documentSlt.click()
          await oas30Doc.click()
        })

        await verifyDocumentContent(FILE_TAB_OAS30, RUL_QUALITY_TAB_OAS30_N)
      })
    })

    test.describe('Ruleset and Dialog Interactions', () => {
      test.beforeEach(async ({ usedResources }) => {
        registerTestResources(usedResources, {
          rulesets: RUL_QUALITY_TAB_OAS31_N,
          versions: { ...V_AQ_TAB_MIXED_N, files: [{ file: FILE_TAB_OAS31 }] },
        })
      })

      test('P-AQ-TAB-RULE-1 Verify Ruleset Info Dialog opens', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const rulesetInfoDialog = await aqTab.navigateToApiQualityTabAndOpenRulesetDialog(portalPage, V_AQ_TAB_MIXED_N)

        await verifyRulesetInfoDialogContent(portalPage, RUL_QUALITY_TAB_OAS31_N, STATUS_ACTIVE)

        await test.step('Verify activation history first record', async () => {
          const firstRecord = rulesetInfoDialog.getActivationRecord(1)
          await expect(firstRecord).toBeVisible()
          await expect(firstRecord).toContainText(`${currentFormattedDate} - ...`)
        })
      })

      test('P-AQ-TAB-RULE-2 Verify Ruleset Dialog Download', async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)

        await aqTab.navigateToApiQualityTabAndOpenRulesetDialog(portalPage, V_AQ_TAB_MIXED_N)

        await verifyRulesetDownload(portalPage, RUL_QUALITY_TAB_OAS31_N)
      })

      test('P-AQ-TAB-RULE-3 Verify Ruleset Dialog Copy Link', async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)

        await aqTab.navigateToApiQualityTabAndOpenRulesetDialog(portalPage, V_AQ_TAB_MIXED_N)

        await verifyRulesetCopyLink(portalPage, RUL_QUALITY_TAB_OAS31_N)
      })
    })

    test.describe('Content and Interactions', () => {
      const { ERROR_ICON, WARNING_ICON, INFO_ICON, HINT_ICON } = aqTab

      test.beforeEach(async ({ usedResources }) => {
        registerTestResources(usedResources, {
          rulesets: RUL_QUALITY_TAB_OAS30_N,
          versions: { ...V_AQ_TAB_MIXED_N, files: [{ file: FILE_TAB_OAS30 }] },
        })
      })

      test('P-AQ-TAB-CONTENT-1 Verify Issue List displays issues with correct structure', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { apiQualityTab } = portalPage.versionPackagePage

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS30.name)

        await test.step('Verify issues display severity icons', async () => {
          // Verify Error icon
          const errorRow = apiQualityTab.getProblemRow(MSG_ERROR_1)
          await expect(errorRow.typeCell).toHaveIcon(ERROR_ICON)

          // Verify Warning icon
          const warningRow = apiQualityTab.getProblemRow(MSG_WARNING_1)
          await expect(warningRow.typeCell).toHaveIcon(WARNING_ICON)

          // Verify Info icon
          const infoRow = apiQualityTab.getProblemRow(MSG_INFO_1)
          await expect(infoRow.typeCell).toHaveIcon(INFO_ICON)

          // Verify Hint icon
          const hintRow = apiQualityTab.getProblemRow(MSG_HINT_1)
          await expect(hintRow.typeCell).toHaveIcon(HINT_ICON)
        })
      })

      test('P-AQ-TAB-CONTENT-2 Verify Format Toggler switches between YAML and JSON', async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { apiQualityTab } = portalPage.versionPackagePage
        const { rawView } = apiQualityTab

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS30.name)

        await test.step('Verify default format is YAML', async () => {
          await expect(rawView.yamlBtn).toBePressed()
          await expect(rawView).toContainText(FILE_TAB_OAS30.testMeta!.yamlString!)
        })

        await test.step('Click JSON in the toggler and verify Editor content is JSON', async () => {
          await rawView.jsonBtn.click()
          await expect(rawView.jsonBtn).toBePressed()
          await expect(rawView).toContainText(FILE_TAB_OAS30.testMeta!.jsonString!)
        })

        await test.step('Click YAML in the toggler and verify Editor content is YAML', async () => {
          await rawView.yamlBtn.click()
          await expect(rawView.yamlBtn).toBePressed()
          await expect(rawView).toContainText(FILE_TAB_OAS30.testMeta!.yamlString!)
        })
      })

      test.skip('P-AQ-TAB-CONTENT-3-YAML Verify Validation Issues Sorting in YAML', {
        tag: '@smoke',
        annotation: {
          type: 'Issue',
          description: 'https://github.com/Netcracker/qubership-apihub/issues/445',
        },
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS30.name)

        await verifyValidationIssuesSorting(portalPage)
      })

      test.skip('P-AQ-TAB-CONTENT-3-JSON Verify Validation Issues Sorting in JSON', {
        tag: '@smoke',
        annotation: {
          type: 'Issue',
          description: 'https://github.com/Netcracker/qubership-apihub/issues/445',
        },
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS30.name)
        await switchToFormat(portalPage, RAW_VIEW_FORMATS.JSON)

        await verifyValidationIssuesSorting(portalPage)
      })

      test('P-AQ-TAB-CONTENT-4-YAML Verify Issue Navigation highlights selected line in YAML', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS30.name)

        await verifyIssueNavigationHighlight(portalPage, 'yaml')
      })

      test('P-AQ-TAB-CONTENT-4-JSON Verify Issue Navigation highlights selected line in JSON', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS30.name)
        await switchToFormat(portalPage, RAW_VIEW_FORMATS.JSON)

        await verifyIssueNavigationHighlight(portalPage, 'json')
      })
    })

    test.describe('Problem Tooltip - Hover Behavior', () => {
      const { verifyComboTooltip, verifyMultiRuleTooltip } = aqTab

      test('P-AQ-TAB-TIP-1-YAML Verify Tooltip appears on hover over issue marker in YAML', {
        tag: '@smoke',
      }, async ({ sysadminPage: page, usedResources }) => {
        const portalPage = new PortalPage(page)

        registerTestResources(usedResources, {
          rulesets: RUL_QUALITY_TAB_OAS30_N,
          versions: { ...V_AQ_TAB_MIXED_N, files: [{ file: FILE_TAB_OAS30 }] },
        })

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS30.name)

        await verifyTooltipOnHover(portalPage)
      })

      test('P-AQ-TAB-TIP-1-JSON Verify Tooltip appears on hover over issue marker in JSON', {
        tag: '@smoke',
      }, async ({ sysadminPage: page, usedResources }) => {
        const portalPage = new PortalPage(page)

        registerTestResources(usedResources, {
          rulesets: RUL_QUALITY_TAB_OAS30_N,
          versions: { ...V_AQ_TAB_MIXED_N, files: [{ file: FILE_TAB_OAS30 }] },
        })

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS30.name)
        await switchToFormat(portalPage, RAW_VIEW_FORMATS.JSON)

        await verifyTooltipOnHover(portalPage)
      })

      test('P-AQ-TAB-TIP-2-YAML Verify Tooltip displays multiple issues of different types in YAML', {
        tag: '@smoke',
      }, async ({ sysadminPage: page, usedResources }) => {
        const portalPage = new PortalPage(page)

        registerTestResources(usedResources, {
          rulesets: RUL_QUALITY_TAB_OAS31_N,
          versions: { ...V_AQ_TAB_MIXED_N, files: [{ file: FILE_TAB_OAS31 }] },
        })

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS31.name)

        await verifyComboTooltip(portalPage)
      })

      test('P-AQ-TAB-TIP-2-JSON Verify Tooltip displays multiple issues of different types in JSON', {
        tag: '@smoke',
      }, async ({ sysadminPage: page, usedResources }) => {
        const portalPage = new PortalPage(page)

        registerTestResources(usedResources, {
          rulesets: RUL_QUALITY_TAB_OAS31_N,
          versions: { ...V_AQ_TAB_MIXED_N, files: [{ file: FILE_TAB_OAS31 }] },
        })

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS31.name)
        await switchToFormat(portalPage, RAW_VIEW_FORMATS.JSON)

        await verifyComboTooltip(portalPage)
      })

      test('P-AQ-TAB-TIP-3-YAML Verify Tooltip displays multiple issues of same type in YAML', {
        tag: '@smoke',
      }, async ({ sysadminPage: page, usedResources }) => {
        const portalPage = new PortalPage(page)

        registerTestResources(usedResources, {
          rulesets: RUL_QUALITY_TAB_OAS31_N,
          versions: { ...V_AQ_TAB_MIXED_N, files: [{ file: FILE_TAB_OAS31 }] },
        })

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS31.name)

        await verifyMultiRuleTooltip(portalPage)
      })

      test('P-AQ-TAB-TIP-3-JSON Verify Tooltip displays multiple issues of same type in JSON', {
        tag: '@smoke',
      }, async ({ sysadminPage: page, usedResources }) => {
        const portalPage = new PortalPage(page)

        registerTestResources(usedResources, {
          rulesets: RUL_QUALITY_TAB_OAS31_N,
          versions: { ...V_AQ_TAB_MIXED_N, files: [{ file: FILE_TAB_OAS31 }] },
        })

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS31.name)
        await switchToFormat(portalPage, RAW_VIEW_FORMATS.JSON)

        await verifyMultiRuleTooltip(portalPage)
      })

      test('P-AQ-TAB-TIP-4-YAML Verify Tooltip disappears when cursor leaves in YAML', async ({ sysadminPage: page, usedResources }) => {
        const portalPage = new PortalPage(page)

        registerTestResources(usedResources, {
          rulesets: RUL_QUALITY_TAB_OAS30_N,
          versions: { ...V_AQ_TAB_MIXED_N, files: [{ file: FILE_TAB_OAS30 }] },
        })

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS30.name)

        await verifyTooltipDisappears(portalPage, page)
      })

      test('P-AQ-TAB-TIP-4-JSON Verify Tooltip disappears when cursor leaves in JSON', async ({ sysadminPage: page, usedResources }) => {
        const portalPage = new PortalPage(page)

        registerTestResources(usedResources, {
          rulesets: RUL_QUALITY_TAB_OAS30_N,
          versions: { ...V_AQ_TAB_MIXED_N, files: [{ file: FILE_TAB_OAS30 }] },
        })

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS30.name)
        await switchToFormat(portalPage, RAW_VIEW_FORMATS.JSON)

        await verifyTooltipDisappears(portalPage, page)
      })
    })

    test.describe('Problem Popup', () => {
      test.beforeEach(async ({ usedResources }) => {
        registerTestResources(usedResources, {
          rulesets: RUL_QUALITY_TAB_OAS30_N,
          versions: { ...V_AQ_TAB_MIXED_N, files: [{ file: FILE_TAB_OAS30 }] },
        })
      })

      test('P-AQ-TAB-POPUP-1-YAML Verify Popup opens via View Problem button in YAML', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const [error1TestCase] = ISSUE_TEST_CASES

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS30.name)
        await openProblemPopupViaTooltip(portalPage, error1TestCase)

        await verifyProblemPopupContent(portalPage, error1TestCase)
      })

      test('P-AQ-TAB-POPUP-1-JSON Verify Popup opens via View Problem button in JSON', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const [error1TestCase] = ISSUE_TEST_CASES

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS30.name)
        await switchToFormat(portalPage, RAW_VIEW_FORMATS.JSON)
        await openProblemPopupViaTooltip(portalPage, error1TestCase)

        await verifyProblemPopupContent(portalPage, error1TestCase)
      })

      test.skip(
        'P-AQ-TAB-POPUP-1-BUG-449-YAML Verify Popup opens via View Problem button for Warning issue redirects to correct warning (bug #449)',
        {
          tag: '@smoke',
          annotation: {
            type: 'Issue',
            description: 'https://github.com/Netcracker/qubership-apihub/issues/449',
          },
        },
        async ({ sysadminPage: page }) => {
          const portalPage = new PortalPage(page)
          const warning1TestCase = ISSUE_TEST_CASES[2]

          await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
          await switchToTestDocument(portalPage, FILE_TAB_OAS30.name)
          await openProblemPopupViaTooltip(portalPage, warning1TestCase)

          await verifyProblemPopupContent(portalPage, warning1TestCase)
        },
      )

      test.skip(
        'P-AQ-TAB-POPUP-1-BUG-449-JSON Verify Popup opens via View Problem button for Warning issue redirects to correct warning (bug #449)',
        {
          tag: '@smoke',
          annotation: {
            type: 'Issue',
            description: 'https://github.com/Netcracker/qubership-apihub/issues/449',
          },
        },
        async ({ sysadminPage: page }) => {
          const portalPage = new PortalPage(page)
          const warning1TestCase = ISSUE_TEST_CASES[2]

          await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
          await switchToTestDocument(portalPage, FILE_TAB_OAS30.name)
          await switchToFormat(portalPage, RAW_VIEW_FORMATS.JSON)
          await openProblemPopupViaTooltip(portalPage, warning1TestCase)

          await verifyProblemPopupContent(portalPage, warning1TestCase)
        },
      )

      test('P-AQ-TAB-POPUP-2-YAML Verify Popup opens via Alt+F8 for specific problem in YAML', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const error2TestCase = ISSUE_TEST_CASES[1]

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS30.name)
        await openProblemPopupViaAltF8(portalPage, error2TestCase)

        await verifyProblemPopupContent(portalPage, error2TestCase)
      })

      test('P-AQ-TAB-POPUP-2-JSON Verify Popup opens via Alt+F8 for specific problem in JSON', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const error2TestCase = ISSUE_TEST_CASES[1]

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS30.name)
        await switchToFormat(portalPage, RAW_VIEW_FORMATS.JSON)
        await openProblemPopupViaAltF8(portalPage, error2TestCase)

        await verifyProblemPopupContent(portalPage, error2TestCase)
      })

      test('P-AQ-TAB-POPUP-3-YAML Verify Popup closes via Close button in YAML', async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const [error1TestCase] = ISSUE_TEST_CASES

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS30.name)
        await openProblemPopupViaTooltip(portalPage, error1TestCase)

        await closeAndVerifyProblemPopup(portalPage)
      })

      test('P-AQ-TAB-POPUP-3-JSON Verify Popup closes via Close button in JSON', async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const [error1TestCase] = ISSUE_TEST_CASES

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS30.name)
        await switchToFormat(portalPage, RAW_VIEW_FORMATS.JSON)
        await openProblemPopupViaTooltip(portalPage, error1TestCase)

        await closeAndVerifyProblemPopup(portalPage)
      })
    })

    test.describe('Problem Navigation via Popup', () => {
      const {
        verifyKeyboardNavigation,
        verifyOverlappingIssuesNavigation,
        verifyProblemNavigation,
        verifySeverityOrderNavigation,
      } = aqTab

      test('P-AQ-TAB-NAV-1-YAML Verify Next and Previous Problem navigation via buttons in YAML', {
        tag: '@smoke',
      }, async ({ sysadminPage: page, usedResources }) => {
        const portalPage = new PortalPage(page)
        const [error1TestCase, error2TestCase] = ISSUE_TEST_CASES

        registerTestResources(usedResources, {
          rulesets: RUL_QUALITY_TAB_OAS30_N,
          versions: { ...V_AQ_TAB_MIXED_N, files: [{ file: FILE_TAB_OAS30 }] },
        })

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS30.name)
        await openProblemPopupViaTooltip(portalPage, error1TestCase)

        await verifyProblemNavigation(portalPage, error1TestCase, error2TestCase)
      })

      test('P-AQ-TAB-NAV-1-JSON Verify Next and Previous Problem navigation via buttons in JSON', {
        tag: '@smoke',
      }, async ({ sysadminPage: page, usedResources }) => {
        const portalPage = new PortalPage(page)
        const [error1TestCase, error2TestCase] = ISSUE_TEST_CASES

        registerTestResources(usedResources, {
          rulesets: RUL_QUALITY_TAB_OAS30_N,
          versions: { ...V_AQ_TAB_MIXED_N, files: [{ file: FILE_TAB_OAS30 }] },
        })

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS30.name)
        await switchToFormat(portalPage, RAW_VIEW_FORMATS.JSON)
        await openProblemPopupViaTooltip(portalPage, error1TestCase)

        await verifyProblemNavigation(portalPage, error1TestCase, error2TestCase)
      })

      test('P-AQ-TAB-NAV-2-YAML Verify Next and Previous Problem navigation via F8 and Shift+F8 in YAML', {
        tag: '@smoke',
      }, async ({ sysadminPage: page, usedResources }) => {
        const portalPage = new PortalPage(page)
        const [error1TestCase, error2TestCase] = ISSUE_TEST_CASES

        registerTestResources(usedResources, {
          rulesets: RUL_QUALITY_TAB_OAS30_N,
          versions: { ...V_AQ_TAB_MIXED_N, files: [{ file: FILE_TAB_OAS30 }] },
        })

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS30.name)
        await openProblemPopupViaAltF8(portalPage, error1TestCase)

        await verifyKeyboardNavigation(portalPage, error1TestCase, error2TestCase)
      })

      test('P-AQ-TAB-NAV-2-JSON Verify Next and Previous Problem navigation via F8 and Shift+F8 in JSON', {
        tag: '@smoke',
      }, async ({ sysadminPage: page, usedResources }) => {
        const portalPage = new PortalPage(page)
        const [error1TestCase, error2TestCase] = ISSUE_TEST_CASES

        registerTestResources(usedResources, {
          rulesets: RUL_QUALITY_TAB_OAS30_N,
          versions: { ...V_AQ_TAB_MIXED_N, files: [{ file: FILE_TAB_OAS30 }] },
        })

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS30.name)
        await switchToFormat(portalPage, RAW_VIEW_FORMATS.JSON)
        await openProblemPopupViaAltF8(portalPage, error1TestCase)

        await verifyKeyboardNavigation(portalPage, error1TestCase, error2TestCase)
      })

      test('P-AQ-TAB-NAV-3-YAML Verify navigation follows severity order in YAML', async ({ sysadminPage: page, usedResources }) => {
        const portalPage = new PortalPage(page)
        const [error1TestCase] = ISSUE_TEST_CASES

        registerTestResources(usedResources, {
          rulesets: RUL_QUALITY_TAB_OAS30_N,
          versions: { ...V_AQ_TAB_MIXED_N, files: [{ file: FILE_TAB_OAS30 }] },
        })

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS30.name)
        await openProblemPopupViaTooltip(portalPage, error1TestCase)

        await verifySeverityOrderNavigation(portalPage)
      })

      test('P-AQ-TAB-NAV-3-JSON Verify navigation follows severity order in JSON', async ({ sysadminPage: page, usedResources }) => {
        const portalPage = new PortalPage(page)
        const [error1TestCase] = ISSUE_TEST_CASES

        registerTestResources(usedResources, {
          rulesets: RUL_QUALITY_TAB_OAS30_N,
          versions: { ...V_AQ_TAB_MIXED_N, files: [{ file: FILE_TAB_OAS30 }] },
        })

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS30.name)
        await switchToFormat(portalPage, RAW_VIEW_FORMATS.JSON)
        await openProblemPopupViaTooltip(portalPage, error1TestCase)

        await verifySeverityOrderNavigation(portalPage)
      })

      test('P-AQ-TAB-NAV-4-YAML Verify navigation behavior with overlapping issues in YAML', {
        tag: '@smoke',
      }, async ({ sysadminPage: page, usedResources }) => {
        const portalPage = new PortalPage(page)

        registerTestResources(usedResources, {
          rulesets: RUL_QUALITY_TAB_OAS31_N,
          versions: { ...V_AQ_TAB_MIXED_N, files: [{ file: FILE_TAB_OAS31 }] },
        })

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS31.name)
        await openProblemPopupForOverlappingIssue(portalPage, MSG_OVERLAP_ERROR_1, TEXT_OVERLAP_OPERATION)

        await verifyOverlappingIssuesNavigation(portalPage)
      })

      test('P-AQ-TAB-NAV-4-JSON Verify navigation behavior with overlapping issues in JSON', {
        tag: '@smoke',
      }, async ({ sysadminPage: page, usedResources }) => {
        const portalPage = new PortalPage(page)

        registerTestResources(usedResources, {
          rulesets: RUL_QUALITY_TAB_OAS31_N,
          versions: { ...V_AQ_TAB_MIXED_N, files: [{ file: FILE_TAB_OAS31 }] },
        })

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS31.name)
        await switchToFormat(portalPage, RAW_VIEW_FORMATS.JSON)
        await openProblemPopupForOverlappingIssue(portalPage, MSG_OVERLAP_ERROR_1, TEXT_OVERLAP_OPERATION)

        await verifyOverlappingIssuesNavigation(portalPage)
      })
    })

    test.describe('Special States', () => {
      const { MSG_TAB_NO_VALIDATION_RESULTS: MSG_NO_VALIDATION_RESULTS, mockValidationSummaryNotAvailable } = aqTab

      test('P-AQ-TAB-EDGE-1-M Verify No Validation Results state', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        // No resources registered - test uses mocked 404 response, file content doesn't affect outcome
        const portalPage = new PortalPage(page)
        const { apiQualityTab } = portalPage.versionPackagePage

        await mockValidationSummaryNotAvailable(page)

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)

        await test.step('Verify placeholder message is displayed', async () => {
          await expect(apiQualityTab.noResultsPlaceholder).toContainText(MSG_NO_VALIDATION_RESULTS)
        })
      })
    })
  })
})
