import { Optional, OptionalMembers } from 'main/domain/base'
import { DomainMeta } from 'main/domain/object/meta'
import { NavigableObject, NavigateOptions } from 'main/component/class-view-api'
import { isDefine } from 'main/core/utils'
import { DEFAULT_CONTENT_INSETS } from 'main/defaults'

export interface DeferredOperations<
  Meta extends DomainMeta
> {
  navigate: Optional<DeferredNavigate<Meta>>;
}

export interface DeferredNavigate<
  Meta extends DomainMeta
> {
  readonly objects: NavigableObject<Meta>[];
  readonly options: NavigateOptions;
}

export class DeferredOperationsManager<
  Meta extends DomainMeta
> {
  private readonly _operations: DeferredOperations<Meta>

  constructor(private readonly _markDirtyFunction: () => void) {
    this._operations = {
      navigate: undefined,
    }
  }

  public get dirty(): boolean {
    return isDefine(this._operations.navigate)
  }

  public applyChanges(): void {
    this._operations.navigate = undefined
  }

  public scheduleNavigateTo(objects: NavigableObject<Meta>[], options: OptionalMembers<NavigateOptions>): void {
    this._operations.navigate = {
      objects,
      options: fillNavigateOptionDefaults(options),
    }
    this._markDirtyFunction()
  }

  public get deferredOperations(): DeferredOperations<Meta> {
    return {
      ...this._operations,
    }
  }
}

export function fillNavigateOptionDefaults(optional: OptionalMembers<NavigateOptions>): NavigateOptions {
  return {
    insets: optional.insets ?? DEFAULT_CONTENT_INSETS,
  }
}