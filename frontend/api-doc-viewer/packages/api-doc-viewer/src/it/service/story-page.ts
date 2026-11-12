import { ViewComponent } from './view-component'

export interface StoryPage {
  viewComponent(): Promise<ViewComponent>;
}
