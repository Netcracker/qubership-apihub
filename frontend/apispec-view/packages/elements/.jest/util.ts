import { Frame, Page } from 'puppeteer'

import * as path from 'path'

'use strict'
const KEBAB_REGEX = /[A-Z\u00C0-\u00D6\u00D8-\u00DE]/g

function getTestIdentifier(): string {
  const { currentTestName, testPath } = expect.getState()
  if (!testPath) {
    throw new Error('Test path is nullish. It seems function is called outside of test.')
  }
  return kebabCase(`${path.basename(testPath)}-${(currentTestName ?? 'all')}`.replaceAll(/[. ]/g, '-'))
}

export function getTestVidePath(): `${string}.webm` {
  const { testPath } = expect.getState()
  if (!testPath) {
    throw new Error('Test path is nullish. It seems function is called outside of test.')
  }
  const snapshotsDir = path.join(path.dirname(testPath), '__image_snapshots__')
  const receivedOutput = path.join(snapshotsDir, '__received_output__')
  return path.join(receivedOutput, `${getTestIdentifier()}.webm`) as `${string}.webm`
}

export async function waitStoryFrame(page: Page): Promise<Frame> {
  let fulfill: (frame: Frame) => void
  let retryPid: number

  const promise = new Promise<Frame>(x => fulfill = x)

  const checkFrame = (): void => {
    page.off('frameattached', checkFrame)
    global.clearTimeout(retryPid)
    const frame = page.mainFrame()
      .childFrames()
      .find(f => f.name() === 'storybook-preview-iframe')

    if (frame) {
      fulfill(frame)
    } else {
      page.once('frameattached', checkFrame)
      retryPid = global.setTimeout(checkFrame, 50) as unknown as number // fixme: type definition collision
    }
  }

  checkFrame()

  return promise
}

function kebabCase(str: string): string {
  return str.replace(KEBAB_REGEX, function (match) {
    return '-' + match.toLowerCase()
  })
}
