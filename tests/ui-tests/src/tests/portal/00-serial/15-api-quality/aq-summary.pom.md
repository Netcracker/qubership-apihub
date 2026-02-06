# API Quality Summary Tab — POM Instructions

## Meta

- **Scope:** `aq-summary`
- **Type:** `pom`
- **Related artifacts:**
  - **Feature overview:** `qubership-apihub-ui-tests/src/tests/portal/00-serial/15-api-quality/aq-summary.overview.md`
  - **Test plan:** `qubership-apihub-ui-tests/src/tests/portal/00-serial/15-api-quality/aq-summary.test-plan.md`
- **Implementation (tests):**
  - `qubership-apihub-ui-tests/src/tests/portal/00-serial/15-api-quality/api-quality.spec.ts`
  - `qubership-apihub-ui-tests/src/tests/portal/00-serial/15-api-quality/aq-summary.support.ts`

## 1. POM status

POM for Quality Summary Tab is **implemented** in the test repository.

## 2. UI implementation references (other projects)

Use these UI sources to validate `data-testid` / behavior:

- `qubership-apihub-ui/packages/portal/src/routes/root/PortalPage/VersionPage/VersionOverviewSubPage/SummaryTab/OperationTypeSummary.tsx`
- `qubership-apihub-ui/packages/portal/src/components/ApiQuality/ValidatationRulesetLink.tsx` (typo in filename is in UI repository)
- `qubership-apihub-ui/packages/portal/src/routes/root/PortalPage/VersionPage/VersionApiQualitySubPage/components/RulesetInfoDialog/RulesetInfoDialog.tsx`
- `qubership-apihub-ui/packages/portal/src/routes/root/PortalPage/VersionPage/VersionApiQualitySubPage/RulesetFilePanel.tsx`
- `qubership-apihub-ui/packages/portal/src/routes/root/PortalPage/VersionPage/VersionApiQualitySubPage/components/RulesetInfoDialog/RulesetActivationHistoryTable.tsx`

## 3. Required POM architecture (conceptual)

```text
VersionPackagePage
└── RulesetInfoDialog (shared dialog, reused by Summary + API Quality Tab)

OverviewSummaryTab
└── OverviewSummaryTabBody
    └── QualityValidationSection
        ├── ValidationRuleset (list)
        ├── runValidationLink
        ├── alertIcon
        ├── failedDocumentsCount
        └── issueCounts (error, warning, info, hint)
```

## 4. POM locations (test project)

- **Summary tab POM:**
  - `qubership-apihub-ui-tests/src/packages/portal/pages/PortalPage/VersionPage/VersionOverviewTab/OverviewSummaryTab.ts`
  - `qubership-apihub-ui-tests/src/packages/portal/pages/PortalPage/VersionPage/VersionOverviewTab/OverviewSummaryTab/OverviewSummaryTabBody/QualityValidationSection.ts`
  - `qubership-apihub-ui-tests/src/packages/portal/pages/PortalPage/VersionPage/VersionOverviewTab/OverviewSummaryTab/OverviewSummaryTabBody/QualityValidationSection/ValidationRuleset.ts`
- **Shared Ruleset Info dialog:**
  - `qubership-apihub-ui-tests/src/packages/portal/pages/PortalPage/VersionPage/VersionOverviewTab/OverviewSummaryTab/components/RulesetInfoDialog.ts`

## 5. Required `data-testid` (must be stable)

- Section title: `QualityValidationTitle`
- Ruleset container: `ValidationRulesetContainer`
- Ruleset name link: `ValidationRulesetLinkName`
- Chips: `ValidationRulesetApiTypeChip`, `ValidationRulesetStatusChip`
- Manual trigger link: `RunValidationLink`
- Issue counts: `QualityIssuesContainer`, `IssueCount-{severity}`
- Failed state: `ValidationFailedAlert`, `FailedDocumentsContainer`
- Dialog: `RulesetInfoDialog`, `CloseRulesetInfoDialogButton`, `RulesetFileNameContainer`, `DownloadButton`, `CopyPublicUrlButton`, `RulesetActivationHistoryTable`

## 6. Notes

- The dialog is **shared** at `VersionPackagePage` level and should not be duplicated per-tab.
- When a container contains multiple text fragments (name + chips), use the “filter by child and navigate to parent” pattern described in `qubership-apihub-ui-tests/docs/pom-in-practice.md`.
