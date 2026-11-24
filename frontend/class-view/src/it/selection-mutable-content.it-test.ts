import { ViewComponent } from "./service/view-component";
import { StoryPage } from "./service/story-page";
import { storyPage } from "./service/storybook-service";

describe("Selection Mutable Content Test", () => {
  let story: StoryPage;
  let component: ViewComponent;

  beforeEach(async () => {
    await jestPuppeteer.resetPage();
    story = await storyPage(page, "synthetic-selection--selection-mutable-content");
    component = await story.viewComponent();
  });

  afterEach(async () => {
    await story?.close();
  });

  it("Reuse keys", async () => {
    const content = await story.embeddedOptionsControl("Change content")
    expect(await component.captureScreenshot()).toMatchImageSnapshot();
    await content.check("Old keys")
    expect(await component.captureScreenshot()).toMatchImageSnapshot();
    await content.check("New keys")
    expect(await component.captureScreenshot()).toMatchImageSnapshot();
    await content.check("Old keys")
    expect(await component.captureScreenshot()).toMatchImageSnapshot(); // no indication - not a bug
  })
})

