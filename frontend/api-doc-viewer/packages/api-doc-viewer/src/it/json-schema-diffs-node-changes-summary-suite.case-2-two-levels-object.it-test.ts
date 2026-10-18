/**
 * Fixtures: packages/samples/json-schema-diffs/node-changes-summary/case-2-object-wrapping-case-1/
 * Edit together with
 * src/stories/json-schema-diffs-node-changes-summary-suite/case-2-two-levels-object.stories.tsx
 */
import { StoryPage } from "./service/story-page";
import { ViewComponent } from "./service/view-component";
import { storyPage } from "./service/storybook-service";
import { waitForJsonSchemaDiffsViewer } from "./service/viewer-waits";

const META_ID = "json-schema-diffs-suite-node-changes-summary-case-2-two-levels-object";

describe("JSON Schema Diffs Suite (Node Changes Summary)/Case 2 — Two Levels Object", () => {
  let story: StoryPage;
  let component: ViewComponent;

  beforeEach(async () => {
    await jestPuppeteer.resetPage();
  });

  it("expanded-root-expanded-first-property", async () => {
    story = await storyPage(page, `${META_ID}--expanded-root-expanded-first-property`);
    await waitForJsonSchemaDiffsViewer(page);
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot();
  });

  it("expanded-root-collapsed-first-property", async () => {
    story = await storyPage(page, `${META_ID}--expanded-root-collapsed-first-property`);
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
