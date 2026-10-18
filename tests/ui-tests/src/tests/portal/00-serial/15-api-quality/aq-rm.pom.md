# Ruleset Management — POM Instructions

## Meta

- **Scope:** `aq-rm`
- **Type:** `pom`
- **Related artifacts:**
  - **Feature overview:** `qubership-apihub-ui-tests/src/tests/portal/00-serial/15-api-quality/aq-rm.overview.md`
  - **Test plan:** `qubership-apihub-ui-tests/src/tests/portal/00-serial/15-api-quality/aq-rm.test-plan.md`
- **Implementation (tests):**
  - `qubership-apihub-ui-tests/src/tests/portal/00-serial/15-api-quality/api-quality.spec.ts`
  - `qubership-apihub-ui-tests/src/tests/portal/00-serial/15-api-quality/aq-rm.support.ts`

## 1. POM status

POM for Ruleset Management is **implemented** in the test repository and must be used by tests (no raw selectors in spec).

## 2. UI implementation references (other projects)

Validate selectors and behavior against UI repository:

- `qubership-apihub-ui/packages/portal/src/routes/root/SettingsPage/RulesetManagementTab/RulesetManagementTab.tsx`
- `qubership-apihub-ui/packages/portal/src/routes/root/SettingsPage/RulesetManagementTab/RulesetTable.tsx`
- `qubership-apihub-ui/packages/portal/src/routes/root/SettingsPage/RulesetManagementTab/RulesetActions.tsx`
- `qubership-apihub-ui/packages/portal/src/routes/root/SettingsPage/RulesetManagementTab/CreateRulesetDialog.tsx`
- `qubership-apihub-ui/packages/portal/src/routes/root/SettingsPage/RulesetManagementTab/ActivationHistoryContent.tsx`
- `qubership-apihub-ui/packages/portal/src/routes/root/SettingsPage/RulesetManagementTab/api/rulesets.ts`
- `qubership-apihub-ui/packages/portal/src/entities/api-quality/rulesets.ts`

## 3. POM locations (test project)

- `qubership-apihub-ui-tests/src/packages/portal/pages/PortalPage/PortalSettingsPage/PortalSettingsPage.ts`
- `qubership-apihub-ui-tests/src/packages/shared/components/custom/headers/MainPageHeader.ts` (Portal Settings entry)
- `qubership-apihub-ui-tests/src/packages/portal/pages/PortalPage/PortalSettingsPage/RulesetManagementTab/`
  - `RulesetManagementTab.ts`
  - `RulesetTableRow/RulesetTableRow.ts`
  - `ActivationHistoryTooltip.ts`
  - Dialogs: `CreateRulesetDialog`, `ActivateRulesetDialog`, `BaseDeleteDialog` usage

## 4. Required POM structure (conceptual)

```text
PortalPage
└── PortalSettingsPage
    └── RulesetManagementTab
        ├── RulesetApiTypeSelector
        ├── AddRulesetButton
        ├── RulesetTableRow (with actions on hover)
        │   ├── Activate / Download / Copy Link / Delete
        │   └── ActivationHistoryTooltip (on info icon hover)
        ├── CreateRulesetDialog
        ├── ActivateRulesetDialog
        └── BaseDeleteDialog
```

## 5. Locator rules

- Prefer `data-testid` when present.
- For tooltip assertions, hover target element and assert via page-level `tooltip` component (see `qubership-apihub-ui-tests/docs/CODING_GUIDELINES.md`).
- For list/table access, use `createItemGetter` pattern (see `qubership-apihub-ui-tests/docs/pom-in-practice.md`).

## 6. Test file integration

- Test spec: `qubership-apihub-ui-tests/src/tests/portal/00-serial/15-api-quality/api-quality.spec.ts`
- Ruleset Management is inside `test.describe('Ruleset Management', ...)` under the root API Quality suite.
