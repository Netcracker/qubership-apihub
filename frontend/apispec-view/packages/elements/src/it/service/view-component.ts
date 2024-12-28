export interface ViewComponent {
  captureScreenshot(): Promise<Buffer | string>;
}
