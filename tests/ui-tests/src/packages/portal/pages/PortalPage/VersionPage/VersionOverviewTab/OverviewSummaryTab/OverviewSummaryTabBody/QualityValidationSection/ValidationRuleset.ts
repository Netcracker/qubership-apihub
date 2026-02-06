import type { Locator } from '@playwright/test'
import { BaseComponent, Chip, Link } from '@shared/components/base'

export class ValidationRuleset extends BaseComponent {
  readonly nameLink = new Link(
    this.rootLocator.getByTestId('ValidationRulesetLinkName'),
    this.componentName,
    'ruleset link',
  )
  readonly apiTypeChip = new Chip(
    this.rootLocator.getByTestId('ValidationRulesetApiTypeChip'),
    this.componentName,
    'ruleset API type chip',
  )
  readonly statusChip = new Chip(
    this.rootLocator.getByTestId('ValidationRulesetStatusChip'),
    this.componentName,
    'ruleset status chip',
  )

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType ?? 'validation ruleset')
  }
}
