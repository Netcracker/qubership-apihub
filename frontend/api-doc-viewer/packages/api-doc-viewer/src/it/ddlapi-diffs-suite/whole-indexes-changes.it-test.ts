/**
 * Screenshot tests for DDL API Diffs Suite - Whole Indexes Changes Samples stories.
 * Edit together with src/stories/ddlapi-diffs-suite/whole-indexes-changes.stories.tsx.
 */
import path from "path";
import { StoryPage } from "../service/story-page";
import { ViewComponent } from "../service/view-component";
import { storyPage } from "../service/storybook-service";
import { waitForDdlTableDiffsViewer } from "../service/viewer-waits";

const SNAPSHOTS_DIR = path.resolve(__dirname, "..", "__image_snapshots__");

describe('DDL API Diffs Suite - Whole Indexes Changes Samples', () => {
  let story: StoryPage;
  let component: ViewComponent;

  beforeEach(async () => {
    await jestPuppeteer.resetPage();
  });

  it('01-add-two-indexes-when-none-present', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-whole-indexes-changes-samples--case-01-add-two-indexes-when-none-present',
    );
    await waitForDdlTableDiffsViewer(page);
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-whole-indexes-changes-samples-01-add-two-indexes-when-none-present-${counter}`,
    });
  });

  it('02-remove-two-indexes-when-two-present', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-whole-indexes-changes-samples--case-02-remove-two-indexes-when-two-present',
    );
    await waitForDdlTableDiffsViewer(page);
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-whole-indexes-changes-samples-02-remove-two-indexes-when-two-present-${counter}`,
    });
  });
});
