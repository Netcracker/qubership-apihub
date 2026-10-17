export type MockVersionFlags = {
  hasErrors?: boolean
  changelogHasErrors?: boolean
  apiProcessorVersion?: string
}

// Differs from the api-processor version of the app, so the version gets the outdated api-processor tooltip.
const MOCK_OUTDATED_API_PROCESSOR_VERSION = '1.1.1'

// Returns only the flags that the version name sets, so the real values of the other flags stay in the response.
export function getMockVersionFlags(version: string): MockVersionFlags | undefined {
  // processor mismatch and build errors
  if (version.includes('errors-processor-mismatch-and-build')) {
    return { apiProcessorVersion: MOCK_OUTDATED_API_PROCESSOR_VERSION, hasErrors: true }
  }
  // api-processor version mismatch
  if (version.includes('errors-processor-mismatch')) {
    return { apiProcessorVersion: MOCK_OUTDATED_API_PROCESSOR_VERSION }
  }
  // build errors and comparison errors
  if (version.includes('errors-build-and-comparison')) {
    return { hasErrors: true, changelogHasErrors: true }
  }
  // build errors only
  if (version.includes('errors-build')) {
    return { hasErrors: true, changelogHasErrors: false }
  }
  // comparison errors only
  if (version.includes('errors-comparison')) {
    return { hasErrors: false, changelogHasErrors: true }
  }
  return undefined
}
