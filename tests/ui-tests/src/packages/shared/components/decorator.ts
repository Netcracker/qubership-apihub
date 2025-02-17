import { test as report } from '@playwright/test'
import type { BaseComponent } from '@shared/components/base'
import type {
  CheckOptions,
  ClearOptions,
  ClickOptions,
  FillOptions,
  HoverOptions,
  TimeoutOption,
  TypeOptions,
} from '@shared/entities'
import { quoteName } from '@services/utils'

export async function descriptiveClick(component: BaseComponent, options?: ClickOptions): Promise<void> {
  await report.step(`Click ${quoteName(component.componentName)} ${component.componentType}`, async () => {
    await component.mainLocator.click(options)
  }, { box: true })
}

export async function descriptiveHover(component: BaseComponent, options?: HoverOptions): Promise<void> {
  await report.step(`Hover ${quoteName(component.componentName)} ${component.componentType}`, async () => {
    await component.mainLocator.hover(options)
    await component.mainLocator.page().waitForTimeout(500) //WA: wait while extra tooltips disappear
  }, { box: true })
}

export async function descriptiveFill(component: BaseComponent, value: string, options?: FillOptions): Promise<void> {
  await report.step(`Fill ${quoteName(component.componentName)} ${component.componentType} with "${value}"`, async () => {
    await component.mainLocator.fill(value, options)
  }, { box: true })
}

export async function descriptiveType(component: BaseComponent, value: string, options?: TypeOptions): Promise<void> {
  await report.step(`Type "${value}" into ${quoteName(component.componentName)} ${component.componentType}`, async () => {
    await component.mainLocator.type(value, options)
  }, { box: true })
}

export async function descriptiveClear(component: BaseComponent, options?: ClearOptions): Promise<void> {
  await report.step(`Clear ${quoteName(component.componentName)} ${component.componentType}`, async () => {
    await component.mainLocator.clear(options)
  }, { box: true })
}

export async function descriptiveCheck(component: BaseComponent, options?: CheckOptions): Promise<void> {
  await report.step(`Check ${quoteName(component.componentName)} ${component.componentType}`, async () => {
    await component.mainLocator.check(options)
  }, { box: true })
}

export async function descriptiveUncheck(component: BaseComponent, options?: CheckOptions): Promise<void> {
  await report.step(`Uncheck ${quoteName(component.componentName)} ${component.componentType}`, async () => {
    await component.mainLocator.uncheck(options)
  }, { box: true })
}

export async function descriptiveScroll(component: BaseComponent, options?: TimeoutOption): Promise<void> {
  await report.step(`Scroll until ${quoteName(component.componentName)} ${component.componentType} to be visible`, async () => {
    await component.mainLocator.scrollIntoViewIfNeeded(options)
  }, { box: true })
}

export async function descriptiveFocus(component: BaseComponent, options?: TimeoutOption): Promise<void> {
  await report.step(`Focus ${quoteName(component.componentName)} ${component.componentType}`, async () => {
    await component.mainLocator.focus(options)
  }, { box: true })
}
