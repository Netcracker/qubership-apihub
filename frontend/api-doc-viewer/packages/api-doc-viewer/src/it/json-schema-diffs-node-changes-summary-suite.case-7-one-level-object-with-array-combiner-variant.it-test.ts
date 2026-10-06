/**
 * Fixtures: packages/samples/json-schema-diffs/node-changes-summary/case-7-oneof-wrapping-array-cases/
 * Edit together with
 * src/stories/json-schema-diffs-node-changes-summary-suite/case-7-one-level-object-with-array-combiner-variant.stories.tsx
 */
import { StoryPage } from "./service/story-page";
import { ViewComponent } from "./service/view-component";
import { storyPage } from "./service/storybook-service";
import { waitForJsonSchemaDiffsViewer } from "./service/viewer-waits";
import { switchCombinerNodesToChangedVariant } from "../utils/combiner-changed-variant";

const META_ID = "json-schema-diffs-suite-node-changes-summary-case-7-one-level-object-with-array-combiner-variant";

// There is no `expandItems()` step anymore: once the `array` variant is selected, its `items`
// child never becomes expandable in the current JsonSchemaViewer - a root-only combiner leaf
// gets no structural children (JsonSchemaCombiner.Display.resolveLeafStructuralChildren in
// utils/resolve-combiner.ts falls through to childrenNodes(), which is empty for an
// array node), so no expander caret ever renders to click. This is the same "root-level array
// renders as a summary only" gap documented in
// packages/samples/json-schema-diffs/extensions/README.md, confirmed here to also apply to a
// plain single-schema `items:` (not just tuple `items: [...]`) once the array is a combiner
// leaf rather than the schema root. Until the viewer supports this, this story's screenshot is
// expected to match "…-collapsed-items" - the array simply can't expand further.

describe("JSON Schema Diffs Suite (Node Changes Summary)/Case 7 — One Level Object With Array Combiner Variant", () => {
  let story: StoryPage;
  let component: ViewComponent;

  beforeEach(async () => {
    await jestPuppeteer.resetPage();
  });

  it("expanded-root-chosen-array-expanded-items", async () => {
    story = await storyPage(page, `${META_ID}--expanded-root-chosen-array-expanded-items`);
    await waitForJsonSchemaDiffsViewer(page);
    component = await story.viewComponent();
    await page.evaluate(switchCombinerNodesToChangedVariant);
    await waitForJsonSchemaDiffsViewer(page);
    expect(await component.captureScreenshot()).toMatchImageSnapshot();
  });

  it("expanded-root-chosen-array-collapsed-items", async () => {
    story = await storyPage(page, `${META_ID}--expanded-root-chosen-array-collapsed-items`);
    await waitForJsonSchemaDiffsViewer(page);
    component = await story.viewComponent();
    await page.evaluate(switchCombinerNodesToChangedVariant);
    await waitForJsonSchemaDiffsViewer(page);
    expect(await component.captureScreenshot()).toMatchImageSnapshot();
  });

  it("expanded-root-default-choice", async () => {
    story = await storyPage(page, `${META_ID}--expanded-root-default-choice`);
    await waitForJsonSchemaDiffsViewer(page);
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot();
  });

  it("collapsed-root", async () => {
    story = await storyPage(page, `${META_ID}--collapsed-root`);
    await waitForJsonSchemaDiffsViewer(page);
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot();
  });
});
