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

import { DIFF_META_KEY } from '@netcracker/qubership-apihub-api-diff'
import type { Meta, StoryObj } from '@storybook/react'
import { buildGraphApiSchema } from '../../mocks/utils/graph-api-transformers'
import { DOCUMENT_LAYOUT_MODE, INLINE_DIFFS_LAYOUT_MODE, SIDE_BY_SIDE_DIFFS_LAYOUT_MODE } from '../../types/LayoutMode'
import { TestGraphQLOperationDiffViewer } from './TestGraphQLOperationDiffViewer'

// More on how to set up stories at: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
const meta = {
  title: 'GraphQL Operation Diff Viewer/Output',
  component: TestGraphQLOperationDiffViewer,
  parameters: {},
  argTypes: {
    beforeSource: {
      control: 'object',
    },
    afterSource: {
      control: 'object',
    },
    layoutMode: {
      control: 'radio',
      options: [DOCUMENT_LAYOUT_MODE, INLINE_DIFFS_LAYOUT_MODE, SIDE_BY_SIDE_DIFFS_LAYOUT_MODE]
    },
    filters: {
      control: 'check',
      options: ['breaking', 'non-breaking', 'annotation', 'unclassified', 'deprecated']
    }
  },
  args: {
    layoutMode: SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
    diffMetaKey: DIFF_META_KEY,
  }
} satisfies Meta<typeof TestGraphQLOperationDiffViewer>

export default meta
type Story = StoryObj<typeof meta>;

export const QueryNoArgsChangedPrimitiveOutput: Story = {
  args: {
    beforeSource: buildGraphApiSchema(`
      type Query {
        """Returns a random string"""
        getString: String!
      }
    `),
    afterSource: buildGraphApiSchema(`
      type Query {
        """Returns a random string"""
        getString: Int!
      }
    `),
    circular: true,
    operationPath: 'getString'
  },
}
QueryNoArgsChangedPrimitiveOutput.storyName = '[Query] No args. Changed primitive output type'

export const QueryNoArgsPrimitiveOutputMarkedAsNotNullable: Story = {
  args: {
    beforeSource: buildGraphApiSchema(`
      type Query {
        """Returns a random string"""
        getString: String
      }
    `),
    afterSource: buildGraphApiSchema(`
      type Query {
        """Returns a random string"""
        getString: String!
      }
    `),
    circular: true,
    operationPath: 'getString'
  },
}
QueryNoArgsPrimitiveOutputMarkedAsNotNullable.storyName = '[Query] No args. Primitive output marked as NOT nullable'

export const QueryNoArgsPrimitiveOutputMarkedAsNullable: Story = {
  args: {
    beforeSource: buildGraphApiSchema(`
      type Query {
        """Returns a random string"""
        getString: String!
      }
    `),
    afterSource: buildGraphApiSchema(`
      type Query {
        """Returns a random string"""
        getString: String
      }
    `),
    circular: true,
    operationPath: 'getString'
  },
}
QueryNoArgsPrimitiveOutputMarkedAsNullable.storyName = '[Query] No args. Primitive output marked as NULLABLE'

export const QueryPrimitiveOutputAddedArgs: Story = {
  args: {
    beforeSource: buildGraphApiSchema(`
      type Query {
        """Returns a random string"""
        getString: String!
      }
    `),
    afterSource: buildGraphApiSchema(`
      type Query {
        """Returns a random string"""
        getString(pretty: Boolean!): String!
      }
    `),
    circular: true,
    operationPath: 'getString'
  },
}
QueryPrimitiveOutputAddedArgs.storyName = '[Query] Primitive output. Added args'

export const QueryPrimitiveOutputRemovedArgs: Story = {
  args: {
    beforeSource: buildGraphApiSchema(`
      type Query {
        """Returns a random string"""
        getString(pretty: Boolean!): String!
      }
    `),
    afterSource: buildGraphApiSchema(`
      type Query {
        """Returns a random string"""
        getString: String!
      }
    `),
    circular: true,
    operationPath: 'getString'
  },
}
QueryPrimitiveOutputRemovedArgs.storyName = '[Query] Primitive output. Removed args'

export const QueryPrimitiveOutputAddedNewArg: Story = {
  args: {
    beforeSource: buildGraphApiSchema(`
      type Query {
        """Returns a random string"""
        getString(pretty: Boolean!): String!
      }
    `),
    afterSource: buildGraphApiSchema(`
      type Query {
        """Returns a random string"""
        getString(pretty: Boolean!, regexp: String): String!
      }
    `),
    circular: true,
    operationPath: 'getString'
  },
}
QueryPrimitiveOutputAddedNewArg.storyName = '[Query] Primitive output. Added 1 arg'

export const QueryPrimitiveOutputRemovedExistingArg: Story = {
  args: {
    beforeSource: buildGraphApiSchema(`
      type Query {
        """Returns a random string"""
        getString(pretty: Boolean!, regexp: String): String!
      }
    `),
    afterSource: buildGraphApiSchema(`
      type Query {
        """Returns a random string"""
        getString(pretty: Boolean!): String!
      }
    `),
    circular: true,
    operationPath: 'getString'
  },
}
QueryPrimitiveOutputRemovedExistingArg.storyName = '[Query] Primitive output. Removed 1 arg'

export const QueryWithArgsChangedPrimitiveToObjectOutput: Story = {
  args: {
    beforeSource: buildGraphApiSchema(`
      type Query {
        """Returns a book name by its ID"""
        getBook(id: ID!): String!
      }
    `),
    afterSource: buildGraphApiSchema(`
      type Query {
        """Returns a book model by its ID"""
        getBook(id: ID!): Book!
      }
      
      """Data model represents a book"""
      type Book {
        id: ID!
        name: String!
        author: String
        genre: String!
      }
    `),
    circular: true,
    operationPath: 'getBook'
  },
}
QueryWithArgsChangedPrimitiveToObjectOutput.storyName = '[Query] 1 arg. Primitive output -> Object output'

export const QueryWithArgsChangedObjectToPrimitiveOutput: Story = {
  args: {
    beforeSource: buildGraphApiSchema(`
      type Query {
        """Returns a book model by its ID"""
        getBook(id: ID!): Book!
      }
      
      """Data model represents a book"""
      type Book {
        id: ID!
        name: String!
        author: String
        genre: String!
      }
    `),
    afterSource: buildGraphApiSchema(`
      type Query {
        """Returns a book name by its ID"""
        getBook(id: ID!): String!
      }
    `),
    circular: true,
    operationPath: 'getBook'
  },
}
QueryWithArgsChangedObjectToPrimitiveOutput.storyName = '[Query] 1 arg. Object output -> Primitive output'

export const QueryWithArgsChangedArrayOfPrimitiveToArrayOfObjectOutput: Story = {
  args: {
    beforeSource: buildGraphApiSchema(`
      type Query {
        """Returns book names by search query. If argument is empty it returns all the books"""
        getBooks(searchQuery: String): [String!]!
      }
    `),
    afterSource: buildGraphApiSchema(`
      type Query {
        """Returns books by search query. If argument is empty it returns all the books"""
        getBooks(searchQuery: String): [Book!]!
      }
      
      """Data model represents a book"""
      type Book {
        id: ID!
        name: String!
        author: String
        genre: String!
      }
    `),
    circular: true,
    operationPath: 'getBooks'
  },
}
QueryWithArgsChangedArrayOfPrimitiveToArrayOfObjectOutput.storyName = '[Query] 1 arg. Array of primitive output -> Array of objective output'

export const QueryWithArgsChangedArrayOfObjectOutputToArrayOfPrimitive: Story = {
  args: {
    beforeSource: buildGraphApiSchema(`
      type Query {
        """Returns books by search query. If argument is empty it returns all the books"""
        getBooks(searchQuery: String): [Book!]!
      }
      
      """Data model represents a book"""
      type Book {
        id: ID!
        name: String!
        author: String
        genre: String!
      }
    `),
    afterSource: buildGraphApiSchema(`
      type Query {
        """Returns book names by search query. If argument is empty it returns all the books"""
        getBooks(searchQuery: String): [String!]!
      }
    `),
    circular: true,
    operationPath: 'getBooks'
  },
}
QueryWithArgsChangedArrayOfObjectOutputToArrayOfPrimitive.storyName = '[Query] 1 arg. Array of objective output -> Array of primitive output'

export const QueryWithArgsChangedArrayOfObjectOutputToObjectOutput: Story = {
  args: {
    beforeSource: buildGraphApiSchema(`
      type Query {
        """Returns books by search query. If argument is empty it returns all the books"""
        getBooks(searchQuery: String): [Book!]!
      }
      
      """Data model represents a book"""
      type Book {
        id: ID!
        name: String!
        author: String
        genre: String!
      }
    `),
    afterSource: buildGraphApiSchema(`
      type Query {
        """Returns books by search query. If argument is empty it returns all the books"""
        getBooks(searchQuery: String): Library!
      }
      
      type Library {
        books: [Book!]!
      }
      
      """Data model represents a book"""
      type Book {
        id: ID!
        name: String!
        author: String
        genre: String!
      }
    `),
    circular: true,
    operationPath: 'getBooks'
  },
}
QueryWithArgsChangedArrayOfObjectOutputToObjectOutput.storyName = '[Query] 1 arg. Array of objective output -> Objective output'

export const QueryWithArgsChangedObjectOutputToArrayOfObjectOutput: Story = {
  args: {
    beforeSource: buildGraphApiSchema(`
      type Query {
        """Returns books by search query. If argument is empty it returns all the books"""
        getBooks(searchQuery: String): Library!
      }
      
      type Library {
        books: [Book!]!
      }
      
      """Data model represents a book"""
      type Book {
        id: ID!
        name: String!
        author: String
        genre: String!
      }
    `),
    afterSource: buildGraphApiSchema(`
      type Query {
        """Returns books by search query. If argument is empty it returns all the books"""
        getBooks(searchQuery: String): [Book!]!
      }
      
      """Data model represents a book"""
      type Book {
        id: ID!
        name: String!
        author: String
        genre: String!
      }
    `),
    circular: true,
    operationPath: 'getBooks'
  },
}
QueryWithArgsChangedObjectOutputToArrayOfObjectOutput.storyName = '[Query] 1 arg. Objective output -> Array of object output'

export const QueryNoArgsChangedObjectOutputToOneOfOutput: Story = {
  args: {
    beforeSource: buildGraphApiSchema(`
      type Query {
        """Returns generic instance of shape"""
        getRandomShape: Shape!
      }
      
      type Shape {
        kind: String!
        sizes: [Int!]!
      }
    `),
    afterSource: buildGraphApiSchema(`
      type Query {
        """Returns prefabs"""
        getRandomShape: Shape!
      }

      type Circle {
        kind: String!
        radius: Int!
      }
      
      type Rectangle {
        kind: String!
        width: Int!
        height: Int!
      }
      
      union Shape = Circle | Rectangle
    `),
    circular: true,
    operationPath: 'getRandomShape'
  },
}
QueryNoArgsChangedObjectOutputToOneOfOutput.storyName = '[Query] 1 arg. Object output -> oneOf object output'

export const QueryNoArgsChangedOneOfOutputToObjectOutput: Story = {
  args: {
    beforeSource: buildGraphApiSchema(`
      type Query {
        """Returns prefabs"""
        getRandomShape: Shape!
      }

      type Circle {
        kind: String!
        radius: Int!
      }
      
      type Rectangle {
        kind: String!
        width: Int!
        height: Int!
      }
      
      union Shape = Circle | Rectangle
    `),
    afterSource: buildGraphApiSchema(`
      type Query {
        """Returns generic instance of shape"""
        getRandomShape: Shape!
      }
      
      type Shape {
        kind: String!
        sizes: [Int!]!
      }
    `),
    circular: true,
    operationPath: 'getRandomShape'
  },
}
QueryNoArgsChangedOneOfOutputToObjectOutput.storyName = '[Query] 1 arg. oneOf object output -> object output'

export const QueryNoArgsReturnsUtilityAdded1Method: Story = {
  args: {
    beforeSource: buildGraphApiSchema(`
      type Query {
        """Returns instance of utility which creates shapes"""
        getGeometry: Geometry!
      }
      
      type Geometry {
        buildShape(sideSizes: [Int!]!): Shape!
      }
      
      type Shape {
        sideSizes: [Int!]!
        draw(x: Int!, y: Int): Picture
      }
      
      type Picture {
        x: Int!
        y: Int!
        shape: Shape!
      }
    `),
    afterSource: buildGraphApiSchema(`
      type Query {
        """Returns instance of utility which creates shapes"""
        getGeometry: Geometry!
      }
      
      type Geometry {
        buildShape(sideSizes: [Int!]!): Shape!
        buildCircle(radius: Int!): Shape!
      }
      
      type Shape {
        sideSizes: [Int!]!
        draw(x: Int!, y: Int): Picture
      }
      
      type Picture {
        x: Int!
        y: Int!
        shape: Shape!
      }
    `),
  },
}
QueryNoArgsReturnsUtilityAdded1Method.storyName =
  '[Query][Method] Query with no args returns utility with 1 method. Added 1 more method'

export const QueryNoArgsReturnsUtilityRemoved1Method: Story = {
  args: {
    beforeSource: buildGraphApiSchema(`
      type Query {
        """Returns instance of utility which creates shapes"""
        getGeometry: Geometry!
      }
      
      type Geometry {
        buildShape(sideSizes: [Int!]!): Shape!
        buildCircle(radius: Int!): Shape!
      }
      
      type Shape {
        sideSizes: [Int!]!
        draw(x: Int!, y: Int): Picture
      }
      
      type Picture {
        x: Int!
        y: Int!
        shape: Shape!
      }
    `),
    afterSource: buildGraphApiSchema(`
      type Query {
        """Returns instance of utility which creates shapes"""
        getGeometry: Geometry!
      }
      
      type Geometry {
        buildShape(sideSizes: [Int!]!): Shape!
      }
      
      type Shape {
        sideSizes: [Int!]!
        draw(x: Int!, y: Int): Picture
      }
      
      type Picture {
        x: Int!
        y: Int!
        shape: Shape!
      }
    `),
  },
}
QueryNoArgsReturnsUtilityRemoved1Method.storyName =
  '[Query][Method] Query with no args returns utility with 2 methods. Removed 1 method'

export const QueryNoArgsReturnsUtility1MethodAdded1Arg: Story = {
  args: {
    beforeSource: buildGraphApiSchema(`
      type Query {
        """Returns instance of utility which creates shapes"""
        getGeometry: Geometry!
      }
      
      type Geometry {
        buildShape(sideSizes: [Int!]!): Shape!
      }
      
      type Shape {
        sideSizes: [Int!]!
        draw(x: Int!, y: Int): Picture
      }
      
      type Picture {
        x: Int!
        y: Int!
        shape: Shape!
      }
    `),
    afterSource: buildGraphApiSchema(`
      type Query {
        """Returns instance of utility which creates shapes"""
        getGeometry: Geometry!
      }
      
      type Geometry {
        buildShape(sideCount: Int!, sideSizes: [Int!]!): Shape!
      }
      
      type Shape {
        sideSizes: [Int!]!
        draw(x: Int!, y: Int): Picture
      }
      
      type Picture {
        x: Int!
        y: Int!
        shape: Shape!
      }
    `),
  },
}
QueryNoArgsReturnsUtility1MethodAdded1Arg.storyName =
  '[Query][Method] Query with no args returns utility with 1 method. Added 1 arg to the method'

export const QueryNoArgsReturnsUtility1MethodRemoved1Arg: Story = {
  args: {
    beforeSource: buildGraphApiSchema(`
      type Query {
        """Returns instance of utility which creates shapes"""
        getGeometry: Geometry!
      }
      
      type Geometry {
        buildShape(sideCount: Int!, sideSizes: [Int!]!): Shape!
      }
      
      type Shape {
        sideSizes: [Int!]!
        draw(x: Int!, y: Int): Picture
      }
      
      type Picture {
        x: Int!
        y: Int!
        shape: Shape!
      }
    `),
    afterSource: buildGraphApiSchema(`
      type Query {
        """Returns instance of utility which creates shapes"""
        getGeometry: Geometry!
      }
      
      type Geometry {
        buildShape(sideSizes: [Int!]!): Shape!
      }
      
      type Shape {
        sideSizes: [Int!]!
        draw(x: Int!, y: Int): Picture
      }
      
      type Picture {
        x: Int!
        y: Int!
        shape: Shape!
      }
    `),
  },
}
QueryNoArgsReturnsUtility1MethodRemoved1Arg.storyName =
  '[Query][Method] Query with no args returns utility with 1 method. Removed 1 arg from the method'
