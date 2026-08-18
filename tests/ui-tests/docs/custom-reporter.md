# Custom Playwright reporter

`CustomReporter` aggregates run results and writes optional outputs under `reports/summary/` (configurable via `outputFolder`).

## Outputs

| Artifact              | When                           | Purpose                                                                                                          |
| --------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `status`              | Always                         | CI gate text: `Passed`, `Failed`, `Timed out`, or `Interrupted`                                                  |
| `summary-report.html` | End-to-end / component runs    | Styled HTML summary (fetches environment info from the backend); see [HTML summary layout](#html-summary-layout) |
| GitHub Step Summary   | GitHub Actions end-to-end runs | Markdown table and failed-test details in the job summary                                                        |

Playwright's built-in HTML report (`reports/playwright/`) is separate and unchanged.

## Configuration

Reporter options are passed from `playwright.config.ts`:

```typescript
;[
  './src/services/custom-reporter/CustomReporter.ts',
  {
    html: true,
    github: process.env.GITHUB_ACTIONS === 'true'
      ? { title: 'UI E2E tests result', affectRatio: false }
      : false,
  },
]
```

### Options

| Option         | Type              | Default           | Description                                      |
| -------------- | ----------------- | ----------------- | ------------------------------------------------ |
| `outputFolder` | `string`          | `reports/summary` | Directory for `status` and `summary-report.html` |
| `html`         | `boolean`         | `true`            | Generate `summary-report.html`                   |
| `github`       | `false` or object | `false`           | Write GitHub Step Summary via `@actions/core`    |

`github` object fields:

| Field         | Type      | Default                   | Description                                   |
| ------------- | --------- | ------------------------- | --------------------------------------------- |
| `title`       | `string`  | `Playwright tests result` | Heading in the step summary                   |
| `affectRatio` | `boolean` | `false`                   | Include affect-ratio row in the summary table |

### Automatic HTML skip for unit tests

When every test in the run belongs to a `*.unit.test.ts` file (the `Unit` project), HTML generation is skipped even if `html: true`. `ApihubStyledHtmlReport` calls the backend for environment metadata, which unit tests must not trigger.

Detection is based on the actual Playwright suite at runtime, so it works for `npm run test-unit`, `npx playwright test --project=Unit`, and any other invocation path.

The `status` file is still written for unit runs.

### GitHub Actions

Enable the step summary only in CI by setting `github` in config when `GITHUB_ACTIONS=true`. `GitHubActionsReport` does not re-check the environment; the config is the single gate.

Failed tests are rendered as collapsible `<details>` blocks with tags, annotations, and first-attempt error output.

## HTML summary layout

`summary-report.html` is consumed both as a standalone file and inside older desktop Outlook, which renders HTML through the Word engine. That client strips or ignores most `<head>` CSS, so the template under `reports/html-apihub-styled/` deliberately uses email-era patterns:

- nested `<table>` layout instead of flexbox or grid
- inline `style` attributes alongside class-based rules in `style.css`
- simple selectors and spacing; no modern CSS features

Do not refactor markup or styles for "clean" HTML/CSS without verifying the result in the target Outlook version.
