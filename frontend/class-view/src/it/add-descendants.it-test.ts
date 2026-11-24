import { ViewComponent } from "./service/view-component";
import { StoryPage } from "./service/story-page";
import { storyPage } from "./service/storybook-service";

describe("Decedents Test", () => {
  let story: StoryPage;
  let component: ViewComponent;

  beforeEach(async () => {
    await jestPuppeteer.resetPage();
    story = await storyPage(page, "synthetic-topology--add-descendants");
    component = await story.viewComponent();
  });

  afterEach(async () => {
    await story?.close();
  });

  it("Add decedents", async () => {
    const numberControl = await story.numberControl("Layers");
    expect(await component.captureScreenshot()).toMatchImageSnapshot();
    await numberControl.set(3);
    expect(await component.captureScreenshot()).toMatchImageSnapshot();
    await numberControl.set(0);
    expect(await component.captureScreenshot()).toMatchImageSnapshot();
  });
});
