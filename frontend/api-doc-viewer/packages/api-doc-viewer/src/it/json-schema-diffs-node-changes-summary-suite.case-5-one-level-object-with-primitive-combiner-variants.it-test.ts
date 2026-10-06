/**
 * Fixtures: packages/samples/json-schema-diffs/node-changes-summary/case-5-oneof-properties/
 * Edit together with
 * src/stories/json-schema-diffs-node-changes-summary-suite/case-5-one-level-object-with-primitive-combiner-variants.stories.tsx
 */
import { StoryPage } from "./service/story-page";
import { ViewComponent } from "./service/view-component";
import { storyPage } from "./service/storybook-service";
import { waitForJsonSchemaDiffsViewer } from "./service/viewer-waits";

const META_ID = "json-schema-diffs-suite-node-changes-summary-case-5-one-level-object-with-primitive-combiner-variants";

describe("JSON Schema Diffs Suite (Node Changes Summary)/Case 5 — One Level Object With Primitive Combiner Variants", () => {
  let story: StoryPage;
  let component: ViewComponent;

  beforeEach(async () => {
    await jestPuppeteer.resetPage();
  });

  it("expanded-root", async () => {
    story = await storyPage(page, `${META_ID}--expanded-root`);
    await waitForJsonSchemaDiffsViewer(page, { switchCombinerVariant: true });
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot();
  });

  it("collapsed-root", async () => {
    story = await storyPage(page, `${META_ID}--collapsed-root`);
    await waitForJsonSchemaDiffsViewer(page, { switchCombinerVariant: true });
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot();
  });
});
