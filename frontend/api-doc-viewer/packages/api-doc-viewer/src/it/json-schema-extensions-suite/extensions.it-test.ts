/**
 * Screenshot tests for JSON Schema Suite (Extensions)/Extensions stories.
 */
import { StoryPage } from "../service/story-page";
import { ViewComponent } from "../service/view-component";
import { storyPage } from "../service/storybook-service";
import { waitForJsonSchemaViewer } from "../service/viewer-waits";

const META_ID = "json-schema-extensions-suite-extensions";

describe("JSON Schema Suite (Extensions) - Extensions", () => {
  let story: StoryPage;
  let component: ViewComponent;

  beforeEach(async () => {
    await jestPuppeteer.resetPage();
  });

  const TEST_IDS: string[] = [
    "001-root-primitive",
    "002-root-object",
    "003-root-array",
    "004-root-json-schema",
    "005-property-primitive",
    "006-property-object",
    "007-property-array",
    "008-property-json-schema",
    "009-items-primitive",
    "010-items-object",
    "011-items-array",
    "012-items-json-schema",
    "013-root-mixed-set",
  ];

  for (const testId of TEST_IDS) {
    it(testId, async () => {
      story = await storyPage(page, `${META_ID}--case-${testId}`);
      await waitForJsonSchemaViewer(page);
      component = await story.viewComponent();
      expect(await component.captureScreenshot()).toMatchImageSnapshot();
    });
  }
});
