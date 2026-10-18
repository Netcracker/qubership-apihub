/**
 * Screenshot tests for DDL API Diffs Suite - Column Type Changes Samples stories.
 * Edit together with src/stories/ddlapi-diffs-suite/column-type-changes-samples.stories.tsx.
 */
import path from "path";
import { StoryPage } from "../service/story-page";
import { ViewComponent } from "../service/view-component";
import { storyPage } from "../service/storybook-service";

const SNAPSHOTS_DIR = path.resolve(__dirname, "..", "__image_snapshots__");

describe('DDL API Diffs Suite - Column Type Changes Samples', () => {
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

  it('001-type-change-int-4-to-bigint', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-001-type-change-int-4-to-bigint',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-001-type-change-int-4-to-bigint-${counter}`,
    });
  });

  it('002-type-change-int-4-to-boolean', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-002-type-change-int-4-to-boolean',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-002-type-change-int-4-to-boolean-${counter}`,
    });
  });

  it('003-type-change-int-4-to-uuid', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-003-type-change-int-4-to-uuid',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-003-type-change-int-4-to-uuid-${counter}`,
    });
  });

  it('004-type-change-int-4-to-varchar', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-004-type-change-int-4-to-varchar',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-004-type-change-int-4-to-varchar-${counter}`,
    });
  });

  it('005-type-change-int-4-to-text', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-005-type-change-int-4-to-text',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-005-type-change-int-4-to-text-${counter}`,
    });
  });

  it('006-type-change-int-4-to-numeric', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-006-type-change-int-4-to-numeric',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-006-type-change-int-4-to-numeric-${counter}`,
    });
  });

  it('007-type-change-int-4-to-timestamp', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-007-type-change-int-4-to-timestamp',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-007-type-change-int-4-to-timestamp-${counter}`,
    });
  });

  it('008-type-change-int-4-to-bytea', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-008-type-change-int-4-to-bytea',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-008-type-change-int-4-to-bytea-${counter}`,
    });
  });

  it('009-type-change-int-4-to-jsonb', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-009-type-change-int-4-to-jsonb',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-009-type-change-int-4-to-jsonb-${counter}`,
    });
  });

  it('010-type-change-bigint-to-int-4', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-010-type-change-bigint-to-int-4',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-010-type-change-bigint-to-int-4-${counter}`,
    });
  });

  it('011-type-change-bigint-to-boolean', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-011-type-change-bigint-to-boolean',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-011-type-change-bigint-to-boolean-${counter}`,
    });
  });

  it('012-type-change-bigint-to-uuid', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-012-type-change-bigint-to-uuid',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-012-type-change-bigint-to-uuid-${counter}`,
    });
  });

  it('013-type-change-bigint-to-varchar', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-013-type-change-bigint-to-varchar',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-013-type-change-bigint-to-varchar-${counter}`,
    });
  });

  it('014-type-change-bigint-to-text', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-014-type-change-bigint-to-text',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-014-type-change-bigint-to-text-${counter}`,
    });
  });

  it('015-type-change-bigint-to-numeric', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-015-type-change-bigint-to-numeric',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-015-type-change-bigint-to-numeric-${counter}`,
    });
  });

  it('016-type-change-bigint-to-timestamp', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-016-type-change-bigint-to-timestamp',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-016-type-change-bigint-to-timestamp-${counter}`,
    });
  });

  it('017-type-change-bigint-to-bytea', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-017-type-change-bigint-to-bytea',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-017-type-change-bigint-to-bytea-${counter}`,
    });
  });

  it('018-type-change-bigint-to-jsonb', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-018-type-change-bigint-to-jsonb',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-018-type-change-bigint-to-jsonb-${counter}`,
    });
  });

  it('019-type-change-boolean-to-int-4', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-019-type-change-boolean-to-int-4',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-019-type-change-boolean-to-int-4-${counter}`,
    });
  });

  it('020-type-change-boolean-to-bigint', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-020-type-change-boolean-to-bigint',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-020-type-change-boolean-to-bigint-${counter}`,
    });
  });

  it('021-type-change-boolean-to-uuid', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-021-type-change-boolean-to-uuid',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-021-type-change-boolean-to-uuid-${counter}`,
    });
  });

  it('022-type-change-boolean-to-varchar', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-022-type-change-boolean-to-varchar',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-022-type-change-boolean-to-varchar-${counter}`,
    });
  });

  it('023-type-change-boolean-to-text', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-023-type-change-boolean-to-text',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-023-type-change-boolean-to-text-${counter}`,
    });
  });

  it('024-type-change-boolean-to-numeric', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-024-type-change-boolean-to-numeric',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-024-type-change-boolean-to-numeric-${counter}`,
    });
  });

  it('025-type-change-boolean-to-timestamp', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-025-type-change-boolean-to-timestamp',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-025-type-change-boolean-to-timestamp-${counter}`,
    });
  });

  it('026-type-change-boolean-to-bytea', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-026-type-change-boolean-to-bytea',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-026-type-change-boolean-to-bytea-${counter}`,
    });
  });

  it('027-type-change-boolean-to-jsonb', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-027-type-change-boolean-to-jsonb',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-027-type-change-boolean-to-jsonb-${counter}`,
    });
  });

  it('028-type-change-uuid-to-int-4', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-028-type-change-uuid-to-int-4',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-028-type-change-uuid-to-int-4-${counter}`,
    });
  });

  it('029-type-change-uuid-to-bigint', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-029-type-change-uuid-to-bigint',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-029-type-change-uuid-to-bigint-${counter}`,
    });
  });

  it('030-type-change-uuid-to-boolean', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-030-type-change-uuid-to-boolean',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-030-type-change-uuid-to-boolean-${counter}`,
    });
  });

  it('031-type-change-uuid-to-varchar', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-031-type-change-uuid-to-varchar',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-031-type-change-uuid-to-varchar-${counter}`,
    });
  });

  it('032-type-change-uuid-to-text', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-032-type-change-uuid-to-text',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-032-type-change-uuid-to-text-${counter}`,
    });
  });

  it('033-type-change-uuid-to-numeric', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-033-type-change-uuid-to-numeric',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-033-type-change-uuid-to-numeric-${counter}`,
    });
  });

  it('034-type-change-uuid-to-timestamp', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-034-type-change-uuid-to-timestamp',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-034-type-change-uuid-to-timestamp-${counter}`,
    });
  });

  it('035-type-change-uuid-to-bytea', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-035-type-change-uuid-to-bytea',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-035-type-change-uuid-to-bytea-${counter}`,
    });
  });

  it('036-type-change-uuid-to-jsonb', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-036-type-change-uuid-to-jsonb',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-036-type-change-uuid-to-jsonb-${counter}`,
    });
  });

  it('037-type-change-varchar-to-int-4', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-037-type-change-varchar-to-int-4',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-037-type-change-varchar-to-int-4-${counter}`,
    });
  });

  it('038-type-change-varchar-to-bigint', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-038-type-change-varchar-to-bigint',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-038-type-change-varchar-to-bigint-${counter}`,
    });
  });

  it('039-type-change-varchar-to-boolean', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-039-type-change-varchar-to-boolean',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-039-type-change-varchar-to-boolean-${counter}`,
    });
  });

  it('040-type-change-varchar-to-uuid', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-040-type-change-varchar-to-uuid',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-040-type-change-varchar-to-uuid-${counter}`,
    });
  });

  it('041-type-change-varchar-to-text', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-041-type-change-varchar-to-text',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-041-type-change-varchar-to-text-${counter}`,
    });
  });

  it('042-type-change-varchar-to-numeric', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-042-type-change-varchar-to-numeric',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-042-type-change-varchar-to-numeric-${counter}`,
    });
  });

  it('043-type-change-varchar-to-timestamp', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-043-type-change-varchar-to-timestamp',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-043-type-change-varchar-to-timestamp-${counter}`,
    });
  });

  it('044-type-change-varchar-to-bytea', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-044-type-change-varchar-to-bytea',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-044-type-change-varchar-to-bytea-${counter}`,
    });
  });

  it('045-type-change-varchar-to-jsonb', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-045-type-change-varchar-to-jsonb',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-045-type-change-varchar-to-jsonb-${counter}`,
    });
  });

  it('046-type-change-text-to-int-4', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-046-type-change-text-to-int-4',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-046-type-change-text-to-int-4-${counter}`,
    });
  });

  it('047-type-change-text-to-bigint', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-047-type-change-text-to-bigint',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-047-type-change-text-to-bigint-${counter}`,
    });
  });

  it('048-type-change-text-to-boolean', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-048-type-change-text-to-boolean',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-048-type-change-text-to-boolean-${counter}`,
    });
  });

  it('049-type-change-text-to-uuid', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-049-type-change-text-to-uuid',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-049-type-change-text-to-uuid-${counter}`,
    });
  });

  it('050-type-change-text-to-varchar', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-050-type-change-text-to-varchar',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-050-type-change-text-to-varchar-${counter}`,
    });
  });

  it('051-type-change-text-to-numeric', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-051-type-change-text-to-numeric',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-051-type-change-text-to-numeric-${counter}`,
    });
  });

  it('052-type-change-text-to-timestamp', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-052-type-change-text-to-timestamp',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-052-type-change-text-to-timestamp-${counter}`,
    });
  });

  it('053-type-change-text-to-bytea', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-053-type-change-text-to-bytea',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-053-type-change-text-to-bytea-${counter}`,
    });
  });

  it('054-type-change-text-to-jsonb', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-054-type-change-text-to-jsonb',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-054-type-change-text-to-jsonb-${counter}`,
    });
  });

  it('055-type-change-numeric-to-int-4', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-055-type-change-numeric-to-int-4',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-055-type-change-numeric-to-int-4-${counter}`,
    });
  });

  it('056-type-change-numeric-to-bigint', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-056-type-change-numeric-to-bigint',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-056-type-change-numeric-to-bigint-${counter}`,
    });
  });

  it('057-type-change-numeric-to-boolean', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-057-type-change-numeric-to-boolean',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-057-type-change-numeric-to-boolean-${counter}`,
    });
  });

  it('058-type-change-numeric-to-uuid', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-058-type-change-numeric-to-uuid',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-058-type-change-numeric-to-uuid-${counter}`,
    });
  });

  it('059-type-change-numeric-to-varchar', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-059-type-change-numeric-to-varchar',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-059-type-change-numeric-to-varchar-${counter}`,
    });
  });

  it('060-type-change-numeric-to-text', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-060-type-change-numeric-to-text',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-060-type-change-numeric-to-text-${counter}`,
    });
  });

  it('061-type-change-numeric-to-timestamp', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-061-type-change-numeric-to-timestamp',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-061-type-change-numeric-to-timestamp-${counter}`,
    });
  });

  it('062-type-change-numeric-to-bytea', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-062-type-change-numeric-to-bytea',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-062-type-change-numeric-to-bytea-${counter}`,
    });
  });

  it('063-type-change-numeric-to-jsonb', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-063-type-change-numeric-to-jsonb',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-063-type-change-numeric-to-jsonb-${counter}`,
    });
  });

  it('064-type-change-timestamp-to-int-4', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-064-type-change-timestamp-to-int-4',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-064-type-change-timestamp-to-int-4-${counter}`,
    });
  });

  it('065-type-change-timestamp-to-bigint', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-065-type-change-timestamp-to-bigint',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-065-type-change-timestamp-to-bigint-${counter}`,
    });
  });

  it('066-type-change-timestamp-to-boolean', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-066-type-change-timestamp-to-boolean',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-066-type-change-timestamp-to-boolean-${counter}`,
    });
  });

  it('067-type-change-timestamp-to-uuid', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-067-type-change-timestamp-to-uuid',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-067-type-change-timestamp-to-uuid-${counter}`,
    });
  });

  it('068-type-change-timestamp-to-varchar', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-068-type-change-timestamp-to-varchar',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-068-type-change-timestamp-to-varchar-${counter}`,
    });
  });

  it('069-type-change-timestamp-to-text', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-069-type-change-timestamp-to-text',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-069-type-change-timestamp-to-text-${counter}`,
    });
  });

  it('070-type-change-timestamp-to-numeric', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-070-type-change-timestamp-to-numeric',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-070-type-change-timestamp-to-numeric-${counter}`,
    });
  });

  it('071-type-change-timestamp-to-bytea', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-071-type-change-timestamp-to-bytea',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-071-type-change-timestamp-to-bytea-${counter}`,
    });
  });

  it('072-type-change-timestamp-to-jsonb', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-072-type-change-timestamp-to-jsonb',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-072-type-change-timestamp-to-jsonb-${counter}`,
    });
  });

  it('073-type-change-bytea-to-int-4', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-073-type-change-bytea-to-int-4',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-073-type-change-bytea-to-int-4-${counter}`,
    });
  });

  it('074-type-change-bytea-to-bigint', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-074-type-change-bytea-to-bigint',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-074-type-change-bytea-to-bigint-${counter}`,
    });
  });

  it('075-type-change-bytea-to-boolean', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-075-type-change-bytea-to-boolean',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-075-type-change-bytea-to-boolean-${counter}`,
    });
  });

  it('076-type-change-bytea-to-uuid', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-076-type-change-bytea-to-uuid',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-076-type-change-bytea-to-uuid-${counter}`,
    });
  });

  it('077-type-change-bytea-to-varchar', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-077-type-change-bytea-to-varchar',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-077-type-change-bytea-to-varchar-${counter}`,
    });
  });

  it('078-type-change-bytea-to-text', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-078-type-change-bytea-to-text',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-078-type-change-bytea-to-text-${counter}`,
    });
  });

  it('079-type-change-bytea-to-numeric', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-079-type-change-bytea-to-numeric',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-079-type-change-bytea-to-numeric-${counter}`,
    });
  });

  it('080-type-change-bytea-to-timestamp', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-080-type-change-bytea-to-timestamp',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-080-type-change-bytea-to-timestamp-${counter}`,
    });
  });

  it('081-type-change-bytea-to-jsonb', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-081-type-change-bytea-to-jsonb',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-081-type-change-bytea-to-jsonb-${counter}`,
    });
  });

  it('082-type-change-jsonb-to-int-4', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-082-type-change-jsonb-to-int-4',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-082-type-change-jsonb-to-int-4-${counter}`,
    });
  });

  it('083-type-change-jsonb-to-bigint', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-083-type-change-jsonb-to-bigint',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-083-type-change-jsonb-to-bigint-${counter}`,
    });
  });

  it('084-type-change-jsonb-to-boolean', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-084-type-change-jsonb-to-boolean',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-084-type-change-jsonb-to-boolean-${counter}`,
    });
  });

  it('085-type-change-jsonb-to-uuid', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-085-type-change-jsonb-to-uuid',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-085-type-change-jsonb-to-uuid-${counter}`,
    });
  });

  it('086-type-change-jsonb-to-varchar', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-086-type-change-jsonb-to-varchar',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-086-type-change-jsonb-to-varchar-${counter}`,
    });
  });

  it('087-type-change-jsonb-to-text', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-087-type-change-jsonb-to-text',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-087-type-change-jsonb-to-text-${counter}`,
    });
  });

  it('088-type-change-jsonb-to-numeric', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-088-type-change-jsonb-to-numeric',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-088-type-change-jsonb-to-numeric-${counter}`,
    });
  });

  it('089-type-change-jsonb-to-timestamp', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-089-type-change-jsonb-to-timestamp',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-089-type-change-jsonb-to-timestamp-${counter}`,
    });
  });

  it('090-type-change-jsonb-to-bytea', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-090-type-change-jsonb-to-bytea',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-090-type-change-jsonb-to-bytea-${counter}`,
    });
  });

  it('091-param-varchar-length-change-1-st', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-091-param-varchar-length-change-1-st',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-091-param-varchar-length-change-1-st-${counter}`,
    });
  });

  it('092-param-varchar-length-change-wide', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-092-param-varchar-length-change-wide',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-092-param-varchar-length-change-wide-${counter}`,
    });
  });

  it('093-param-varchar-add-optional-parameter', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-093-param-varchar-add-optional-parameter',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-093-param-varchar-add-optional-parameter-${counter}`,
    });
  });

  it('094-param-varchar-remove-optional-parameter', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-094-param-varchar-remove-optional-parameter',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-094-param-varchar-remove-optional-parameter-${counter}`,
    });
  });

  it('095-param-bit-length-change-1-st', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-095-param-bit-length-change-1-st',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-095-param-bit-length-change-1-st-${counter}`,
    });
  });

  it('096-param-bit-varying-length-change-1-st', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-096-param-bit-varying-length-change-1-st',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-096-param-bit-varying-length-change-1-st-${counter}`,
    });
  });

  it('097-param-bit-add-optional-parameter', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-097-param-bit-add-optional-parameter',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-097-param-bit-add-optional-parameter-${counter}`,
    });
  });

  it('098-param-bit-remove-optional-parameter', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-098-param-bit-remove-optional-parameter',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-098-param-bit-remove-optional-parameter-${counter}`,
    });
  });

  it('099-param-decimal-change-precision-only', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-099-param-decimal-change-precision-only',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-099-param-decimal-change-precision-only-${counter}`,
    });
  });

  it('100-param-decimal-change-scale-only', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-100-param-decimal-change-scale-only',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-100-param-decimal-change-scale-only-${counter}`,
    });
  });

  it('101-param-decimal-change-precision-and-scale', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-101-param-decimal-change-precision-and-scale',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-101-param-decimal-change-precision-and-scale-${counter}`,
    });
  });

  it('102-param-decimal-add-optional-scale', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-102-param-decimal-add-optional-scale',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-102-param-decimal-add-optional-scale-${counter}`,
    });
  });

  it('103-param-decimal-remove-optional-scale', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-103-param-decimal-remove-optional-scale',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-103-param-decimal-remove-optional-scale-${counter}`,
    });
  });

  it('104-enum-enum-append-value', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-104-enum-enum-append-value',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-104-enum-enum-append-value-${counter}`,
    });
  });

  it('105-enum-enum-remove-value', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-105-enum-enum-remove-value',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-105-enum-enum-remove-value-${counter}`,
    });
  });

  it('106-enum-enum-change-value', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-106-enum-enum-change-value',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-106-enum-enum-change-value-${counter}`,
    });
  });

  it('107-enum-enum-change-type-title', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-107-enum-enum-change-type-title',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-107-enum-enum-change-type-title-${counter}`,
    });
  });

  it('108-type-change-int-4-to-enum', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-108-type-change-int-4-to-enum',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-108-type-change-int-4-to-enum-${counter}`,
    });
  });

  it('109-type-change-bigint-to-enum', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-109-type-change-bigint-to-enum',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-109-type-change-bigint-to-enum-${counter}`,
    });
  });

  it('110-type-change-boolean-to-enum', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-110-type-change-boolean-to-enum',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-110-type-change-boolean-to-enum-${counter}`,
    });
  });

  it('111-type-change-uuid-to-enum', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-111-type-change-uuid-to-enum',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-111-type-change-uuid-to-enum-${counter}`,
    });
  });

  it('112-type-change-varchar-to-enum', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-112-type-change-varchar-to-enum',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-112-type-change-varchar-to-enum-${counter}`,
    });
  });

  it('113-type-change-text-to-enum', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-113-type-change-text-to-enum',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-113-type-change-text-to-enum-${counter}`,
    });
  });

  it('114-type-change-numeric-to-enum', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-114-type-change-numeric-to-enum',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-114-type-change-numeric-to-enum-${counter}`,
    });
  });

  it('115-type-change-timestamp-to-enum', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-115-type-change-timestamp-to-enum',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-115-type-change-timestamp-to-enum-${counter}`,
    });
  });

  it('116-type-change-bytea-to-enum', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-116-type-change-bytea-to-enum',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-116-type-change-bytea-to-enum-${counter}`,
    });
  });

  it('117-type-change-jsonb-to-enum', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-117-type-change-jsonb-to-enum',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-117-type-change-jsonb-to-enum-${counter}`,
    });
  });

  it('118-type-change-enum-to-int-4', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-118-type-change-enum-to-int-4',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-118-type-change-enum-to-int-4-${counter}`,
    });
  });

  it('119-type-change-enum-to-bigint', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-119-type-change-enum-to-bigint',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-119-type-change-enum-to-bigint-${counter}`,
    });
  });

  it('120-type-change-enum-to-boolean', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-120-type-change-enum-to-boolean',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-120-type-change-enum-to-boolean-${counter}`,
    });
  });

  it('121-type-change-enum-to-uuid', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-121-type-change-enum-to-uuid',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-121-type-change-enum-to-uuid-${counter}`,
    });
  });

  it('122-type-change-enum-to-varchar', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-122-type-change-enum-to-varchar',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-122-type-change-enum-to-varchar-${counter}`,
    });
  });

  it('123-type-change-enum-to-text', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-123-type-change-enum-to-text',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-123-type-change-enum-to-text-${counter}`,
    });
  });

  it('124-type-change-enum-to-numeric', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-124-type-change-enum-to-numeric',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-124-type-change-enum-to-numeric-${counter}`,
    });
  });

  it('125-type-change-enum-to-timestamp', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-125-type-change-enum-to-timestamp',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-125-type-change-enum-to-timestamp-${counter}`,
    });
  });

  it('126-type-change-enum-to-bytea', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-126-type-change-enum-to-bytea',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-126-type-change-enum-to-bytea-${counter}`,
    });
  });

  it('127-type-change-enum-to-jsonb', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-type-changes-samples--case-127-type-change-enum-to-jsonb',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-type-changes-samples-127-type-change-enum-to-jsonb-${counter}`,
    });
  });
});
