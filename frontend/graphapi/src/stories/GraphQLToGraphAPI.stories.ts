import { Meta, StoryObj } from '@storybook/react';
import {
  GRAPHAPI_TO_GRAPHQL,
  GraphApiPlayground,
  GRAPHQL_TO_GRAPHAPI,
  GRAPHQL_TO_GRAPHQL,
  INTROSPECTION_TO_GRAPHAPI,
  ModeType,
  RESULT_TYPE_JSON,
  RESULT_TYPE_YAML,
  ResultType
} from './GraphAPIPlayground';

const meta: Meta<typeof GraphApiPlayground> = {
  title: 'GraphApiPlayground',
  component: GraphApiPlayground,
  argTypes: {
    mode: {
      table: {
        disable: true,
      },
    },
  },
}

export default meta

type StoryArgs = {
  mode: ModeType;
  resultFormat?: ResultType;
};

type Story = StoryObj<StoryArgs>;

export const GraphQLToGraphAPI: Story = {
  args: {
    mode: GRAPHQL_TO_GRAPHAPI,
    resultFormat: RESULT_TYPE_YAML,
  },
  argTypes: {
    resultFormat: {
      control: {
        type: 'select',
        options: [RESULT_TYPE_YAML, RESULT_TYPE_JSON],
      },
      description: 'Select the output format',
    },
  },
}

export const IntrospectionToGraphAPI: Story = {
  args: {
    mode: INTROSPECTION_TO_GRAPHAPI,
    resultFormat: RESULT_TYPE_JSON,
  },
  argTypes: {
    resultFormat: {
      control: {
        type: 'select',
        options: [RESULT_TYPE_YAML, RESULT_TYPE_JSON],
      },
      description: 'Select the output format',
    },
  },
}

export const GraphAPIToGraphQL: Story = {
  args: {
    mode: GRAPHAPI_TO_GRAPHQL,
  },
  argTypes: {
    resultFormat: {
      table: {
        disable: true,
      },
    },
  },
}

export const GraphQLToGraphQL: Story = {
  args: {
    mode: GRAPHQL_TO_GRAPHQL,
  },
  argTypes: {
    resultFormat: {
      table: {
        disable: true,
      },
    },
  },
}