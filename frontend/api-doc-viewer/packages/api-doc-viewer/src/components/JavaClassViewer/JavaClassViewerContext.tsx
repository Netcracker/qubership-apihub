import type { JavaApiNavigationLinkBuilder } from '@netcracker/qubership-apihub-next-data-model/shared/javaapi/types/navigation-link-builder'
import { createContext, useContext } from 'react'
import type { NavigationLinkComponent } from '../shared-components/DefaultNavigationLink/DefaultNavigationLink'

export type JavaClassViewerContextValue = {
  navigationLinkBuilder?: JavaApiNavigationLinkBuilder
  navigationLinkComponent: NavigationLinkComponent
  // binary names of the classes a type reference may link to
  knownClassNames: ReadonlySet<string>
}

export const JavaClassViewerContext = createContext<JavaClassViewerContextValue | null>(null)

export function useJavaClassViewerContext(): JavaClassViewerContextValue {
  const context = useContext(JavaClassViewerContext)
  if (!context) {
    throw new Error('useJavaClassViewerContext must be used within JavaClassViewer')
  }
  return context
}
