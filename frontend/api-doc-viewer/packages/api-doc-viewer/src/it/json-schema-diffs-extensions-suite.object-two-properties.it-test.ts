/**
 * Screenshot tests for JSON Schema Diffs Suite (Extensions) — Node Diff to Extension
 * Inheritance — Object Two Properties.
 */
import { StoryPage } from "./service/story-page";
import { ViewComponent } from "./service/view-component";
import { storyPage } from "./service/storybook-service";
import { waitForJsonSchemaDiffsViewer } from "./service/viewer-waits";

const META_ID = "json-schema-diffs-suite-extensions-node-diff-to-extension-inheritance-object-two-properties";

describe("JSON Schema Diffs Suite (Extensions) - Node Diff to Extension Inheritance - Object Two Properties", () => {
  let story: StoryPage;
  let component: ViewComponent;

  beforeEach(async () => {
    await jestPuppeteer.resetPage();
  });

  it("01-second-property-added", async () => {
    story = await storyPage(page, `${META_ID}--case-01-second-property-added`);
    await waitForJsonSchemaDiffsViewer(page);
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot();
  });

  it("02-second-property-removed", async () => {
    story = await storyPage(page, `${META_ID}--case-02-second-property-removed`);
    await waitForJsonSchemaDiffsViewer(page);
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot();
  });
});
