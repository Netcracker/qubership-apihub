/**
 * Screenshot tests for JSON Schema Diffs Suite (Extensions) — Existing 1 Object.
 */
import { StoryPage } from "./service/story-page";
import { ViewComponent } from "./service/view-component";
import { storyPage } from "./service/storybook-service";
import { waitForJsonSchemaDiffsViewer } from "./service/viewer-waits";

const META_ID = "json-schema-diffs-suite-extensions-existing-1-object";

describe("JSON Schema Diffs Suite (Extensions) - Existing 1 Object", () => {
  let story: StoryPage;
  let component: ViewComponent;

  beforeEach(async () => {
    await jestPuppeteer.resetPage();
  });

  it("01-add-primitive", async () => {
    story = await storyPage(page, `${META_ID}--case-01-add-primitive`);
    await waitForJsonSchemaDiffsViewer(page);
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot();
  });

  it("02-add-object", async () => {
    story = await storyPage(page, `${META_ID}--case-02-add-object`);
    await waitForJsonSchemaDiffsViewer(page);
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot();
  });

  it("03-add-array", async () => {
    story = await storyPage(page, `${META_ID}--case-03-add-array`);
    await waitForJsonSchemaDiffsViewer(page);
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot();
  });

  it("04-add-json-schema", async () => {
    story = await storyPage(page, `${META_ID}--case-04-add-json-schema`);
    await waitForJsonSchemaDiffsViewer(page);
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot();
  });

  it("05-replace-to-primitive", async () => {
    story = await storyPage(page, `${META_ID}--case-05-replace-to-primitive`);
    await waitForJsonSchemaDiffsViewer(page);
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot();
  });

  it("06-replace-to-object", async () => {
    story = await storyPage(page, `${META_ID}--case-06-replace-to-object`);
    await waitForJsonSchemaDiffsViewer(page);
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot();
  });

  it("07-replace-to-array", async () => {
    story = await storyPage(page, `${META_ID}--case-07-replace-to-array`);
    await waitForJsonSchemaDiffsViewer(page);
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot();
  });

  it("08-replace-to-json-schema", async () => {
    story = await storyPage(page, `${META_ID}--case-08-replace-to-json-schema`);
    await waitForJsonSchemaDiffsViewer(page);
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot();
  });
});
