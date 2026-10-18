/**
 * Screenshot tests for DDL API Diffs Suite/Column Default Changes Samples stories.
 * Edit together with src/stories/ddlapi-diffs-suite/column-default-changes-samples.stories.tsx.
 * SQL fixtures: packages/api-doc-viewer/bin/generate-column-default-changes-samples.mjs
 */
import path from "path";
import { StoryPage } from "../service/story-page";
import { ViewComponent } from "../service/view-component";
import { storyPage } from "../service/storybook-service";

const SNAPSHOTS_DIR = path.resolve(__dirname, "..", "__image_snapshots__");

describe('DDL API Diffs Suite/Column Default Changes Samples', () => {
  let story: StoryPage;
  let component: ViewComponent;

  beforeEach(async () => {
    await jestPuppeteer.resetPage();
  });

  async function waitForDdlTableDiffsViewer() {
    await page.waitForSelector('[data-testid="ddl-table-diffs-viewer"]', { visible: true });
    await page.waitForFunction(() => document.readyState === "complete");
    await page.evaluate(() => new Promise<void>(resolve =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    ));
  }

  it('101-add-default-bigint', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-101-add-default-bigint',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-101-add-default-bigint-${counter}`,
    });
  });

  it('201-remove-default-bigint', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-201-remove-default-bigint',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-201-remove-default-bigint-${counter}`,
    });
  });

  it('301-replace-default-bigint', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-301-replace-default-bigint',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-301-replace-default-bigint-${counter}`,
    });
  });

  it('102-add-default-bit', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-102-add-default-bit',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-102-add-default-bit-${counter}`,
    });
  });

  it('202-remove-default-bit', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-202-remove-default-bit',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-202-remove-default-bit-${counter}`,
    });
  });

  it('302-replace-default-bit', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-302-replace-default-bit',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-302-replace-default-bit-${counter}`,
    });
  });

  it('103-add-default-bit-varying', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-103-add-default-bit-varying',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-103-add-default-bit-varying-${counter}`,
    });
  });

  it('203-remove-default-bit-varying', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-203-remove-default-bit-varying',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-203-remove-default-bit-varying-${counter}`,
    });
  });

  it('303-replace-default-bit-varying', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-303-replace-default-bit-varying',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-303-replace-default-bit-varying-${counter}`,
    });
  });

  it('104-add-default-boolean', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-104-add-default-boolean',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-104-add-default-boolean-${counter}`,
    });
  });

  it('204-remove-default-boolean', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-204-remove-default-boolean',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-204-remove-default-boolean-${counter}`,
    });
  });

  it('304-replace-default-boolean', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-304-replace-default-boolean',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-304-replace-default-boolean-${counter}`,
    });
  });

  it('105-add-default-bytea', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-105-add-default-bytea',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-105-add-default-bytea-${counter}`,
    });
  });

  it('205-remove-default-bytea', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-205-remove-default-bytea',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-205-remove-default-bytea-${counter}`,
    });
  });

  it('305-replace-default-bytea', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-305-replace-default-bytea',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-305-replace-default-bytea-${counter}`,
    });
  });

  it('106-add-default-char', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-106-add-default-char',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-106-add-default-char-${counter}`,
    });
  });

  it('206-remove-default-char', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-206-remove-default-char',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-206-remove-default-char-${counter}`,
    });
  });

  it('306-replace-default-char', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-306-replace-default-char',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-306-replace-default-char-${counter}`,
    });
  });

  it('107-add-default-date', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-107-add-default-date',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-107-add-default-date-${counter}`,
    });
  });

  it('207-remove-default-date', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-207-remove-default-date',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-207-remove-default-date-${counter}`,
    });
  });

  it('307-replace-default-date', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-307-replace-default-date',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-307-replace-default-date-${counter}`,
    });
  });

  it('108-add-default-double-precision', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-108-add-default-double-precision',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-108-add-default-double-precision-${counter}`,
    });
  });

  it('208-remove-default-double-precision', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-208-remove-default-double-precision',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-208-remove-default-double-precision-${counter}`,
    });
  });

  it('308-replace-default-double-precision', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-308-replace-default-double-precision',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-308-replace-default-double-precision-${counter}`,
    });
  });

  it('109-add-default-integer', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-109-add-default-integer',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-109-add-default-integer-${counter}`,
    });
  });

  it('209-remove-default-integer', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-209-remove-default-integer',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-209-remove-default-integer-${counter}`,
    });
  });

  it('309-replace-default-integer', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-309-replace-default-integer',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-309-replace-default-integer-${counter}`,
    });
  });

  it('110-add-default-interval', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-110-add-default-interval',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-110-add-default-interval-${counter}`,
    });
  });

  it('210-remove-default-interval', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-210-remove-default-interval',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-210-remove-default-interval-${counter}`,
    });
  });

  it('310-replace-default-interval', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-310-replace-default-interval',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-310-replace-default-interval-${counter}`,
    });
  });

  it('111-add-default-json', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-111-add-default-json',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-111-add-default-json-${counter}`,
    });
  });

  it('211-remove-default-json', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-211-remove-default-json',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-211-remove-default-json-${counter}`,
    });
  });

  it('311-replace-default-json', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-311-replace-default-json',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-311-replace-default-json-${counter}`,
    });
  });

  it('112-add-default-jsonb', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-112-add-default-jsonb',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-112-add-default-jsonb-${counter}`,
    });
  });

  it('212-remove-default-jsonb', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-212-remove-default-jsonb',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-212-remove-default-jsonb-${counter}`,
    });
  });

  it('312-replace-default-jsonb', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-312-replace-default-jsonb',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-312-replace-default-jsonb-${counter}`,
    });
  });

  it('113-add-default-money', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-113-add-default-money',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-113-add-default-money-${counter}`,
    });
  });

  it('213-remove-default-money', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-213-remove-default-money',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-213-remove-default-money-${counter}`,
    });
  });

  it('313-replace-default-money', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-313-replace-default-money',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-313-replace-default-money-${counter}`,
    });
  });

  it('114-add-default-numeric', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-114-add-default-numeric',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-114-add-default-numeric-${counter}`,
    });
  });

  it('214-remove-default-numeric', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-214-remove-default-numeric',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-214-remove-default-numeric-${counter}`,
    });
  });

  it('314-replace-default-numeric', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-314-replace-default-numeric',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-314-replace-default-numeric-${counter}`,
    });
  });

  it('115-add-default-real', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-115-add-default-real',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-115-add-default-real-${counter}`,
    });
  });

  it('215-remove-default-real', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-215-remove-default-real',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-215-remove-default-real-${counter}`,
    });
  });

  it('315-replace-default-real', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-315-replace-default-real',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-315-replace-default-real-${counter}`,
    });
  });

  it('116-add-default-smallint', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-116-add-default-smallint',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-116-add-default-smallint-${counter}`,
    });
  });

  it('216-remove-default-smallint', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-216-remove-default-smallint',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-216-remove-default-smallint-${counter}`,
    });
  });

  it('316-replace-default-smallint', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-316-replace-default-smallint',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-316-replace-default-smallint-${counter}`,
    });
  });

  it('117-add-default-text', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-117-add-default-text',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-117-add-default-text-${counter}`,
    });
  });

  it('217-remove-default-text', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-217-remove-default-text',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-217-remove-default-text-${counter}`,
    });
  });

  it('317-replace-default-text', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-317-replace-default-text',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-317-replace-default-text-${counter}`,
    });
  });

  it('118-add-default-time', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-118-add-default-time',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-118-add-default-time-${counter}`,
    });
  });

  it('218-remove-default-time', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-218-remove-default-time',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-218-remove-default-time-${counter}`,
    });
  });

  it('318-replace-default-time', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-318-replace-default-time',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-318-replace-default-time-${counter}`,
    });
  });

  it('119-add-default-timetz', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-119-add-default-timetz',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-119-add-default-timetz-${counter}`,
    });
  });

  it('219-remove-default-timetz', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-219-remove-default-timetz',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-219-remove-default-timetz-${counter}`,
    });
  });

  it('319-replace-default-timetz', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-319-replace-default-timetz',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-319-replace-default-timetz-${counter}`,
    });
  });

  it('120-add-default-timestamp', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-120-add-default-timestamp',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-120-add-default-timestamp-${counter}`,
    });
  });

  it('220-remove-default-timestamp', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-220-remove-default-timestamp',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-220-remove-default-timestamp-${counter}`,
    });
  });

  it('320-replace-default-timestamp', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-320-replace-default-timestamp',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-320-replace-default-timestamp-${counter}`,
    });
  });

  it('121-add-default-timestamptz', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-121-add-default-timestamptz',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-121-add-default-timestamptz-${counter}`,
    });
  });

  it('221-remove-default-timestamptz', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-221-remove-default-timestamptz',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-221-remove-default-timestamptz-${counter}`,
    });
  });

  it('321-replace-default-timestamptz', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-321-replace-default-timestamptz',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-321-replace-default-timestamptz-${counter}`,
    });
  });

  it('122-add-default-uuid', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-122-add-default-uuid',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-122-add-default-uuid-${counter}`,
    });
  });

  it('222-remove-default-uuid', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-222-remove-default-uuid',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-222-remove-default-uuid-${counter}`,
    });
  });

  it('322-replace-default-uuid', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-322-replace-default-uuid',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-322-replace-default-uuid-${counter}`,
    });
  });

  it('123-add-default-varchar', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-123-add-default-varchar',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-123-add-default-varchar-${counter}`,
    });
  });

  it('223-remove-default-varchar', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-223-remove-default-varchar',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-223-remove-default-varchar-${counter}`,
    });
  });

  it('323-replace-default-varchar', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-323-replace-default-varchar',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-323-replace-default-varchar-${counter}`,
    });
  });

  it('124-add-default-enum', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-124-add-default-enum',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-124-add-default-enum-${counter}`,
    });
  });

  it('224-remove-default-enum', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-224-remove-default-enum',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-224-remove-default-enum-${counter}`,
    });
  });

  it('324-replace-default-enum', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-324-replace-default-enum',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-324-replace-default-enum-${counter}`,
    });
  });

  it('125-add-default-varchar-raw-expr', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-125-add-default-varchar-raw-expr',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-125-add-default-varchar-raw-expr-${counter}`,
    });
  });

  it('225-remove-default-varchar-raw-expr', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-225-remove-default-varchar-raw-expr',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-225-remove-default-varchar-raw-expr-${counter}`,
    });
  });

  it('325-replace-default-varchar-raw-expr', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-default-changes-samples--case-325-replace-default-varchar-raw-expr',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-default-changes-samples-325-replace-default-varchar-raw-expr-${counter}`,
    });
  });
});
