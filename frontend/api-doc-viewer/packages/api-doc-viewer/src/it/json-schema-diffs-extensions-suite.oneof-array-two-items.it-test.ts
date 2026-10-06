/**
 * Screenshot tests for JSON Schema Diffs Suite (Extensions) — Node Diff to Extension
 * Inheritance — OneOf Array Two Items.
 */
import { StoryPage } from "./service/story-page";
import { ViewComponent } from "./service/view-component";
import { storyPage } from "./service/storybook-service";
import { waitForJsonSchemaDiffsViewer } from "./service/viewer-waits";

const META_ID = "json-schema-diffs-suite-extensions-node-diff-to-extension-inheritance-oneof-array-two-items";

// This suite's root is `oneOf` wrapping a tuple array (`items: [...]`). Per the known gap
// documented in packages/samples/json-schema-diffs/extensions/README.md, a root-level tuple
// array never gets structural child nodes, so the combiner's array option never expands into
// a `[data-name="JsonNode"]` element - only the combiner option-picker itself mounts. Wait for
// either, so this stays correct if tuple-item rendering is added later.

describe("JSON Schema Diffs Suite (Extensions) - Node Diff to Extension Inheritance - OneOf Array Two Items", () => {
  let story: StoryPage;
  let component: ViewComponent;

  beforeEach(async () => {
    await jestPuppeteer.resetPage();
  });

  it("01-second-item-added", async () => {
    story = await storyPage(page, `${META_ID}--case-01-second-item-added`);
    await waitForJsonSchemaDiffsViewer(page);
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot();
  });

  it("02-second-item-removed", async () => {
    story = await storyPage(page, `${META_ID}--case-02-second-item-removed`);
    await waitForJsonSchemaDiffsViewer(page);
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot();
  });
});
