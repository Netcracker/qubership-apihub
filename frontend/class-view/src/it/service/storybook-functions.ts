import { ElementHandle } from 'puppeteer'

export async function captureScreenshot(domElement: ElementHandle): Promise<Uint8Array> {
  return domElement.screenshot({ encoding: 'binary', type: 'png', captureBeyondViewport: false })
}

export function host(): string {
  const address = process.env.RUN_IN_DOCKER === 'true' ? (process.env.HOST_ADDRESS || 'localhost') : 'localhost'
  return `http://${address}:6006`
}

