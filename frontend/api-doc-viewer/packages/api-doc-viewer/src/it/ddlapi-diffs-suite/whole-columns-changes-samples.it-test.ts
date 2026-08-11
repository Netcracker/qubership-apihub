/**
 * Screenshot tests for DDL API Diffs Suite - Whole Columns Changes Samples stories.
 * Edit together with src/stories/ddlapi-diffs-suite/whole-columns-changes-samples.stories.tsx.
 */
import path from "path";
import { StoryPage } from "../service/story-page";
import { ViewComponent } from "../service/view-component";
import { storyPage } from "../service/storybook-service";

const SNAPSHOTS_DIR = path.resolve(__dirname, "..", "__image_snapshots__");

describe('DDL API Diffs Suite - Whole Columns Changes Samples', () => {
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

  it('01-add-two-columns-to-empty-table', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-whole-columns-changes-samples--case-01-add-two-columns-to-empty-table',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-whole-columns-changes-samples-01-add-two-columns-to-empty-table-${counter}`,
    });
  });

  it('02-remove-two-columns-from-table-with-two-columns', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-whole-columns-changes-samples--case-02-remove-two-columns-from-table-with-two-columns',
    );
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-whole-columns-changes-samples-02-remove-two-columns-from-table-with-two-columns-${counter}`,
    });
  });
});
