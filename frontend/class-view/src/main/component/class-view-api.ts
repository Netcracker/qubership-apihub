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

import { DefaultDomainMeta, DomainMeta } from 'main/domain/object/meta'
import { ContentObject } from 'main/domain/object/content'
import { Duration, Insets, OptionalMembers, Pixel, Point, Zoom } from 'main/domain/base'
import { ContentObjectCustomization } from 'main/component/content-object-customization'

export type DomainObject<Meta extends DomainMeta = DefaultDomainMeta>
  =
  Meta['class']
  | Meta['leafProperty']
  | Meta['propertiesGroup']
  | Meta['propertyToClassRelation']
  | Meta['includeGroupFromClassRelation'];
export type SelectableObject<Meta extends DomainMeta = DefaultDomainMeta> = DomainObject<Meta>;
export type NavigableObject<Meta extends DomainMeta = DefaultDomainMeta> = DomainObject<Meta>;

// export const ZOOM_CHANGING_POLICY_ZOOM_IN_OUT = "in-out"
// export const ZOOM_CHANGING_POLICY_ZOOM_OUT_ONLY = "out-only"
// export const ZOOM_CHANGING_POLICY_ZOOM_FIXED_LOWER_1 = "fixed-lower-1"

// export type ZoomChangingPolicy = typeof ZOOM_CHANGING_POLICY_ZOOM_IN_OUT | typeof ZOOM_CHANGING_POLICY_ZOOM_OUT_ONLY | typeof ZOOM_CHANGING_POLICY_ZOOM_FIXED_LOWER_1

export interface NavigateOptions {
  readonly insets: Insets<Pixel>;
  // readonly zoomChangingPolicy: ZoomChangingPolicy;
}

export interface ClassViewApi<Meta extends DomainMeta = DefaultDomainMeta> extends ContentObjectCustomization<Meta> {
  content: ContentObject<Meta>;

  selectedObjects: SelectableObject<Meta>[];

  zoom: Zoom;

  viewportCenter: Point<Pixel>;

  animationDuration: Duration;

  navigateTo(objects: NavigableObject<Meta>[], options?: OptionalMembers<NavigateOptions>): void;

  /* eslint-disable  @typescript-eslint/no-explicit-any*/
  addEventListener<K extends keyof RichHTMLElementEventMap<Meta>>(type: K, listener: (this: HTMLElement, ev: RichHTMLElementEventMap<Meta>[K]) => any, options?: boolean | AddEventListenerOptions): void;

  /* eslint-disable  @typescript-eslint/no-explicit-any*/
  removeEventListener<K extends keyof RichHTMLElementEventMap<Meta>>(type: K, listener: (this: HTMLElement, ev: RichHTMLElementEventMap<Meta>[K]) => any, options?: boolean | EventListenerOptions): void;
}

export const EVENT_UPDATE_START = 'update-start'
export const EVENT_UPDATE_FINISH = 'update-finish'
export const EVENT_SELECTION_CHANGE = 'objects-select'
export const EVENT_LAYOUT_START = 'layout-start'
export const EVENT_LAYOUT_FINISH = 'layout-finish'
export const EVENT_ZOOM_CHANGE = 'zoom-change'
export const EVENT_VIEWPORT_CENTER_CHANGE = 'viewport-center-change'

export interface SelectionChangeData<Meta extends DomainMeta = DefaultDomainMeta> {
  readonly newValue: SelectableObject<Meta>[];
  readonly oldValue: SelectableObject<Meta>[];
}

export interface RichHTMLElementEventMap<Meta extends DomainMeta> extends HTMLElementEventMap {
  [EVENT_SELECTION_CHANGE]: CustomEvent<SelectionChangeData<Meta>>;
  [EVENT_UPDATE_START]: CustomEvent<void>;
  [EVENT_UPDATE_FINISH]: CustomEvent<void>;
  [EVENT_LAYOUT_START]: CustomEvent<void>;
  [EVENT_LAYOUT_FINISH]: CustomEvent<void>;
  [EVENT_ZOOM_CHANGE]: CustomEvent<Zoom>;
  [EVENT_VIEWPORT_CENTER_CHANGE]: CustomEvent<Point<Pixel>>;
}
