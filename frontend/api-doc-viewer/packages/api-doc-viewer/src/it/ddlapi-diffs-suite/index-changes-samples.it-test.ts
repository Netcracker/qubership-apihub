/**
 * Screenshot tests for DDL API Diffs Suite - Index Changes Samples stories.
 * Edit together with src/stories/ddlapi-diffs-suite/index-changes-samples.stories.tsx.
 */
import path from "path";
import { StoryPage } from "../service/story-page";
import { ViewComponent } from "../service/view-component";
import { storyPage } from "../service/storybook-service";

const SNAPSHOTS_DIR = path.resolve(__dirname, "..", "__image_snapshots__");

describe('DDL API Diffs Suite - Index Changes Samples', () => {
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

  it('01-add-index-when-none-present', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-index-changes-samples--case-01-add-index-when-none-present',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-index-changes-samples-01-add-index-when-none-present-${counter}`,
    });
  });

  it('02-add-index-unique-when-none-present', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-index-changes-samples--case-02-add-index-unique-when-none-present',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-index-changes-samples-02-add-index-unique-when-none-present-${counter}`,
    });
  });

  it('03-remove-index-when-none-present', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-index-changes-samples--case-03-remove-index-when-none-present',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-index-changes-samples-03-remove-index-when-none-present-${counter}`,
    });
  });

  it('04-remove-index-unique-when-none-present', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-index-changes-samples--case-04-remove-index-unique-when-none-present',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-index-changes-samples-04-remove-index-unique-when-none-present-${counter}`,
    });
  });

  it('05-add-one-more-index-without-unique', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-index-changes-samples--case-05-add-one-more-index-without-unique',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-index-changes-samples-05-add-one-more-index-without-unique-${counter}`,
    });
  });

  it('06-add-one-more-index-with-unique', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-index-changes-samples--case-06-add-one-more-index-with-unique',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-index-changes-samples-06-add-one-more-index-with-unique-${counter}`,
    });
  });

  it('07-remove-one-more-index-without-unique', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-index-changes-samples--case-07-remove-one-more-index-without-unique',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-index-changes-samples-07-remove-one-more-index-without-unique-${counter}`,
    });
  });

  it('08-remove-one-more-index-with-unique', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-index-changes-samples--case-08-remove-one-more-index-with-unique',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-index-changes-samples-08-remove-one-more-index-with-unique-${counter}`,
    });
  });

  it('09-append-new-column-in-index', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-index-changes-samples--case-09-append-new-column-in-index',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-index-changes-samples-09-append-new-column-in-index-${counter}`,
    });
  });

  it('10-remove-new-column-in-index', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-index-changes-samples--case-10-remove-new-column-in-index',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-index-changes-samples-10-remove-new-column-in-index-${counter}`,
    });
  });

  it('11-replaced-column-in-index', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-index-changes-samples--case-11-replaced-column-in-index',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-index-changes-samples-11-replaced-column-in-index-${counter}`,
    });
  });

  it('12-index-became-unique', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-index-changes-samples--case-12-index-became-unique',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-index-changes-samples-12-index-became-unique-${counter}`,
    });
  });

  it('13-index-lost-unique', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-index-changes-samples--case-13-index-lost-unique',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-index-changes-samples-13-index-lost-unique-${counter}`,
    });
  });

  it('14-remove-one-more-index-without-unique', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-index-changes-samples--case-14-remove-one-more-index-without-unique',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-index-changes-samples-14-remove-one-more-index-without-unique-${counter}`,
    });
  });

  it('15-remove-one-more-index-with-unique', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-index-changes-samples--case-15-remove-one-more-index-with-unique',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-index-changes-samples-15-remove-one-more-index-with-unique-${counter}`,
    });
  });

  it('16-remove-new-column-in-index', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-index-changes-samples--case-16-remove-new-column-in-index',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-index-changes-samples-16-remove-new-column-in-index-${counter}`,
    });
  });

  it('17-unnamed-index-became-titled', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-index-changes-samples--case-17-unnamed-index-became-titled',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-index-changes-samples-17-unnamed-index-became-titled-${counter}`,
    });
  });

  it('18-titled-index-became-unnamed', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-index-changes-samples--case-18-titled-index-became-unnamed',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-index-changes-samples-18-titled-index-became-unnamed-${counter}`,
    });
  });

  it('19-unnamed-index-append-column', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-index-changes-samples--case-19-unnamed-index-append-column',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-index-changes-samples-19-unnamed-index-append-column-${counter}`,
    });
  });

  it('20-unnamed-index-pop-column', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-index-changes-samples--case-20-unnamed-index-pop-column',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-index-changes-samples-20-unnamed-index-pop-column-${counter}`,
    });
  });

  it('21-unnamed-index-replaced-column', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-index-changes-samples--case-21-unnamed-index-replaced-column',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-index-changes-samples-21-unnamed-index-replaced-column-${counter}`,
    });
  });

  it('22-unnamed-index-became-unique', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-index-changes-samples--case-22-unnamed-index-became-unique',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-index-changes-samples-22-unnamed-index-became-unique-${counter}`,
    });
  });

  it('23-unnamed-index-lost-unique', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-index-changes-samples--case-23-unnamed-index-lost-unique',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-index-changes-samples-23-unnamed-index-lost-unique-${counter}`,
    });
  });

  it('24-add-index-description', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-index-changes-samples--case-24-add-index-description',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-index-changes-samples-24-add-index-description-${counter}`,
    });
  });

  it('25-remove-index-description', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-index-changes-samples--case-25-remove-index-description',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-index-changes-samples-25-remove-index-description-${counter}`,
    });
  });

  it('26-replace-index-description', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-index-changes-samples--case-26-replace-index-description',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-index-changes-samples-26-replace-index-description-${counter}`,
    });
  });
});
