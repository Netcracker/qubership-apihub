/**
 * Java Class Viewer stories use the hand-written jdiff samples in packages/samples/javaapi
 * (a report and a diff of an example library).
 * Each story picks one class of a sample by its binary name.
 */
import { JavaClassViewer } from '@apihub/components/JavaClassViewer/JavaClassViewer'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { API_DIFF, API_REPORT } from './java-samples-common'
import { javaStoryNavigationLinkBuilder } from './java-story-navigation'

const PACKAGE = 'com.example.catalog'

// eslint-disable-next-line storybook/story-exports
const meta = {
  id: 'javaapi-suite-java-class-viewer',
  title: 'Java API Suite/Java Class Viewer',
  component: JavaClassViewer,
  parameters: {
    controls: { disable: true },
  },
  args: {
    navigationLinkBuilder: javaStoryNavigationLinkBuilder,
  },
} satisfies Meta<typeof JavaClassViewer>

export default meta

type Story = StoryObj<typeof JavaClassViewer>

export const ClassWithFieldsConstructorAndMethods: Story = {
  args: {
    source: API_REPORT,
    classKey: { className: `${PACKAGE}.client.KeyValueClient` },
  },
}

export const ClassWithNestedClasses: Story = {
  args: {
    source: API_REPORT,
    classKey: { className: `${PACKAGE}.model.Order` },
  },
}

export const DiffBreakingAndNonBreakingMembers: Story = {
  args: {
    source: API_DIFF,
    classKey: { className: `${PACKAGE}.model.Order` },
  },
}

export const EnumWithConstants: Story = {
  args: {
    source: API_REPORT,
    classKey: { className: `${PACKAGE}.model.OrderStatus` },
  },
}

export const InterfaceWithMethods: Story = {
  args: {
    source: API_REPORT,
    classKey: { className: `${PACKAGE}.repository.OrderRepository` },
  },
}

export const NestedClass: Story = {
  args: {
    source: API_REPORT,
    classKey: { className: `${PACKAGE}.model.Order$OrderBuilder` },
  },
}
