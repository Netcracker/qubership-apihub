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

export const metadata = {
  'x-custom1': 'X-Custom1 value',
  'x-custom2': [
    'green',
    12,
    null,
    'undefined',
  ],
  'x-custom3': [
    {
      'prop': 1,
    },
    {
      'prop': 'undefined',
    },
    'text text',
  ],
  'x-custom4': null,
  'x-custom5': 'undefined',
  'x-custom6': {
    'aaa3': false,
  },
  'x-custom7': {
    'one1': {
      'two1': {
        'three1': 'text1',
      },
      'two2': {
        'three1': 'text1',
        'three2': {
          'four1': {
            'five1': 'text1',
          },
          'four2': 123,
        },
      },
      'two3': 'text1',
    },
  },
  'x-custom8': 'test',
}
