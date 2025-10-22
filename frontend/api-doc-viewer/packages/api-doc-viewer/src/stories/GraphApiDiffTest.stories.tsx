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

import { DIFF_META_KEY, DIFFS_AGGREGATED_META_KEY } from '@netcracker/qubership-apihub-api-diff'
import type { Meta, StoryObj } from '@storybook/react'
import { GraphQLOperationDiffViewer } from '../components/GraphQLOperationViewer/GraphQLOperationDiffViewer'
import { SIDE_BY_SIDE_DIFFS_LAYOUT_MODE } from '../types/LayoutMode'
import { prepareGraphApiDiffSchema } from './preprocess'
import { buildGraphApi, graphapi } from './utils/helpers'

// It's necessary because storybook doesn't render nested stories without this empty story
// eslint-disable-next-line storybook/story-exports
const meta = {
  title: 'Graph Api Diff Viewer',
  component: GraphQLOperationDiffViewer,
  parameters: {},
  argTypes: {},
  args: {
    source: {},
  },
} satisfies Meta<typeof GraphQLOperationDiffViewer>

export default meta

type Story = StoryObj<typeof meta>

export const Test: Story = {
  args: {
    source: prepareGraphApiDiffSchema({
      beforeSource: {},
      afterSource: {},
    }),
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: {
      diffsMetaKey: DIFF_META_KEY,
      aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
    },
  },
}

const deprecationBefore = graphapi`
type Query {
  deprecatedQuery: Response
  unDeprecatedQuery: Response @deprecated
  deprecatedWithReasonQuery: Response
  unDeprecatedWithReasonQuery: Response @deprecated(reason: "Will be removed")
}
type Response {
  deprecatedProperty: String
  unDeprecatedProperty: String @deprecated
  deprecatedWithReasonProperty: String
  unDeprecatedWithReasonProperty: String @deprecated(reason: "Will be removed")
  changedDeprecationReasonProperty: String @deprecated(reason: "BEFORE")
  notChangedDeprecatedProperty: String @deprecated
  notChangedDeprecatedWithReasonProperty: String @deprecated(reason: "Reason!!!")
  notChangedNotDeprecatedProperty: String
  enum: Enum
  bugEnum: BugEnum
}
enum Enum {
  deprecatedValue
  unDeprecatedValue @deprecated
  deprecatedWithReasonValue
  unDeprecatedWithReasonValue @deprecated(reason: "Will be removed")
  changedDeprecationReasonProperty @deprecated(reason: "BEFORE")
  changedDeprecationReasonPropertyFromDefault @deprecated
  changedDeprecationReasonPropertyToDefault @deprecated(reason: "Not default reason")
  notChangedDeprecatedValue @deprecated
  notChangedDeprecatedWithReasonValue @deprecated(reason: "Reason!!!")
  notChangedNotDeprecatedValue
}
enum BugEnum {
  deprecated
}
`
const deprecationAfter = graphapi`
type Query {
  deprecatedQuery: Response @deprecated
  unDeprecatedQuery: Response
  deprecatedWithReasonQuery: Response @deprecated(reason: "Will be removed")
  unDeprecatedWithReasonQuery: Response
}
type Response {
  deprecatedProperty: String @deprecated
  unDeprecatedProperty: String
  deprecatedWithReasonProperty: String @deprecated(reason: "Will be removed")
  unDeprecatedWithReasonProperty: String
  changedDeprecationReasonProperty: String @deprecated(reason: "AFTER")
  notChangedDeprecatedProperty: String @deprecated
  notChangedDeprecatedWithReasonProperty: String @deprecated(reason: "Reason!!!")
  notChangedNotDeprecatedProperty: String
  enum: Enum
  bugEnum: BugEnum
}
enum Enum {
  deprecatedValue @deprecated
  unDeprecatedValue
  deprecatedWithReasonValue @deprecated(reason: "Will be removed")
  unDeprecatedWithReasonValue
  changedDeprecationReasonProperty @deprecated(reason: "AFTER")
  changedDeprecationReasonPropertyFromDefault @deprecated(reason: "Not default reason")
  changedDeprecationReasonPropertyToDefault @deprecated
  notChangedDeprecatedValue @deprecated
  notChangedDeprecatedWithReasonValue @deprecated(reason: "Reason!!!")
  notChangedNotDeprecatedValue
}
enum BugEnum {
  deprecated @deprecated
}
`
export const DeprecatedQuery: Story = {
  args: {
    source: prepareGraphApiDiffSchema({
      beforeSource: deprecationBefore,
      afterSource: deprecationAfter,
    }),
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: {
      diffsMetaKey: DIFF_META_KEY,
      aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
    },
  },
}
export const UnDeprecatedQuery: Story = {
  args: {
    source: prepareGraphApiDiffSchema({
      beforeSource: deprecationBefore,
      afterSource: deprecationAfter,
    }),
    operationPath: 'unDeprecatedQuery',
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: {
      diffsMetaKey: DIFF_META_KEY,
      aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
    },
  },
}
export const DeprecatedWithReasonQuery: Story = {
  args: {
    source: prepareGraphApiDiffSchema({
      beforeSource: deprecationBefore,
      afterSource: deprecationAfter,
    }),
    operationPath: 'deprecatedWithReasonQuery',
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: {
      diffsMetaKey: DIFF_META_KEY,
      aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
    },
  },
}
export const UnDeprecatedWithReasonQuery: Story = {
  args: {
    source: prepareGraphApiDiffSchema({
      beforeSource: deprecationBefore,
      afterSource: deprecationAfter,
    }),
    operationPath: 'unDeprecatedWithReasonQuery',
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: {
      diffsMetaKey: DIFF_META_KEY,
      aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
    },
  },
}

export const SimpleEnum: Story = {
  args: {
    source: prepareGraphApiDiffSchema({
      beforeSource: graphapi`
        type Query {
          test: Enum
        }
        enum Enum {
          first
          second
          third
          fourth
        }
      `,
      afterSource: graphapi`
        type Query {
          test: Enum
        }
        enum Enum {
          first
          second
          THIRD
        }
      `,
    }),
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: {
      diffsMetaKey: DIFF_META_KEY,
      aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
    },
  },
}

export const WhollyAddedSimpleEnum: Story = {
  args: {
    source: prepareGraphApiDiffSchema({
      beforeSource: graphapi`
        type Query {
          test: String
        }
      `,
      afterSource: graphapi`
        type Query {
          test: Enum
        }
        enum Enum {
          first
          second
          third
        }
      `,
    }),
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: {
      diffsMetaKey: DIFF_META_KEY,
      aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
    },
  },
}

export const WhollyRemovedSimpleEnum: Story = {
  args: {
    source: prepareGraphApiDiffSchema({
      beforeSource: graphapi`
        type Query {
          test: Enum
        }
        enum Enum {
          first
          second
          third
        }
      `,
      afterSource: graphapi`
        type Query {
          test: String
        }
      `,
    }),
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: {
      diffsMetaKey: DIFF_META_KEY,
      aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
    },
  },
}

const complexEnumBefore = graphapi`
type Query {
  test: Enum
}
enum Enum {
  simpleValue
  "My value"
  valueWithDescription
  valueWithDeprecation @deprecated
  valueWithCustomDeprecation @deprecated(reason: "Because why")

  "My value"
  complexValue @deprecated(reason: "Because why")
  "My value"
  complexValueRemovedDescription @deprecated(reason: "Because why")
  "My value"
  complexValueRemovedDeprecation @deprecated(reason: "Because why")
  complexValueAddedDescription @deprecated(reason: "Because why")
  "My value"
  complexValueAddedDeprecation
  "My value"
  complexValueBecameSimple @deprecated(reason: "Because why")

  removedValue
  "My value"
  removedValueWithDescription
  "My value"
  valueWithChangedDescription
  removedValueWithDeprecation @deprecated
  removedValueWithCustomDeprecation @deprecated(reason: "Because why")
  valueWithChangedDeprecationReason @deprecated(reason: "Because why")
}
`
const complexEnumAfter = graphapi`
type Query {
  test: Enum
}
enum Enum {
  simpleValue
  "My value"
  valueWithDescription
  valueWithDeprecation @deprecated
  valueWithCustomDeprecation @deprecated(reason: "Because why")

  "My value"
  complexValue @deprecated(reason: "Because why")
  complexValueRemovedDescription @deprecated(reason: "Because why")
  "My value"
  complexValueRemovedDeprecation
  "My value"
  complexValueAddedDescription @deprecated(reason: "Because why")
  "My value"
  complexValueAddedDeprecation @deprecated(reason: "Because why")
  complexValueBecameSimple

  addedValue
  "My value"
  addedValueWithDescription
  "My value CHANGED"
  valueWithChangedDescription
  addedValueWithDeprecation @deprecated
  addedValueWithCustomDeprecation @deprecated(reason: "Because why")
  valueWithChangedDeprecationReason @deprecated(reason: "Because why CHANGED")
}
`
export const ComplexEnum: Story = {
  args: {
    source: prepareGraphApiDiffSchema({
      beforeSource: complexEnumBefore,
      afterSource: complexEnumAfter,
    }),
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: {
      diffsMetaKey: DIFF_META_KEY,
      aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
    },
  },
}

export const WhollyAddedComplexEnum: Story = {
  args: {
    source: prepareGraphApiDiffSchema({
      beforeSource: graphapi`
        type Query {
          test: String
        }
      `,
      afterSource: graphapi`
        directive @foo on ENUM_VALUE
        type Query {
          test: Enum
        }
        enum Enum {
          first
          "My Value"
          second
          third @deprecated
          "My value"
          fourth @foo @deprecated(reason: "Because why")
        }
      `,
    }),
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: {
      diffsMetaKey: DIFF_META_KEY,
      aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
    },
  },
}

export const WhollyRemovedComplexEnum: Story = {
  args: {
    source: prepareGraphApiDiffSchema({
      beforeSource: graphapi`
        directive @foo on ENUM_VALUE
        type Query {
          test: Enum
        }
        enum Enum {
          first
          "My Value"
          second
          third @deprecated
          "My value"
          fourth @foo @deprecated(reason: "Because why")
        }
      `,
      afterSource: graphapi`
        type Query {
          test: String
        }
      `,
    }),
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: {
      diffsMetaKey: DIFF_META_KEY,
      aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
    },
  },
}

export const WhollyAddedDirective: Story = {
  args: {
    source: prepareGraphApiDiffSchema({
      beforeSource: graphapi`
        directive @foo on FIELD_DEFINITION
        type Query {
          test: String
        }
      `,
      afterSource: graphapi`
        directive @foo on FIELD_DEFINITION
        type Query {
          test: String @foo
        }
      `,
    }),
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: {
      diffsMetaKey: DIFF_META_KEY,
      aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
    },
  },
}

export const WhollyRemovedDirective: Story = {
  args: {
    source: prepareGraphApiDiffSchema({
      beforeSource: graphapi`
        directive @foo on FIELD_DEFINITION
        type Query {
          test: String @foo
        }
      `,
      afterSource: graphapi`
        directive @foo on FIELD_DEFINITION
        type Query {
          test: String
        }
      `,
    }),
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: {
      diffsMetaKey: DIFF_META_KEY,
      aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
    },
  },
}

export const AppendDirective: Story = {
  args: {
    source: prepareGraphApiDiffSchema({
      beforeSource: graphapi`
        directive @foo on FIELD_DEFINITION
        directive @bar on FIELD_DEFINITION
        type Query {
          test: String @foo
        }
      `,
      afterSource: graphapi`
        directive @foo on FIELD_DEFINITION
        directive @bar on FIELD_DEFINITION
        type Query {
          test: String @foo @bar
        }
      `,
    }),
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: {
      diffsMetaKey: DIFF_META_KEY,
      aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
    },
  },
}

export const PopDirective: Story = {
  args: {
    source: prepareGraphApiDiffSchema({
      beforeSource: graphapi`
        directive @foo on FIELD_DEFINITION
        directive @bar on FIELD_DEFINITION
        type Query {
          test: String @foo @bar
        }
      `,
      afterSource: graphapi`
        directive @foo on FIELD_DEFINITION
        directive @bar on FIELD_DEFINITION
        type Query {
          test: String @bar
        }
      `,
    }),
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: {
      diffsMetaKey: DIFF_META_KEY,
      aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
    },
  },
}

export const AddedDirectiveLocation: Story = {
  args: {
    source: prepareGraphApiDiffSchema({
      beforeSource: graphapi`
        directive @foo on FIELD_DEFINITION
        type Query {
          test: String @foo
        }
      `,
      afterSource: graphapi`
        directive @foo on FIELD_DEFINITION | INPUT_FIELD_DEFINITION
        type Query {
          test: String @foo
        }
      `,
    }),
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: {
      diffsMetaKey: DIFF_META_KEY,
      aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
    },
  },
}

export const RemovedDirectiveLocation: Story = {
  args: {
    source: prepareGraphApiDiffSchema({
      beforeSource: graphapi`
        directive @foo on FIELD_DEFINITION | INPUT_FIELD_DEFINITION
        type Query {
          test: String @foo
        }
      `,
      afterSource: graphapi`
        directive @foo on FIELD_DEFINITION
        type Query {
          test: String @foo
        }
      `,
    }),
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: {
      diffsMetaKey: DIFF_META_KEY,
      aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
    },
  },
}

export const ReplacedDirectiveLocation: Story = {
  args: {
    source: prepareGraphApiDiffSchema({
      beforeSource: graphapi`
        directive @foo on FIELD_DEFINITION | INPUT_FIELD_DEFINITION
        type Query {
          test: String @foo
        }
      `,
      afterSource: graphapi`
        directive @foo on FIELD_DEFINITION | ARGUMENT_DEFINITION
        type Query {
          test: String @foo
        }
      `,
    }),
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: {
      diffsMetaKey: DIFF_META_KEY,
      aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
    },
  },
}

export const AddedDirectiveDescription: Story = {
  args: {
    source: prepareGraphApiDiffSchema({
      beforeSource: graphapi`
        directive @foo on FIELD_DEFINITION
        type Query {
          test: String @foo
        }
      `,
      afterSource: graphapi`
        "Directive description"
        directive @foo on FIELD_DEFINITION
        type Query {
          test: String @foo
        }
      `,
    }),
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: {
      diffsMetaKey: DIFF_META_KEY,
      aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
    },
  },
}

export const RemovedDirectiveDescription: Story = {
  args: {
    source: prepareGraphApiDiffSchema({
      beforeSource: graphapi`
        "Directive description"
        directive @foo on FIELD_DEFINITION
        type Query {
          test: String @foo
        }
      `,
      afterSource: graphapi`
        directive @foo on FIELD_DEFINITION
        type Query {
          test: String @foo
        }
      `,
    }),
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: {
      diffsMetaKey: DIFF_META_KEY,
      aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
    },
  },
}

export const ReplacedDirectiveDescription: Story = {
  args: {
    source: prepareGraphApiDiffSchema({
      beforeSource: graphapi`
        "Directive description"
        directive @foo on FIELD_DEFINITION
        type Query {
          test: String @foo
        }
      `,
      afterSource: graphapi`
        "CHANGED directive description"
        directive @foo on FIELD_DEFINITION
        type Query {
          test: String @foo
        }
      `,
    }),
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: {
      diffsMetaKey: DIFF_META_KEY,
      aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
    },
  },
}

export const StringToStringOrInt: Story = {
  args: {
    source: prepareGraphApiDiffSchema({
      beforeSource: graphapi`
        type Query {
          test: String
        }
      `,
      afterSource: graphapi`
        type Query {
          test: Union
        }
        union Union = String | Int
      `,
    }),
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: {
      diffsMetaKey: DIFF_META_KEY,
      aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
    },
  },
}

export const StringToIntOrFloat: Story = {
  args: {
    source: prepareGraphApiDiffSchema({
      beforeSource: graphapi`
        type Query {
          test: String
        }
      `,
      afterSource: graphapi`
        type Query {
          test: Union
        }
        union Union = Int | Float
      `,
    }),
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: {
      diffsMetaKey: DIFF_META_KEY,
      aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
    },
  },
}

export const StringToStringOrEnum: Story = {
  args: {
    source: prepareGraphApiDiffSchema({
      beforeSource: graphapi`
        type Query {
          test: String
        }
      `,
      afterSource: graphapi`
        type Query {
          test: Union
        }
        union Union = String | Enum
        enum Enum {
          first
          second
        }
      `,
    }),
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: {
      diffsMetaKey: DIFF_META_KEY,
      aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
    },
  },
}

export const StringToEnum1OrEnum2: Story = {
  args: {
    source: prepareGraphApiDiffSchema({
      beforeSource: graphapi`
        type Query {
          test: String
        }
      `,
      afterSource: graphapi`
        type Query {
          test: Union
        }
        union Union = Enum1 | Enum2
        enum Enum1 {
          first
          second
        }
        enum Enum2 {
          third
          fourth
        }
      `,
    }),
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: {
      diffsMetaKey: DIFF_META_KEY,
      aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
    },
  },
}

export const ListToStringOrInt: Story = {
  args: {
    source: prepareGraphApiDiffSchema({
      beforeSource: graphapi`
        type Query {
          test: [String]
        }
      `,
      afterSource: graphapi`
        type Query {
          test: Union
        }
        union Union = String | Int
      `,
    }),
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: {
      diffsMetaKey: DIFF_META_KEY,
      aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
    },
  },
}

export const DirectiveUsageAddedArgValue: Story = {
  args: {
    source: prepareGraphApiDiffSchema({
      beforeSource: graphapi`
        directive @foo(val: String) on FIELD_DEFINITION
        type Query {
          test: String @foo
        }
      `,
      afterSource: graphapi`
        directive @foo(val: String) on FIELD_DEFINITION
        type Query {
          test: String @foo(val: "After")
        }
      `,
    }),
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: {
      diffsMetaKey: DIFF_META_KEY,
      aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
    },
  },
}

export const DirectiveUsageRemovedArgValue: Story = {
  args: {
    source: prepareGraphApiDiffSchema({
      beforeSource: graphapi`
        directive @foo(val: String) on FIELD_DEFINITION
        type Query {
          test: String @foo(val: "Before")
        }
      `,
      afterSource: graphapi`
        directive @foo(val: String) on FIELD_DEFINITION
        type Query {
          test: String @foo
        }
      `,
    }),
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: {
      diffsMetaKey: DIFF_META_KEY,
      aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
    },
  },
}

export const DirectiveUsageChangedArgValue: Story = {
  args: {
    source: prepareGraphApiDiffSchema({
      beforeSource: graphapi`
        directive @foo(val: String = "Default") on FIELD_DEFINITION
        type Query {
          test: String @foo(val: "Before")
        }
      `,
      afterSource: graphapi`
        directive @foo(val: String = "Default") on FIELD_DEFINITION
        type Query {
          test: String @foo(val: "After")
        }
      `,
    }),
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: {
      diffsMetaKey: DIFF_META_KEY,
      aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
    },
  },
}

export const ChangedUnion: Story = {
  args: {
    source: prepareGraphApiDiffSchema({
      beforeSource: graphapi`
        type Query {
          test: Primitive
        }
        union Primitive = String | Int | Float | Boolean
      `,
      afterSource: graphapi`
        type Query {
          test: Primitive
        }
        union Primitive = ID | String | Int | Float | Boolean
      `,
    }),
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: {
      diffsMetaKey: DIFF_META_KEY,
      aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
    },
  },
}

export const ChangedObjectiveUnion: Story = {
  args: {
    source: prepareGraphApiDiffSchema({
      beforeSource: graphapi`
        type Query {
          test: Entity
        }
        union Entity = A | B
        type A {
          id: ID!
          name(a: Int, b: Boolean): String
        }
        type B {
          key: ID!
          title: String
        }
      `,
      afterSource: graphapi`
        type Query {
          test: Entity
        }
        union Entity = A | B | C
        type A {
          id(b: Boolean): ID!
          name(a: Int): String
        }
        type B {
          key: ID!
          title: String
        }
        type C {
          login: ID!
          email: String
        }
      `,
    }),
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    metaKeys: {
      diffsMetaKey: DIFF_META_KEY,
      aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
    },
  },
}

export const TypeToInput: Story = {
  render: (args) => {
    const processedSource = prepareGraphApiDiffSchema({
      beforeSource: buildGraphApi(`
        type Query {
          test: Type
        }
        
        type Type {
          id: ID!
        }
      `),
      afterSource: buildGraphApi(`
        type Query {
          test: Input
        }
        
        input Input {
          id: ID!
        }
      `),
      circular: true,
    })
    return <GraphQLOperationDiffViewer {...args} source={processedSource} />
  },
  args: {
    expandedDepth: 2,
    metaKeys: {
      diffsMetaKey: DIFF_META_KEY,
      aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
    },
    layoutMode: 'side-by-side-diffs',
    operationPath: 'companyCount',
  },
}

export const EnumChanges: Story = {
  render: (args) => {
    const processedSource = prepareGraphApiDiffSchema({
      beforeSource: buildGraphApi(`
        type Query {
          test: Fruit
        }
        
        enum Fruit {
          "Removed APPLE description"
          APPLE
          BANANA
          "Changed ORANGE description"
          ORANGE
          PINEAPPLE
          STRAWBERRY
        }
      `),
      afterSource: buildGraphApi(`
        type Query {
          test: Fruit
        }
        
        enum Fruit {
          APPLE
          "Added BANANA description"
          BANANA
          "CHANGED ORANGE description"
          ORANGE
          PEAR
          STRAWBERRY
        }
      `),
      circular: true,
    })
    return <GraphQLOperationDiffViewer {...args} source={processedSource} />
  },
  args: {
    expandedDepth: 2,
    metaKeys: {
      diffsMetaKey: DIFF_META_KEY,
      aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
    },
    layoutMode: 'side-by-side-diffs',
    operationPath: 'companyCount',
  },
}

export const DirectiveUsageLocationsChanged: Story = {
  render: (args) => {
    const processedSource = prepareGraphApiDiffSchema({
      beforeSource: buildGraphApi(`
        directive @foo on FIELD_DEFINITION
        type Query {
          test: String @foo
        }
      `),
      afterSource: buildGraphApi(`
        directive @foo on FIELD_DEFINITION | ENUM_VALUE
        type Query {
          test: String @foo
        }
      `),
      circular: true,
    })
    return <GraphQLOperationDiffViewer {...args} source={processedSource} />
  },
  args: {
    expandedDepth: 2,
    metaKeys: {
      diffsMetaKey: DIFF_META_KEY,
      aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
    },
    layoutMode: 'side-by-side-diffs',
  },
}

export const ChangedCircularMethods: Story = {
  render: (args) => {
    const processedSource = prepareGraphApiDiffSchema({
      beforeSource: buildGraphApi(`
        type Query {
          test: Response
        }
        type Response {
          id: ID!
          name: String
          removedCycled: CycledEntity
        }
        type CycledEntity {
          value: String
          child: CycledEntity
        }
      `),
      afterSource: buildGraphApi(`
        type Query {
          test: Response
        }
        type Response {
          id: ID!
          name: String
          addedCycled: CycledEntity
        }
        type CycledEntity {
          value: String
          child: CycledEntity
        }
      `),
      circular: true,
    })
    return <GraphQLOperationDiffViewer {...args} source={processedSource} />
  },
  args: {
    expandedDepth: 2,
    metaKeys: {
      diffsMetaKey: DIFF_META_KEY,
      aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
    },
    layoutMode: 'side-by-side-diffs',
  },
}

export const ChangedCircularProperties: Story = {
  render: (args) => {
    const processedSource = prepareGraphApiDiffSchema({
      beforeSource: buildGraphApi(`
        type Query {
          test: Response
        }
        input Response {
          id: ID!
          name: String
          removedCycled: CycledEntity
        }
        type CycledEntity {
          value: String
          child: CycledEntity
        }
      `),
      afterSource: buildGraphApi(`
        type Query {
          test: Response
        }
        input Response {
          id: ID!
          name: String
          addedCycled: CycledEntity
        }
        type CycledEntity {
          value: String
          child: CycledEntity
        }
      `),
      circular: true,
    })
    return <GraphQLOperationDiffViewer {...args} source={processedSource} />
  },
  args: {
    expandedDepth: 2,
    metaKeys: {
      diffsMetaKey: DIFF_META_KEY,
      aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
    },
    layoutMode: 'side-by-side-diffs',
  },
}