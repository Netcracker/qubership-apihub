export interface ViewComponent {
  captureScreenshot(): Promise<Uint8Array>;

  prepareToNextRenderFinish(): Promise<void>;

  clickOnLabel(label: string): Promise<void>;

  clickOnCanvas(x: number, y: number): Promise<void>;
}
