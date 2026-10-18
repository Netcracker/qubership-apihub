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

import { DEFAULT_ANIMATION_DURATION, DEFAULT_CONTENT_INSETS } from 'main/defaults'
import { Args, ArgTypes } from '@storybook/html'
import { Duration, Insets, Pixel } from 'main/domain'

export const NAVIGATION_OPTION_ARGS_TYPE: ArgTypes = {
  navigateOptionAnimationDuration: {
    name: 'Navigate option. Animation duration',
    control: { type: 'number', min: 0, max: 5000, step: 50 },
  },
  navigateOptionInsets: {
    name: 'Navigate option. Insets',
    control: {
      type: 'radio',
      labels: {
        '0': 'Empty',
        '1': 'Default',
        '2': 'Left: 50',
        '3': 'Top: 150',
        '4': 'Bottom: 200',
        '5': 'Right: 100'
      }
    },
    options: [
      '0',
      '1',
      '2',
      '3',
      '4',
      '5'
    ],
    mapping: [
      { top: 0, bottom: 0, left: 0, right: 0 } as Insets<Pixel>,
      DEFAULT_CONTENT_INSETS,
      { top: 0, bottom: 0, left: 50, right: 0 } as Insets<Pixel>,
      { top: 150, bottom: 0, left: 0, right: 0 } as Insets<Pixel>,
      { top: 0, bottom: 200, left: 0, right: 0 } as Insets<Pixel>,
      { top: 0, bottom: 0, left: 0, right: 100 } as Insets<Pixel>
    ],
  },
}

export const NAVIGATION_OPTION_ARGS: Args = {
  navigateOptionAnimationDuration: DEFAULT_ANIMATION_DURATION,
  navigateOptionInsets: '1'

}

export type NavigationOptionConfiguration = {
  navigateOptionAnimationDuration: Duration;
  navigateOptionInsets: Insets<Pixel>;
}
