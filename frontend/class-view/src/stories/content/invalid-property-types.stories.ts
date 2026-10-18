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

import { Meta } from '@storybook/html'
import { Template } from 'stories/common'

export default {
  title: 'Synthetic/Content',
} satisfies Meta

const CONTENT = {
  classes: [
    {
      key: 1,
      name: 2,
      shape: 16,
      properties: [
        {
          key: 3,
          kind: 4,
          name: 5,
          propertyType: 6,
          required: true,
        },
        {
          key: 8,
          kind: 9,
          name: 10,
          properties: [
            {
              key: 11,
              kind: 12,
              name: 13,
              propertyType: 14,
              required: true,
            },
          ],
        },
      ],
    },
  ],
  relations: [
    {
      kind: 15,
      leafPropertyKey: 1,
      referenceClassKey: 3,
      primary: true,
    },
  ],
}

export const InvalidPropertyTypes = Template.bind({})

InvalidPropertyTypes.args = {
  content: CONTENT
}
