/**
 * Fixtures: packages/samples/json-schema-diffs/node-changes-summary/case-4-array-items-case-2/
 * Edit together with
 * src/stories/json-schema-diffs-node-changes-summary-suite/case-4-array-of-two-levels-object-in-items.stories.tsx
 */
import { StoryPage } from "./service/story-page";
import { ViewComponent } from "./service/view-component";
import { storyPage } from "./service/storybook-service";
import { waitForJsonSchemaDiffsViewer } from "./service/viewer-waits";

const META_ID = "json-schema-diffs-suite-node-changes-summary-case-4-array-of-two-levels-object-in-items";

describe("JSON Schema Diffs Suite (Node Changes Summary)/Case 4 — Array Of Two Levels Object In Items", () => {
  let story: StoryPage;
  let component: ViewComponent;

  beforeEach(async () => {
    await jestPuppeteer.resetPage();
  });

  it("expanded-root-expanded-items", async () => {
    story = await storyPage(page, `${META_ID}--expanded-root-expanded-items`);
    await waitForJsonSchemaDiffsViewer(page);
    component = await story.viewComponent();
    expect(await component.captureScreenshot()).toMatchImageSnapshot();
  });

  it("expanded-root-collapsed-items", async () => {
    story = await storyPage(page, `${META_ID}--expanded-root-collapsed-items`);
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
