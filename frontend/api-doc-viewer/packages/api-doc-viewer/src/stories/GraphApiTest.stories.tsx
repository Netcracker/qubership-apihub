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

import type { Meta, StoryObj } from '@storybook/react';
import { GraphQLOperationViewer } from '../components/GraphQLOperationViewer/GraphQLOperationViewer';
import { graphapi } from './utils/helpers';
import { prepareGraphApiSchema } from './preprocess';

// It's necessary because storybook doesn't render nested stories without this empty story
// eslint-disable-next-line storybook/story-exports
const meta = {
  title: 'Graph Api Viewer',
  component: GraphQLOperationViewer,
  parameters: {},
  argTypes: {},
  args: {
    source: {}
  }
} satisfies Meta<typeof GraphQLOperationViewer>;

export default meta;

type Story = StoryObj<typeof meta>

export const Test: Story = {
  args: {
    source: {},
    expandedDepth: 100
  }
}

export const Union: Story = {
  args: {
    source: prepareGraphApiSchema({
      source: graphapi`
        type Query {
          test: Union
        }
        union Union = String | ID | MyType
        type MyType {
          id: ID!
        }
      `
    }),
  }
}

export const SelfCycled: Story = {
  args: {
    source: prepareGraphApiSchema({
      source: graphapi`
        type Query {
          test: CycledEntity
        }
        type CycledEntity {
          value: String
          child: CycledEntity
        }
      `,
      circular: true
    }),
  }
}

export const PerformanceResearch: Story = {
  args: {
    source: prepareGraphApiSchema({
      source: graphapi`
      directive @foo on ARGUMENT_DEFINITION | FIELD_DEFINITION | INPUT_FIELD_DEFINITION
      directive @bar on ARGUMENT_DEFINITION | FIELD_DEFINITION | INPUT_FIELD_DEFINITION

      type Query {
        todo(
          arg11: MyInput
          arg12: MyInput!
          "Description"
          arg13: MyInput
          "Description"
          arg14: MyInput!
          arg21: [MyInput]
          arg22: [MyInput!]
          arg23: [MyInput]!
          arg24: [MyInput!]!
          arg31: MyInput @foo
          arg32: MyInput! @foo
          arg33: MyInput @bar
          arg34: MyInput @bar
          arg35: MyInput @foo @bar
          arg36: MyInput! @foo @bar
          arg37: MyInput @deprecated
          arg38: MyInput @deprecated(reason: "AAA")
          arg39: MyInput @deprecated(reason: "BBBBBBB")
        ): MyType!

        todo2: MyUnion    
      }

      type MyType {
        a: String!
        b: Int!
        c: Boolean
        method11: MyType
        method12: MyType!
        "Description"
        method13: MyType
        "Description"
        method14: MyType!
        method21: [MyType]
        method22: [MyType!]
        method23: [MyType]!
        method24: [MyType!]!
        method31: MyType @foo
        method32: MyType! @foo
        method33: MyType @bar
        method34: MyType @bar
        method35: MyType @foo @bar
        method36: MyType! @foo @bar
        method37: MyType @deprecated
        method38: MyType @deprecated(reason: "AAA")
        method39: MyType @deprecated(reason: "BBBBBBB")
        method4: MyUnion
      }

      input MyInput {
        a: String!
        b: Int!
        c: Boolean
        prop11: MyInput
        prop12: MyInput!
        "Description"
        prop13: MyInput
        "Description"
        prop14: MyInput!
        prop21: [MyInput]
        prop22: [MyInput!]
        prop23: [MyInput]!
        prop24: [MyInput!]!
        prop31: MyInput @foo
        prop32: MyInput! @foo
        prop33: MyInput @bar
        prop34: MyInput @bar
        prop35: MyInput @foo @bar
        prop36: MyInput! @foo @bar
        prop37: MyInput @deprecated
        prop38: MyInput @deprecated(reason: "AAA")
        prop39: MyInput @deprecated(reason: "BBBBBBB")
        prop4: MyUnion
      }

      union MyUnion = MyType | MyInput
      `,
      circular: true
    }),
  }
}
