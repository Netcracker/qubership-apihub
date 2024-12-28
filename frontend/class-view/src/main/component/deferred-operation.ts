/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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