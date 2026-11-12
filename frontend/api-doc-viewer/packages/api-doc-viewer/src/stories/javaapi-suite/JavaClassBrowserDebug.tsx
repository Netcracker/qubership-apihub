import { JavaClassViewer } from '@apihub/components/JavaClassViewer/JavaClassViewer'
import type { NavigationLinkComponent } from '@apihub/components/shared-components/DefaultNavigationLink/DefaultNavigationLink'
import { collectJavaApiClassNames } from '@netcracker/qubership-apihub-next-data-model/shared/javaapi/class-names'
import { FC, useMemo, useState } from 'react'
import { API_DIFF, API_REPORT } from './java-samples-common'
import { javaStoryNavigationLinkBuilder } from './java-story-navigation'

export type JavaClassBrowserDebugProps = { sample: 'report' | 'diff' }

/* Clicking a type reference opens that class, the way a host router would */
export const JavaClassBrowserDebug: FC<JavaClassBrowserDebugProps> = ({ sample }) => {
  const source = sample === 'diff' ? API_DIFF : API_REPORT
  const classNames = useMemo(() => [...collectJavaApiClassNames(source)].sort(), [source])
  const [className, setClassName] = useState(classNames[0] ?? '')
  const selectedClassName = classNames.includes(className) ? className : classNames[0] ?? ''

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
      <select value={selectedClassName} onChange={event => setClassName(event.target.value)} style={{ maxWidth: 720 }}>
        {classNames.map(name => <option key={name} value={name}>{name}</option>)}
      </select>
      <JavaClassViewer
        source={source}
        classKey={{ className: selectedClassName }}
        navigationLinkBuilder={javaStoryNavigationLinkBuilder}
        navigationLinkComponent={StoryNavigationLink}
        devMode={true}
      />
    </div>
  )
}
