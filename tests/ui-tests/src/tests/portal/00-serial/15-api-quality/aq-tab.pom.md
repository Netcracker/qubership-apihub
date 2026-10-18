# API Quality Tab (Full Page) — POM Instructions

## Meta

- **Scope:** `aq-tab`
- **Type:** `pom`
- **Related artifacts:**
  - **Feature overview:** `qubership-apihub-ui-tests/src/tests/portal/00-serial/15-api-quality/aq-tab.overview.md`
  - **Test plan:** `qubership-apihub-ui-tests/src/tests/portal/00-serial/15-api-quality/aq-tab.test-plan.md`
- **Implementation (tests):**
  - `qubership-apihub-ui-tests/src/tests/portal/00-serial/15-api-quality/api-quality.spec.ts`
  - `qubership-apihub-ui-tests/src/tests/portal/00-serial/15-api-quality/aq-tab.support.ts`

## 1. POM status

POM for API Quality Tab is **implemented** in the test repository.

- **Primary location (POM):**
  - `qubership-apihub-ui-tests/src/packages/portal/pages/PortalPage/VersionPage/VersionPackagePage/ApiQualityTab/`
- **Shared dialog (used by multiple scopes):**
  - `qubership-apihub-ui-tests/src/packages/portal/pages/PortalPage/VersionPage/VersionOverviewTab/OverviewSummaryTab/components/RulesetInfoDialog.ts`
- **Monaco wrapper (RawView):**
  - `qubership-apihub-ui-tests/src/packages/shared/components/custom/views/RawView.ts`

## 2. Key `data-testid` and locator notes

### Tab entry point

- `ApiQualityTabButton` — tab button (used by POM `Tab` base class)

### "No results" placeholder

- `ApiQualityNoResultsPlaceholder`

### Document selector

- `ValidatedDocumentSelectorButton`
- `ValidatedDocumentSearchBar`

**Important:** in this UI, items are `button` elements inside a `menu`/`listitem`. Prefer stable semantic locators by role + name instead of relying on `ValidatedDocumentButton`.

### Ruleset link + chips

- `ValidationRulesetLinkName`
- `ValidationRulesetApiTypeChip`
- `ValidationRulesetStatusChip`

### Issue list

- Table cells: `Cell-type`, `Cell-message`

### RawView format toggler

- `ModeButton-yaml`, `ModeButton-json`

## 3. Required POM structure (conceptual)

```text
VersionPackagePage
├── RulesetInfoDialog (shared)
└── ApiQualityTab
    ├── ValidatedDocumentSelect (documentSlt)
    ├── ValidationResultsTableRow (via getProblemRow)
    ├── RawView (rawView)
    │   ├── ProblemPopUp (problemPopUp)
    │   └── ProblemTooltip (problemTooltip)
    └── ValidationRuleset (shared ruleset link + chips)
```

## 4. Notes for Monaco-specific components

### Problem Tooltip vs Problem Popup

- **Tooltip** appears on hover and may contain **multiple** issues at the same location.
- **Popup** (Monaco peek view widget) shows **one issue at a time** and supports navigation.

### Icon assertions

- For Monaco “codicon-*” icons, use `toHaveIconClass()` (not `toHaveIcon()`).
- Standard classes are exported from `RawView.ts`:
  - `CLASS_CODICON_ERROR`
  - `CLASS_CODICON_WARNING`
  - `CLASS_CODICON_INFO`

## 5. What to do if selectors become unstable

If a required element has no `data-testid` or is unstable:

1. Prefer semantic locators (`getByRole`, `getByLabel`, etc.) if stable.
2. Otherwise add/fix `data-testid` in UI repository (typically `qubership-apihub-ui/...`) and then update POM accordingly.
