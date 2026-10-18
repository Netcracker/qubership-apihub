/**
 * Screenshot tests for DDL API Diffs Suite - Whole Table Changes Samples stories.
 * Edit together with src/stories/ddlapi-diffs-suite/whole-table-changes.stories.tsx.
 */
import path from "path";
import { StoryPage } from "../service/story-page";
import { ViewComponent } from "../service/view-component";
import { storyPage } from "../service/storybook-service";
import { waitForDdlTableDiffsViewer } from "../service/viewer-waits";

const SNAPSHOTS_DIR = path.resolve(__dirname, "..", "__image_snapshots__");

describe('DDL API Diffs Suite - Whole Table Changes Samples', () => {
  let story: StoryPage;
  let component: ViewComponent;

  beforeEach(async () => {
    await jestPuppeteer.resetPage();
  });

  it('01-wholly-added-table', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-whole-table-changes-samples--case-01-wholly-added-table',
    );
    await waitForDdlTableDiffsViewer(page);
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-whole-table-changes-samples-01-wholly-added-table-${counter}`,
    });
  });

  it('02-wholly-removed-table', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-whole-table-changes-samples--case-02-wholly-removed-table',
    );
    await waitForDdlTableDiffsViewer(page);
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-whole-table-changes-samples-02-wholly-removed-table-${counter}`,
    });
  });

  it('03-wholly-added-table-with-index', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-whole-table-changes-samples--case-03-wholly-added-table-with-index',
    );
    await waitForDdlTableDiffsViewer(page);
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-whole-table-changes-samples-03-wholly-added-table-with-index-${counter}`,
    });
  });

  it('04-wholly-removed-table-with-index', async () => {
    story = await storyPage(
      page,
      'ddl-api-diffs-suite-whole-table-changes-samples--case-04-wholly-removed-table-with-index',
    );
    await waitForDdlTableDiffsViewer(page);
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `ddl-api-diffs-suite-whole-table-changes-samples-04-wholly-removed-table-with-index-${counter}`,
    });
  });
});
