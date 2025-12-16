import { API_TYPE_REST, API_TYPE_GRAPHQL, type ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

export function createMatcherArbitraryOperationPathWithCurrentOperationPath(
  apiType: ApiType,
  expectedOperationPathPattern: string,
): (arbitraryOperationPath: string) => boolean {
  const expectedOperationPathPatternSections = expectedOperationPathPattern.split('/')
  return (arbitraryOperationPath: string) => {
    const arbitraryOperationPathSections = arbitraryOperationPath.split('/')
    switch (apiType) {
      case API_TYPE_REST:
        if (arbitraryOperationPathSections.length !== expectedOperationPathPatternSections.length) {
          return false
        }
        for (let i = 0; i < arbitraryOperationPathSections.length; i++) {
          const actualPathSection = arbitraryOperationPathSections[i]
          const expectPathPatternSection = expectedOperationPathPatternSections[i]
          const isMatchedPathParameter = expectPathPatternSection === '*' && /{.+}/.test(actualPathSection)
          const isAnotherMatchedSection = actualPathSection === expectPathPatternSection
          if (!isMatchedPathParameter && !isAnotherMatchedSection) {
            return false
          }
        }
        return true
      case API_TYPE_GRAPHQL:
        return arbitraryOperationPath === expectedOperationPathPattern
    }
  }
}
