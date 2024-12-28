import { ElementHandle } from 'puppeteer'

export async function captureScreenshot(domElement: ElementHandle): Promise<Buffer | string> {
  return domElement.screenshot({ encoding: 'binary', type: 'png' })
}

export function host(): string {
  return process.env.RUN_IN_DOCKER === 'true' ? 'http://host.docker.internal:9009' : 'http://localhost:9009'
}

