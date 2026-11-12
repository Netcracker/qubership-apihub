import type { Meta, StoryObj } from '@storybook/react-vite';
import { GraphQLDebugPage } from '../components/GraphQLDebugPage/GraphQLDebugPage';

const meta = {
  title: 'Debug/GraphQL Debug Page',
  component: GraphQLDebugPage,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {},
  args: {}
} satisfies Meta<typeof GraphQLDebugPage>;

export default meta;

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {}
}
