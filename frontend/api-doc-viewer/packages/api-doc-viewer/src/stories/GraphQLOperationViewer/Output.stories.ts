import type { Meta, StoryObj } from '@storybook/react-vite';
import { buildGraphApiSchema } from '../../mocks/utils/graph-api-transformers';
import { TestGraphQLOperationViewer } from './TestGraphQLOperationViewer';

// More on how to set up stories at: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
const meta = {
  title: 'GraphQL Operation Viewer/Output',
  component: TestGraphQLOperationViewer,
  parameters: {},
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
  argTypes: {
    source: {
      control: 'object',
    },
  },
} satisfies Meta<typeof TestGraphQLOperationViewer>

export default meta
type Story = StoryObj<typeof meta>;

export const QueryNoArgsPrimitiveNullableOutput: Story = {
  args: {
    source: buildGraphApiSchema(`
      type Query {
        """Returns a random string"""
        getString: String
      }
    `),
    circular: true,
    operationType: 'query',
    operationName: 'getString'
  },
}
QueryNoArgsPrimitiveNullableOutput.storyName = '[Query] No args. Primitive nullable output'

export const MutationNoArgsPrimitiveNullableOutput: Story = {
  args: {
    source: buildGraphApiSchema(`
      type Mutation {
        """Transforms random object to string"""
        asString: String
      }
    `),
    circular: true,
    operationType: 'mutation',
    operationName: 'asString'
  },
}
MutationNoArgsPrimitiveNullableOutput.storyName = '[Mutation] No args. Primitive nullable output'

export const QueryWithUnionInOutput: Story = {
  args: {
    source: buildGraphApiSchema(`
      type Query {
        getShape: Shape!
      }
      
      type Square {
        size: Int!
      }
      type Rectangle {
        width: Int!
        height: Int
      }
      type Circle {
        radius: Int!
      }
      union Quadrangle = Square | Rectangle
      union Shape = Quadrangle | Circle
    `),
    circular: true,
    operationType: 'query',
    operationName: 'getShape'
  },
}
QueryWithUnionInOutput.storyName = '[Query] Union with nested union in output'

export const MethodWithUnionInOutput: Story = {
  args: {
    source: buildGraphApiSchema(`
      type Query {
        getGeometry: Geometry!
      }
      
      type Geometry {
        getShape(kind: String!): Shape!
      }
      
      type Square {
        size: Int!
      }
      type Rectangle {
        width: Int!
        height: Int
      }
      type Circle {
        radius: Int!
      }
      union Quadrangle = Square | Rectangle
      union Shape = Quadrangle | Circle
    `),
    circular: true,
    operationType: 'query',
    operationName: 'getGeometry'
  },
}
MethodWithUnionInOutput.storyName = '[Method] Union with nested union in output'
