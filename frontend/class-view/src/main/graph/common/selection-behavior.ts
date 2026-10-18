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

import { dispatch, pointer, select, Selection } from 'd3'
import { Optional, Pixel } from 'main/domain/base'
import { isDefine } from 'main/core/utils'
import { shallowEqual } from 'fast-equals'

export const SELECTION_CHANGE_EVENT_TYPE = 'selection'
const CLICK_DISTANCE: Pixel = 3

export type SelectableElementBaseType = Element;
export type ClearSelectionElementBaseType = Element;

export interface DomSelectionBehavior<SelectedElement extends SelectableElementBaseType, ClearSelectionElement extends ClearSelectionElementBaseType, Datum> {
  watch(selection: Selection<SelectedElement, Datum, never, unknown>): void;

  unwatch(selection: Selection<SelectedElement, Datum, never, unknown>): void;

  filter: (this: SelectedElement | ClearSelectionElement, event: MouseEvent, datum: Datum) => boolean;

  selection: Datum[];

  on(type: string, listener: (this: SelectedElement, event: DomSelectionEvent<Datum>, d: Datum) => void): void;

  off(type: string): void;

  isSelected(datum: Datum): boolean
}

export interface DomSelectionEvent<Datum> {
  selection: Datum[]
}

enum Mode {
  NONE,
  CLEAN,
  SELECT
}

const MOUSE_UP = 'mouseup.selection'
const MOUSE_DOWN = 'mousedown.selection'

export default function domElementSelection<SelectedElement extends SelectableElementBaseType, ClearSelectionElement extends ClearSelectionElementBaseType, Datum>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  commonContainerArea: Selection<ClearSelectionElement, any, any, any>,
): DomSelectionBehavior<SelectedElement, ClearSelectionElement, Datum> {
  const listeners = dispatch<SelectedElement | ClearSelectionElement>(SELECTION_CHANGE_EVENT_TYPE)
  const _selectedData: Set<Datum> = new Set()
  let _filter: (this: SelectedElement | ClearSelectionElement, event: MouseEvent, datum: Datum) => boolean = () => false
  let mode: Mode = Mode.NONE

  function tryUpdateMode(newMode: Mode): boolean {
    if (mode === Mode.NONE) {
      mode = newMode
      return true
    }
    return false
  }

  function mouseEventCanBeProceed(downLocation: [Pixel, Pixel], sameTarget: EventTarget | null, upEvent: MouseEvent, expectedMode: Mode): boolean {
    if (expectedMode !== mode) {
      mode = Mode.NONE
      return false
    }
    mode = Mode.NONE
    const upLocation = pointer(upEvent, sameTarget)
    if ((Math.pow(downLocation[0] - upLocation[0], 2) + Math.pow(downLocation[1] - upLocation[1], 2)) > CLICK_DISTANCE) {
      return false
    }
    upEvent.stopPropagation()
    return true
  }

  function mouseDownListenerFunction<Element extends SelectedElement | ClearSelectionElement>(mode: Mode, updateSelection: (elementDatum: Optional<Datum>) => Datum[]): (this: Element, eventDown: MouseEvent, d: Datum) => void {
    return function (this: Element, eventDown: MouseEvent, d: Datum): void {
      if (!tryUpdateMode(mode)) {
        return
      }
      if (!_filter.call(this, eventDown, d)) {
        return
      }
      //eslint-disable-next-line @typescript-eslint/no-this-alias
      const el = this
      const currentTarget = eventDown.view || window
      const downLocation = pointer(eventDown, currentTarget)
      const sel = select<Window, undefined>(currentTarget).on(MOUSE_UP, mouseUp, true)

      function mouseUp(this: Window, eventUp: MouseEvent) {
        sel.on(MOUSE_UP, null)
        if (!mouseEventCanBeProceed(downLocation, currentTarget, eventUp, mode)) {
          return
        }
        const oldSelection = [..._selectedData]
        const newSelection = updateSelection(d)
        if (shallowEqual(oldSelection, newSelection)) {
          return
        }
        listeners.call(SELECTION_CHANGE_EVENT_TYPE, el, {
          selection: newSelection,
        } satisfies DomSelectionEvent<Datum>)
      }
    }
  }

  commonContainerArea.on(MOUSE_DOWN, mouseDownListenerFunction(Mode.CLEAN, () => []))

  return {
    watch(selection: Selection<SelectedElement, Datum, never, unknown>): void {
      selection.on(MOUSE_DOWN, mouseDownListenerFunction(Mode.SELECT, (d) => isDefine(d) ? [d] : []))
    },
    unwatch(selection: Selection<SelectedElement, Datum, never, unknown>): void {
      selection.on(MOUSE_DOWN, null)
    },
    on(type: string, listener: (this: SelectedElement | ClearSelectionElement, event: DomSelectionEvent<Datum>, d: Datum) => void): void {
      listeners.on(type, listener)
    },
    off(type: string): void {
      listeners.on(type, null)
    },
    get filter(): (this: SelectedElement | ClearSelectionElement, event: MouseEvent, datum: Datum) => boolean {
      return _filter
    },
    set filter(value: (this: SelectedElement | ClearSelectionElement, event: MouseEvent, datum: Datum) => boolean) {
      _filter = value
    },
    get selection(): Datum[] {
      return [..._selectedData]
    },
    set selection(value: Datum[]) {
      _selectedData.clear()
      value.forEach(el => _selectedData.add(el))
    },
    isSelected(datum: Datum): boolean {
      return _selectedData.has(datum)
    },
  }
}