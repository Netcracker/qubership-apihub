import { LayoutModeContext } from '@apihub/contexts/LayoutModeContext'
import { LevelContext } from '@apihub/contexts/LevelContext'
import { DOCUMENT_LAYOUT_MODE } from '@apihub/types/LayoutMode'
import { isJavaApiClassNode } from '@apihub/utils/javaapi/node-type-checkers'
import { createBuildingServiceLogger, JavaApiTreeBuilder } from '@netcracker/qubership-apihub-next-data-model'
import { collectJavaApiClassNames } from '@netcracker/qubership-apihub-next-data-model/shared/javaapi/class-names'
import { JAVA_API_LOG_PREFIX } from '@netcracker/qubership-apihub-next-data-model/shared/javaapi/log-prefix'
import { ClassKey } from '@netcracker/qubership-apihub-next-data-model/shared/javaapi/types/class-key'
import { JavaApiNavigationLinkBuilder } from '@netcracker/qubership-apihub-next-data-model/shared/javaapi/types/navigation-link-builder'
import { FC, memo, useMemo } from 'react'
import '../../index.css'
import '../shared-styles/property-table-subheader.css'
import '../shared-styles/property-table.css'
import '../shared-components/SubheaderValue/SubheaderValue.css'
import '../shared-styles/preceded-by.css'
import { ErrorBoundary } from '../services/ErrorBoundary'
import { ErrorBoundaryFallback } from '../services/ErrorBoundaryFallback'
import {
  DefaultNavigationLink,
  type NavigationLinkComponent,
} from '../shared-components/DefaultNavigationLink/DefaultNavigationLink'
import { ClassNodeViewer } from './ClassNodeViewer'
import { JavaClassViewerContext } from './JavaClassViewerContext'
import './styles/index.css'

export type JavaClassViewerProps = {
  // jdiff document (`api-report` or `api-diff` mode)
  source: unknown
  classKey: ClassKey
  // links type references to other classes of the source; plain text when omitted
  navigationLinkBuilder?: JavaApiNavigationLinkBuilder
  navigationLinkComponent?: NavigationLinkComponent
  devMode?: boolean
  noHeading?: boolean
}

export const JavaClassViewer: FC<JavaClassViewerProps> = memo<JavaClassViewerProps>(props => {
  if (props.source === null) {
    return null
  }

  return (
    <ErrorBoundary fallback={<ErrorBoundaryFallback componentName="Java Class Viewer" />}>
      <JavaClassViewerInner {...props} />
    </ErrorBoundary>
  )
})

const JavaClassViewerInner: FC<JavaClassViewerProps> = memo<JavaClassViewerProps>((props) => {
  const {
    source,
    classKey,
    navigationLinkBuilder,
    navigationLinkComponent = DefaultNavigationLink,
    devMode = false,
    noHeading = false,
  } = props

  const logger = useMemo(() => createBuildingServiceLogger(devMode), [devMode])

  const tree = useMemo(
    () => new JavaApiTreeBuilder({ source, classKey, logger }).build(),
    [source, classKey, logger],
  )
  const knownClassNames = useMemo(() => collectJavaApiClassNames(source), [source])

  const viewerContext = useMemo(
    () => ({ navigationLinkBuilder, navigationLinkComponent, knownClassNames }),
    [navigationLinkBuilder, navigationLinkComponent, knownClassNames],
  )

  logger.debug(`${JAVA_API_LOG_PREFIX} Class Key:`, classKey)
  logger.debug(`${JAVA_API_LOG_PREFIX} Tree:`, tree)

  const classNode = tree.root
  if (!classNode || !isJavaApiClassNode(classNode)) {
    return null
  }

  return (
    <JavaClassViewerContext.Provider value={viewerContext}>
      <LayoutModeContext.Provider value={DOCUMENT_LAYOUT_MODE}>
        <LevelContext.Provider value={0}>
          <div data-testid="java-class-viewer">
            <ClassNodeViewer node={classNode} noHeading={noHeading} />
          </div>
        </LevelContext.Provider>
      </LayoutModeContext.Provider>
    </JavaClassViewerContext.Provider>
  )
})
