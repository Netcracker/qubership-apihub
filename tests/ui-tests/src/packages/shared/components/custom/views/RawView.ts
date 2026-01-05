import type { Page } from '@playwright/test'
import { BaseComponent, Button } from '@shared/components/base'
import { LineNumberContainer } from './RawView/LineNumberContainer'
import { ProblemPopUp } from './RawView/ProblemPopUp'
import { ProblemTooltip } from './RawView/ProblemTooltip'

export const CLASS_ACTIVE_LINE_NUMBER = /active-line-number/
export const CLASS_SELECTED_DECORATOR = /MonacoSelectedDecorator/
export const CLASS_CODICON_ERROR = 'codicon-error'
export const CLASS_CODICON_WARNING = 'codicon-warning'
export const CLASS_CODICON_INFO = 'codicon-info'

export const RAW_VIEW_FORMATS = {
  YAML: 'yaml',
  JSON: 'json',
} as const

export type RawViewFormat = (typeof RAW_VIEW_FORMATS)[keyof typeof RAW_VIEW_FORMATS]

export class RawView extends BaseComponent {
  readonly jsonBtn = new Button(this.page.getByTestId('ModeButton-json'), 'JSON')
  readonly yamlBtn = new Button(this.page.getByTestId('ModeButton-yaml'), 'YAML')
  readonly problemPopUp = new ProblemPopUp(this.page)
  readonly problemTooltip = new ProblemTooltip(this.page)

  constructor(private readonly page: Page) {
    super(page.locator('.monaco-editor').and(page.getByRole('code')), 'Raw view')
  }

  getLineNumberContainer(lineNumber: number): LineNumberContainer {
    // Use exact regex match to distinguish between line numbers like 9 and 19
    const exactRegex = new RegExp(`^${lineNumber}$`)
    return new LineNumberContainer(
      this.rootLocator.locator('.margin-view-overlays .line-numbers').filter({ hasText: exactRegex }),
      String(lineNumber),
    )
  }

  getTextContent(text: string): BaseComponent {
    return new BaseComponent(this.rootLocator.locator('.view-lines').getByText(text), text, 'text')
  }

  async hoverText(text: string): Promise<void> {
    const textContent = this.getTextContent(text)
    await textContent.hover()
  }

  /**
   * Hovers over the first space BEFORE the found text.
   * This is used for Monaco Editor hint tooltips that appear on whitespace before text.
   *
   * Note: this implementation uses `boundingBox()` of the rendered text element. For correct coordinates,
   * the matched text must fit into a single visual line. If Monaco wraps the text, the bounding box can
   * cover multiple wrapped fragments and the computed hover position may end up on a different line.
   *
   * @param text - The text to find in the editor
   * @throws Error if the text element's bounding box cannot be determined
   */
  async hoverHintText(text: string): Promise<void> {
    const textLocator = this.rootLocator.locator('.view-lines').getByText(text)
    await this.page.waitForTimeout(500) // locator stabilization
    const box = await textLocator.boundingBox()
    if (!box) {
      throw new Error(`Cannot determine bounding box for text "${text}". Element may not be visible or rendered.`)
    }
    // Hover at the position before the text (left edge minus a small offset)
    await this.page.mouse.move(box.x - 5, box.y + box.height / 2)
  }

  async clickText(text: string): Promise<void> {
    const textContent = this.getTextContent(text)
    await textContent.click()
  }
}
