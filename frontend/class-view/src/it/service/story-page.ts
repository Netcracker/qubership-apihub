import { ViewComponent } from './view-component'
import { BooleanControl, EmbeddedOptionsControl, NumberControl, TextControl } from './controls'

export interface StoryPage {
  viewComponent(): Promise<ViewComponent>;

  reset(): Promise<void>;

  close(): Promise<void>;

  booleanControl(name: string): Promise<BooleanControl>;

  embeddedOptionsControl(name: string): Promise<EmbeddedOptionsControl>;

  numberControl(name: string): Promise<NumberControl>;

  textControl(name: string): Promise<TextControl>;

  showMouse(): Promise<void>;
}
