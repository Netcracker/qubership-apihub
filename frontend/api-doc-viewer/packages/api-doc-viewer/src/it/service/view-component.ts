export interface ViewComponent {
  captureScreenshot(): Promise<Uint8Array>;
}
