/**
 * Screenshot tests for JSON Schema Diffs Suite (Hiding Unchanged Nodes) — complex object.
 */
import { StoryPage } from "./service/story-page";
import { ViewComponent } from "./service/view-component";
import { storyPage } from "./service/storybook-service";
import { waitForJsonSchemaDiffsViewer } from "./service/viewer-waits";

const META_ID = "json-schema-diffs-suite-hiding-unchanged-nodes-complex-object";

describe("JSON Schema Diffs Suite (Hiding Unchanged Nodes) - Complex Object", () => {
  let story: StoryPage;
  let component: ViewComponent;

  beforeEach(async () => {
    await jestPuppeteer.resetPage();
  });

  it("2.1-root-description-changed", async () => {
    story = await storyPage(page, `${META_ID}--case-2-1-root-description-changed`);
    await waitForJsonSchemaDiffsViewer(page);
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot();
  });

  it("2.2-primitive-props-added", async () => {
    story = await storyPage(page, `${META_ID}--case-2-2-primitive-props-added`);
    await waitForJsonSchemaDiffsViewer(page);
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot();
  });

  it("2.3-nested-object-props-added", async () => {
    story = await storyPage(page, `${META_ID}--case-2-3-nested-object-props-added`);
    await waitForJsonSchemaDiffsViewer(page);
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot();
  });

  it("2.4-primitive-added-nested-removed", async () => {
    story = await storyPage(page, `${META_ID}--case-2-4-primitive-added-nested-removed`);
    await waitForJsonSchemaDiffsViewer(page);
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot();
  });

  it("2.5-nested-prop-added-and-removed", async () => {
    story = await storyPage(page, `${META_ID}--case-2-5-nested-prop-added-and-removed`);
    await waitForJsonSchemaDiffsViewer(page);
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot();
  });

  it("2.6-nested-prop-added-object-removed", async () => {
    story = await storyPage(page, `${META_ID}--case-2-6-nested-prop-added-object-removed`);
    await waitForJsonSchemaDiffsViewer(page);
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot();
  });

  it("2.7-object-added-nested-prop-removed", async () => {
    story = await storyPage(page, `${META_ID}--case-2-7-object-added-nested-prop-removed`);
    await waitForJsonSchemaDiffsViewer(page);
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot();
  });

  it("2.8-nested-property-metadata-and-constraints-changed", async () => {
    story = await storyPage(
      page,
      `${META_ID}--case-2-8-nested-property-metadata-and-constraints-changed`,
    );
    await waitForJsonSchemaDiffsViewer(page);
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot();
  });

  it("2.9-second-property-type-string-to-number", async () => {
    story = await storyPage(
      page,
      `${META_ID}--case-2-9-second-property-type-string-to-number`,
    );
    await waitForJsonSchemaDiffsViewer(page);
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot();
  });
});
