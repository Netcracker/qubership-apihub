import type { NavigationLinkComponent } from '@apihub/components/DdlTableViewer/DefaultNavigationLink'
import { JavaClassViewer } from '@apihub/components/JavaClassViewer/JavaClassViewer'
import { collectJavaApiClassNames } from '@netcracker/qubership-apihub-next-data-model/shared/javaapi/class-names'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { FC, useMemo, useState } from 'react'

const fixtures = import.meta.glob(
  '../../../../samples/javaapi/*.json',
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>

function loadFixture(fileName: string): unknown {
  const entry = Object.entries(fixtures).find(([path]) => path.endsWith(`/${fileName}`))
  return entry ? JSON.parse(entry[1]) : null
}

const API_REPORT = loadFixture('api-report.json')
const API_DIFF = loadFixture('api-diff.json')

const PACKAGE = 'org.qubership.integration.platform.catalog'
const javaStoryNavigationLinkBuilder = (className: string): string => `#${className}`

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
    classKey: { className: `${PACKAGE}.consul.ConsulClient` },
  },
}

export const EnumWithConstants: Story = {
  args: {
    source: API_REPORT,
    classKey: { className: `${PACKAGE}.persistence.configs.entity.actionlog.EntityType` },
  },
}

export const ClassWithNestedClasses: Story = {
  args: {
    source: API_REPORT,
    classKey: { className: `${PACKAGE}.model.deployment.update.DeploymentInfo` },
  },
}

export const NestedClass: Story = {
  args: {
    source: API_REPORT,
    classKey: { className: `${PACKAGE}.model.deployment.update.DeploymentInfo$DeploymentInfoBuilder` },
  },
}

export const DiffBreakingAndNonBreakingMembers: Story = {
  args: {
    source: API_DIFF,
    classKey: { className: `${PACKAGE}.model.deployment.update.DeploymentInfo` },
  },
}

export const InterfaceWithMethods: Story = {
  args: {
    source: API_REPORT,
    classKey: { className: `${PACKAGE}.persistence.configs.repository.chain.ElementRepository` },
  },
}

/* Clicking a type reference opens that class, the way a host router would */
const JavaClassBrowser: FC<{ source: unknown }> = ({ source }) => {
  const classNames = useMemo(() => [...collectJavaApiClassNames(source)].sort(), [source])
  const [className, setClassName] = useState(classNames[0] ?? '')

  const StoryNavigationLink: NavigationLinkComponent = useMemo(
    () => ({ href, className: linkClassName, children }) => (
      <a
        href={href}
        className={linkClassName}
        onClick={event => {
          event.preventDefault()
          setClassName(href.slice(1))
        }}
      >
        {children}
      </a>
    ),
    [],
  )

  return (
    <div className="flex flex-col gap-4">
      <select value={className} onChange={event => setClassName(event.target.value)} style={{ maxWidth: 720 }}>
        {classNames.map(name => <option key={name} value={name}>{name}</option>)}
      </select>
      <JavaClassViewer
        source={source}
        classKey={{ className }}
        navigationLinkBuilder={javaStoryNavigationLinkBuilder}
        navigationLinkComponent={StoryNavigationLink}
      />
    </div>
  )
}

export const BrowseReport: Story = {
  render: () => <JavaClassBrowser source={API_REPORT} />,
}

export const BrowseDiff: Story = {
  render: () => <JavaClassBrowser source={API_DIFF} />,
}
