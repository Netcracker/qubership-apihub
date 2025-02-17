import { type Locator } from '@playwright/test'

export abstract class BaseExpect {
  abstract not: BaseExpectNot

  protected constructor(readonly actual: Locator, readonly options: { soft: boolean }) {
  }
}

export abstract class BaseExpectNot {

  protected constructor(readonly actual: Locator, readonly options: { soft: boolean }) {
  }
}
