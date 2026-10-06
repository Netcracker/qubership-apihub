/**
 * Screenshot tests for DDL API Diffs Suite - Foreign Key Reference Changes Samples stories.
 * Edit together with src/stories/ddlapi-diffs-suite/foreign-key-reference-changes.stories.tsx.
 */
import path from "path";
import { StoryPage } from "../service/story-page";
import { ViewComponent } from "../service/view-component";
import { storyPage } from "../service/storybook-service";
import { waitForDdlTableDiffsViewer } from "../service/viewer-waits";

const SNAPSHOTS_DIR = path.resolve(__dirname, "..", "__image_snapshots__");
const STORY_ID_PREFIX = "ddl-api-diffs-suite-foreign-key-reference-changes-samples--case-";
const SNAPSHOT_ID_PREFIX = "ddl-api-diffs-suite-foreign-key-reference-changes-samples-";

describe("DDL API Diffs Suite - Foreign Key Reference Changes Samples", () => {
  let story: StoryPage;
  let component: ViewComponent;

  beforeEach(async () => {
    await jestPuppeteer.resetPage();
  });

  async function expectCaseScreenshot(caseId: string) {
    story = await storyPage(page, `${STORY_ID_PREFIX}${caseId}`);
    await waitForDdlTableDiffsViewer(page);
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: ({ counter }) => `${SNAPSHOT_ID_PREFIX}${caseId}-${counter}`,
    });
  }

  it("01-replaced-foreign-key-column", async () => {
    await expectCaseScreenshot("01-replaced-foreign-key-column");
  });

  it("02-replaced-foreign-key-table", async () => {
    await expectCaseScreenshot("02-replaced-foreign-key-table");
  });

  it("03-replaced-foreign-key-schema-public-to-custom", async () => {
    await expectCaseScreenshot("03-replaced-foreign-key-schema-public-to-custom");
  });

  it("04-replaced-foreign-key-schema-custom-1-to-custom-2", async () => {
    await expectCaseScreenshot("04-replaced-foreign-key-schema-custom-1-to-custom-2");
  });

  it("05-replaced-foreign-key-schema-custom-to-public", async () => {
    await expectCaseScreenshot("05-replaced-foreign-key-schema-custom-to-public");
  });

  it("06-replaced-foreign-key-table-and-column", async () => {
    await expectCaseScreenshot("06-replaced-foreign-key-table-and-column");
  });

  it("07-replaced-foreign-key-schema-public-to-custom-and-table", async () => {
    await expectCaseScreenshot("07-replaced-foreign-key-schema-public-to-custom-and-table");
  });

  it("08-replaced-foreign-key-schema-custom-to-public-and-table", async () => {
    await expectCaseScreenshot("08-replaced-foreign-key-schema-custom-to-public-and-table");
  });

  it("09-replaced-foreign-key-schema-custom-1-to-custom-2-and-table", async () => {
    await expectCaseScreenshot("09-replaced-foreign-key-schema-custom-1-to-custom-2-and-table");
  });

  it("10-replaced-foreign-key-schema-public-to-custom-table-and-column", async () => {
    await expectCaseScreenshot("10-replaced-foreign-key-schema-public-to-custom-table-and-column");
  });

  it("11-replaced-foreign-key-schema-custom-to-public-table-and-column", async () => {
    await expectCaseScreenshot("11-replaced-foreign-key-schema-custom-to-public-table-and-column");
  });

  it("12-replaced-foreign-key-schema-custom-1-to-custom-2-table-and-column", async () => {
    await expectCaseScreenshot("12-replaced-foreign-key-schema-custom-1-to-custom-2-table-and-column");
  });

  it("13-renamed-foreign-key", async () => {
    await expectCaseScreenshot("13-renamed-foreign-key");
  });

  it("14-unnamed-foreign-key-became-named", async () => {
    await expectCaseScreenshot("14-unnamed-foreign-key-became-named");
  });

  it("15-removed-foreign-key-next-to-kept-one-with-same-target", async () => {
    await expectCaseScreenshot("15-removed-foreign-key-next-to-kept-one-with-same-target");
  });

  it("16-foreign-key-moved-off-column-next-to-kept-one-with-same-target", async () => {
    await expectCaseScreenshot("16-foreign-key-moved-off-column-next-to-kept-one-with-same-target");
  });

  it("17-unchanged-unnamed-foreign-key-with-index-description-added", async () => {
    await expectCaseScreenshot("17-unchanged-unnamed-foreign-key-with-index-description-added");
  });
});
