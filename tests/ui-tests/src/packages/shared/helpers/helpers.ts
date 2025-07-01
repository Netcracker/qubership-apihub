import { test as report } from 'playwright/test'
import type { BaseComponent } from '@shared/components/base'

export const hoverableOpening = async (hoverableElement: BaseComponent, clickableElement: BaseComponent, stepTitle: string): Promise<void> => {
  await report.step(stepTitle, async () => {
    await hoverableElement.hover()
    await clickableElement.click()
  })
}
