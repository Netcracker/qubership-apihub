import type { Meta, StoryObj } from '@storybook/react-vite';
import { GraphQLOperationViewer } from '../components/GraphQLOperationViewer/GraphQLOperationViewer';
import { prepareGraphApiSchema } from './preprocess';
import { graphapi } from './utils/helpers';

// It's necessary because storybook doesn't render nested stories without this empty story
// eslint-disable-next-line storybook/story-exports
const meta = {
  title: 'GraphQL Operation Viewer/Test Stories',
  component: GraphQLOperationViewer,
  parameters: {},
  argTypes: {
    source: {
      control: 'object'
    }
  },
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
  render: (args) => {
    const processedSource = prepareGraphApiSchema({
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
    });
    return <GraphQLOperationViewer {...args} source={processedSource} />;
  },
  args: {}
}

export const SelfCycledInput: Story = {
  render: (args) => {
    const processedSource = prepareGraphApiSchema({
      source: graphapi`
        type Query {
          test: CycledEntity
        }
        input CycledEntity {
          value: String
          child: CycledEntity
        }
      `,
      circular: true
    });
    return <GraphQLOperationViewer {...args} source={processedSource} />;
  },
  args: {}
}

export const TwoBranchesSelfCycled: Story = {
  render: (args) => {
    const processedSource = prepareGraphApiSchema({
      source: graphapi`
        type Query {
          test: Response
        }
        type Response {
          cycled: CycledEntity
          anotherCycled: CycledEntity
        }
        type CycledEntity {
          value: String
          child: CycledEntity
        }
      `,
      circular: true
    });
    return <GraphQLOperationViewer {...args} source={processedSource} />;
  },
  args: {}
}

export const TwoBranchesSelfCycledInput: Story = {
  render: (args) => {
    const processedSource = prepareGraphApiSchema({
      source: graphapi`
        type Query {
          test: Response
        }
        type Response {
          cycled: CycledEntity
          anotherCycled: CycledEntity
        }
        input CycledEntity {
          value: String
          child: CycledEntity
        }
      `,
      circular: true
    });
    return <GraphQLOperationViewer {...args} source={processedSource} />;
  },
  args: {}
}
