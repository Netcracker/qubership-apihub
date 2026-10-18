/**
 * Screenshot tests for JSON Schema Diffs Suite (Extensions) — Existing 2 Array.
 */
import { StoryPage } from "./service/story-page";
import { ViewComponent } from "./service/view-component";
import { storyPage } from "./service/storybook-service";
import { waitForJsonSchemaDiffsViewer } from "./service/viewer-waits";

const META_ID = "json-schema-diffs-suite-extensions-existing-2-array";

describe("JSON Schema Diffs Suite (Extensions) - Existing 2 Array", () => {
  let story: StoryPage;
  let component: ViewComponent;

  beforeEach(async () => {
    await jestPuppeteer.resetPage();
  });

  it("01-primitive-removed", async () => {
    story = await storyPage(page, `${META_ID}--case-01-primitive-removed`);
    await waitForJsonSchemaDiffsViewer(page);
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot();
  });

  it("02-object-removed", async () => {
    story = await storyPage(page, `${META_ID}--case-02-object-removed`);
    await waitForJsonSchemaDiffsViewer(page);
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot();
  });

  it("03-array-removed", async () => {
    story = await storyPage(page, `${META_ID}--case-03-array-removed`);
    await waitForJsonSchemaDiffsViewer(page);
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot();
  });

  it("04-json-schema-removed", async () => {
    story = await storyPage(page, `${META_ID}--case-04-json-schema-removed`);
    await waitForJsonSchemaDiffsViewer(page);
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot();
  });

  it("05-replaced-to-primitive", async () => {
    story = await storyPage(page, `${META_ID}--case-05-replaced-to-primitive`);
    await waitForJsonSchemaDiffsViewer(page);
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot();
  });

  it("06-replaced-to-object", async () => {
    story = await storyPage(page, `${META_ID}--case-06-replaced-to-object`);
    await waitForJsonSchemaDiffsViewer(page);
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot();
  });

  it("07-replaced-to-array", async () => {
    story = await storyPage(page, `${META_ID}--case-07-replaced-to-array`);
    await waitForJsonSchemaDiffsViewer(page);
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot();
  });

  it("08-replaced-to-json-schema", async () => {
    story = await storyPage(page, `${META_ID}--case-08-replaced-to-json-schema`);
    await waitForJsonSchemaDiffsViewer(page);
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot();
  });

  it("09-added-and-removed", async () => {
    story = await storyPage(page, `${META_ID}--case-09-added-and-removed`);
    await waitForJsonSchemaDiffsViewer(page);
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot();
  });

  it("10-removed-and-replaced", async () => {
    story = await storyPage(page, `${META_ID}--case-10-removed-and-replaced`);
    await waitForJsonSchemaDiffsViewer(page);
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot();
  });

  it("11-added-and-replaced", async () => {
    story = await storyPage(page, `${META_ID}--case-11-added-and-replaced`);
    await waitForJsonSchemaDiffsViewer(page);
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot();
  });

  it("12-both-replaced", async () => {
    story = await storyPage(page, `${META_ID}--case-12-both-replaced`);
    await waitForJsonSchemaDiffsViewer(page);
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot();
  });

  it("13-both-added", async () => {
    story = await storyPage(page, `${META_ID}--case-13-both-added`);
    await waitForJsonSchemaDiffsViewer(page);
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot();
  });

  it("14-both-removed", async () => {
    story = await storyPage(page, `${META_ID}--case-14-both-removed`);
    await waitForJsonSchemaDiffsViewer(page);
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot();
  });
});
