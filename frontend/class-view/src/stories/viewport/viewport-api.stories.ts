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

import { Meta, StoryFn } from '@storybook/html'
import {
  ClassObject,
  DefaultDomainMeta,
  LeafPropertyObject,
  Optional,
  Pixel,
  Point,
  PropertiesGroupObject,
  PropertyObject,
  Zoom
} from 'main/domain'
import { generateClassObject, generateContent, generatePropertiesGroupObject, storyArgsFunc } from 'stories/common'
import { ClassViewComponent, EVENT_VIEWPORT_CENTER_CHANGE, EVENT_ZOOM_CHANGE } from 'main/component'
import { isDefine } from 'main/core/utils'
import { useArgs } from '@storybook/client-api'

const ROUNDING = 4
let updateArgsCapture: Optional<(arg: Partial<StoryArgs>) => void>

export default {
  title: 'Synthetic/Viewport',
  argTypes: {
    zoomProperty: {
      name: 'Zoom',
      control: {
        type: 'number',
        min: Math.pow(10, -ROUNDING).toFixed(ROUNDING),
        max: 5,
        step: Math.pow(10, -ROUNDING).toFixed(ROUNDING)
      },
    },
    viewportX: {
      name: 'Viewport X',
      control: {
        type: 'number',
        min: Math.pow(10, -ROUNDING).toFixed(ROUNDING),
        max: 5,
        step: Math.pow(10, -ROUNDING).toFixed(ROUNDING)
      },
    },
    viewportY: {
      name: 'Viewport Y',
      control: {
        type: 'number',
        min: Math.pow(10, -ROUNDING).toFixed(ROUNDING),
        max: 5,
        step: Math.pow(10, -ROUNDING).toFixed(ROUNDING)
      },
    },
  },
  args: {
    zoomProperty: 1,
    viewportX: 0,
    viewportY: 0,
  }
} satisfies Meta<StoryArgs>

type StoryArgs = {
  zoomProperty: Zoom;
  viewportX: Pixel;
  viewportY: Pixel;
}

const zoomListener: (event: CustomEvent<Zoom>) => void = event => {
  const api: Optional<ClassViewComponent> = event.target as ClassViewComponent
  if (isDefine(updateArgsCapture) && isDefine(api)) {
    updateArgsCapture({
      zoomProperty: api.zoom
    })
  }
}

const viewportListener: (event: CustomEvent<Point<Pixel>>) => void = event => {
  const api: Optional<ClassViewComponent> = event.target as ClassViewComponent
  if (isDefine(updateArgsCapture) && isDefine(api)) {
    const viewport = api.viewportCenter
    updateArgsCapture({
      viewportX: viewport.x,
      viewportY: viewport.y
    })
  }
}

const GROUP: PropertiesGroupObject<LeafPropertyObject> = generatePropertiesGroupObject('group')

const CLASS: ClassObject<PropertyObject<DefaultDomainMeta>> = generateClassObject('class', { properties: [GROUP] })

const CONTENT = generateContent({ classes: [CLASS] })

export const ViewportAPI: StoryFn<StoryArgs> = storyArgsFunc((args, component) => {
  component.zoom = args.zoomProperty
  component.viewportCenter = {
    x: args.viewportX,
    y: args.viewportY
  }

  const [
    , updateArgs
  ] = useArgs()
  updateArgsCapture = updateArgs
}, baseContext => {
  baseContext.component.content = CONTENT
  baseContext.component.addEventListener(EVENT_ZOOM_CHANGE, zoomListener)
  baseContext.component.addEventListener(EVENT_VIEWPORT_CENTER_CHANGE, viewportListener)
  return baseContext
})
