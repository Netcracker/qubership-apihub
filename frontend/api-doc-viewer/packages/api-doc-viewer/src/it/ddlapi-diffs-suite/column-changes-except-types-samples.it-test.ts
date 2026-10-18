/**
 * Screenshot tests for DDL API Diffs Suite - Column Changes Except Types Samples stories.
 * Edit together with src/stories/ddlapi-diffs-suite/column-changes-except-types-samples.stories.tsx.
 */
import path from "path";
import { StoryPage } from "../service/story-page";
import { ViewComponent } from "../service/view-component";
import { storyPage } from "../service/storybook-service";

const SNAPSHOTS_DIR = path.resolve(__dirname, "..", "__image_snapshots__");

describe('DDL API Diffs Suite - Column Changes Except Types Samples', () => {
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

  it('101-add-one-more-column-no-badges', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-changes-except-types-samples--case-101-add-one-more-column-no-badges',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-changes-except-types-samples-101-add-one-more-column-no-badges-${counter}`,
    });
  });

  it('102-remove-one-more-column-no-badges', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-changes-except-types-samples--case-102-remove-one-more-column-no-badges',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-changes-except-types-samples-102-remove-one-more-column-no-badges-${counter}`,
    });
  });

  it('201-add-column-primary-key', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-changes-except-types-samples--case-201-add-column-primary-key',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-changes-except-types-samples-201-add-column-primary-key-${counter}`,
    });
  });

  it('202-add-column-foreign-key', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-changes-except-types-samples--case-202-add-column-foreign-key',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-changes-except-types-samples-202-add-column-foreign-key-${counter}`,
    });
  });

  it('203-add-column-unique', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-changes-except-types-samples--case-203-add-column-unique',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-changes-except-types-samples-203-add-column-unique-${counter}`,
    });
  });

  it('204-add-column-not-null', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-changes-except-types-samples--case-204-add-column-not-null',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-changes-except-types-samples-204-add-column-not-null-${counter}`,
    });
  });

  it('205-add-column-generated-identity', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-changes-except-types-samples--case-205-add-column-generated-identity',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-changes-except-types-samples-205-add-column-generated-identity-${counter}`,
    });
  });

  it('206-add-column-generated-expression', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-changes-except-types-samples--case-206-add-column-generated-expression',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-changes-except-types-samples-206-add-column-generated-expression-${counter}`,
    });
  });

  it('207-add-column-description', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-changes-except-types-samples--case-207-add-column-description',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-changes-except-types-samples-207-add-column-description-${counter}`,
    });
  });

  it('301-remove-column-primary-key', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-changes-except-types-samples--case-301-remove-column-primary-key',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-changes-except-types-samples-301-remove-column-primary-key-${counter}`,
    });
  });

  it('302-remove-column-foreign-key', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-changes-except-types-samples--case-302-remove-column-foreign-key',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-changes-except-types-samples-302-remove-column-foreign-key-${counter}`,
    });
  });

  it('303-remove-column-unique', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-changes-except-types-samples--case-303-remove-column-unique',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-changes-except-types-samples-303-remove-column-unique-${counter}`,
    });
  });

  it('304-remove-column-not-null', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-changes-except-types-samples--case-304-remove-column-not-null',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-changes-except-types-samples-304-remove-column-not-null-${counter}`,
    });
  });

  it('305-remove-column-generated-identity', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-changes-except-types-samples--case-305-remove-column-generated-identity',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-changes-except-types-samples-305-remove-column-generated-identity-${counter}`,
    });
  });

  it('306-remove-column-generated-expression', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-changes-except-types-samples--case-306-remove-column-generated-expression',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-changes-except-types-samples-306-remove-column-generated-expression-${counter}`,
    });
  });

  it('307-remove-column-description', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-changes-except-types-samples--case-307-remove-column-description',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-changes-except-types-samples-307-remove-column-description-${counter}`,
    });
  });

  it('401-existing-column-became-primary-key', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-changes-except-types-samples--case-401-existing-column-became-primary-key',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-changes-except-types-samples-401-existing-column-became-primary-key-${counter}`,
    });
  });

  it('402-existing-column-became-foreign-key', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-changes-except-types-samples--case-402-existing-column-became-foreign-key',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-changes-except-types-samples-402-existing-column-became-foreign-key-${counter}`,
    });
  });

  it('403-existing-column-became-unique', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-changes-except-types-samples--case-403-existing-column-became-unique',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-changes-except-types-samples-403-existing-column-became-unique-${counter}`,
    });
  });

  it('404-existing-column-became-generated-identity', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-changes-except-types-samples--case-404-existing-column-became-generated-identity',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-changes-except-types-samples-404-existing-column-became-generated-identity-${counter}`,
    });
  });

  it('405-existing-column-became-generated-expression', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-changes-except-types-samples--case-405-existing-column-became-generated-expression',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-changes-except-types-samples-405-existing-column-became-generated-expression-${counter}`,
    });
  });

  it('406-existing-column-became-not-null', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-changes-except-types-samples--case-406-existing-column-became-not-null',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-changes-except-types-samples-406-existing-column-became-not-null-${counter}`,
    });
  });

  it('407-existing-column-gained-description', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-changes-except-types-samples--case-407-existing-column-gained-description',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-changes-except-types-samples-407-existing-column-gained-description-${counter}`,
    });
  });

  it('501-existing-column-lost-primary-key', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-changes-except-types-samples--case-501-existing-column-lost-primary-key',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-changes-except-types-samples-501-existing-column-lost-primary-key-${counter}`,
    });
  });

  it('502-existing-column-lost-foreign-key', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-changes-except-types-samples--case-502-existing-column-lost-foreign-key',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-changes-except-types-samples-502-existing-column-lost-foreign-key-${counter}`,
    });
  });

  it('503-existing-column-lost-unique', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-changes-except-types-samples--case-503-existing-column-lost-unique',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-changes-except-types-samples-503-existing-column-lost-unique-${counter}`,
    });
  });

  it('504-existing-column-lost-generated-identity', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-changes-except-types-samples--case-504-existing-column-lost-generated-identity',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-changes-except-types-samples-504-existing-column-lost-generated-identity-${counter}`,
    });
  });

  it('505-existing-column-lost-generated-expression', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-changes-except-types-samples--case-505-existing-column-lost-generated-expression',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-changes-except-types-samples-505-existing-column-lost-generated-expression-${counter}`,
    });
  });

  it('506-existing-column-lost-not-null', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-changes-except-types-samples--case-506-existing-column-lost-not-null',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-changes-except-types-samples-506-existing-column-lost-not-null-${counter}`,
    });
  });

  it('507-existing-column-lost-description', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-changes-except-types-samples--case-507-existing-column-lost-description',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-changes-except-types-samples-507-existing-column-lost-description-${counter}`,
    });
  });

  it('601-existing-column-replaced-generated-expression', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-changes-except-types-samples--case-601-existing-column-replaced-generated-expression',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-changes-except-types-samples-601-existing-column-replaced-generated-expression-${counter}`,
    });
  });

  it('602-existing-column-generated-expression-became-identity', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-changes-except-types-samples--case-602-existing-column-generated-expression-became-identity',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-changes-except-types-samples-602-existing-column-generated-expression-became-identity-${counter}`,
    });
  });

  it('603-existing-column-generated-identity-became-expression', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-changes-except-types-samples--case-603-existing-column-generated-identity-became-expression',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-changes-except-types-samples-603-existing-column-generated-identity-became-expression-${counter}`,
    });
  });

  it('604-existing-column-replaced-description', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-column-changes-except-types-samples--case-604-existing-column-replaced-description',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-column-changes-except-types-samples-604-existing-column-replaced-description-${counter}`,
    });
  });
});
