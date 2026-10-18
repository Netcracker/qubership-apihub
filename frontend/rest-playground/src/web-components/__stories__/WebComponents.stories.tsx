// Import and register web components
import '../../styles.css'

import { Box } from '@mui/material'
import type { Meta, StoryObj } from '@storybook/react'

import { RestExamplesElement, RestPlaygroundElement } from '../components'
import test from '../samples/test.yaml'

// Ensure web components are registered
if (!customElements.get('rest-examples')) {
  customElements.define('rest-examples', RestExamplesElement)
}
if (!customElements.get('rest-playground')) {
  customElements.define('rest-playground', RestPlaygroundElement)
}

// Declare the web components for TypeScript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'rest-examples': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        document?: string
        fullScreenAvailable?: boolean
      }
      'rest-playground': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        document?: string
        customServers?: string
        token?: string
        origin?: string
      }
    }
  }
}

interface RestExamplesProps {
  document?: string
  fullScreenAvailable?: boolean
}

interface RestPlaygroundProps {
  document?: string
  customServers?: string
  token?: string
  origin?: string
}

// Simple web component template for Examples
const ExamplesTemplate = (props: RestExamplesProps) => {
  return (
    <Box lineHeight={1.5} height="100%" width="100%" data-testid="ExamplesPanel">
      <rest-examples
        document={props.document}
        fullScreenAvailable={props.fullScreenAvailable}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          minHeight: '400px',
        }}
      />
    </Box>
  )
}

// Simple web component template for Playground
const PlaygroundTemplate = (props: RestPlaygroundProps) => {
  return (
    <Box lineHeight={1.5} height="100%" width="100%" data-testid="PlaygroundPanel">
      <rest-playground
        document={props.document}
        customServers={props.customServers}
        token={props.token}
        origin={props.origin}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          minHeight: '600px',
        }}
      />
    </Box>
  )
}

const meta: Meta<RestExamplesProps> = {
  title: 'web-components/components',
  component: ExamplesTemplate,
  decorators: [
    (Story) => (
      <div
        style={{
          width: '100%',
          height: '600px',
          padding: '16px',
          backgroundColor: '#ffffff',
        }}
      >
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<RestExamplesProps>
type PlaygroundStory = StoryObj<RestPlaygroundProps>

export const Playground: PlaygroundStory = {
  render: PlaygroundTemplate,
  args: {
    document: test,
    token: '',
    origin: 'http://localhost:9001',
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: '100%',
          height: '800px',
          padding: '16px',
          backgroundColor: '#ffffff',
        }}
      >
        <Story />
      </div>
    ),
  ],
}

export const Examples: Story = {
  args: {
    document: test,
    fullScreenAvailable: true,
  },
}
