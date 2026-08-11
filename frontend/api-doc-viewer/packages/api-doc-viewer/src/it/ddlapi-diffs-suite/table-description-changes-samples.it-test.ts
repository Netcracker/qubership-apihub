/**
 * Screenshot tests for DDL API Diffs Suite - Table Description Changes Samples stories.
 * Edit together with src/stories/ddlapi-diffs-suite/table-description-changes-samples.stories.tsx.
 */
import path from "path";
import { StoryPage } from "../service/story-page";
import { ViewComponent } from "../service/view-component";
import { storyPage } from "../service/storybook-service";

const SNAPSHOTS_DIR = path.resolve(__dirname, "..", "__image_snapshots__");
const STORY_META_ID = "ddl-api-diffs-suite-table-description-changes-samples";

describe("DDL API Diffs Suite - Table Description Changes Samples", () => {
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

  async function captureCaseSnapshot(caseSlug: string, snapshotSlug: string) {
    story = await storyPage(page, `${STORY_META_ID}--case-${caseSlug}`);
    await waitForDdlTableDiffsViewer();
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `${STORY_META_ID}-${snapshotSlug}-${counter}`,
    });
  }

  it("01-add-table-description", async () => {
    await captureCaseSnapshot("01-add-table-description", "01-add-table-description");
  });

  it("02-remove-table-description", async () => {
    await captureCaseSnapshot("02-remove-table-description", "02-remove-table-description");
  });

  it("03-replace-table-description", async () => {
    await captureCaseSnapshot("03-replace-table-description", "03-replace-table-description");
  });

  it("04-add-long-table-description", async () => {
    await captureCaseSnapshot("04-add-long-table-description", "04-add-long-table-description");
  });

  it("05-remove-long-table-description", async () => {
    await captureCaseSnapshot("05-remove-long-table-description", "05-remove-long-table-description");
  });

  it("06-replace-long-table-description", async () => {
    await captureCaseSnapshot("06-replace-long-table-description", "06-replace-long-table-description");
  });

  it("07-replace-short-to-long-table-description", async () => {
    await captureCaseSnapshot(
      "07-replace-short-to-long-table-description",
      "07-replace-short-to-long-table-description",
    );
  });

  it("08-replace-long-to-short-table-description", async () => {
    await captureCaseSnapshot(
      "08-replace-long-to-short-table-description",
      "08-replace-long-to-short-table-description",
    );
  });
});
