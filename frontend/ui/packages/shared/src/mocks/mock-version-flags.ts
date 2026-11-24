type MockVersionFlags = {
  hasErrors?: boolean
  changelogHasErrors?: boolean
  apiProcessorVersion?: string
}

type MockVersionFlagCase = Readonly<{
  marker: string
  flags: MockVersionFlags
}>

// Differs from the api-processor version of the app, so the version gets the outdated api-processor tooltip.
const MOCK_OUTDATED_API_PROCESSOR_VERSION = '1.1.1'

// A name gets the flags of the first marker that it contains, so a marker comes before every marker that it contains.
const MOCK_VERSION_FLAG_CASES: ReadonlyArray<MockVersionFlagCase> = [
  {
    marker: 'errors-processor-mismatch-and-build',
    flags: { apiProcessorVersion: MOCK_OUTDATED_API_PROCESSOR_VERSION, hasErrors: true },
  },
  { marker: 'errors-processor-mismatch', flags: { apiProcessorVersion: MOCK_OUTDATED_API_PROCESSOR_VERSION } },
  { marker: 'errors-build-and-comparison', flags: { hasErrors: true, changelogHasErrors: true } },
  { marker: 'errors-build', flags: { hasErrors: true, changelogHasErrors: false } },
  { marker: 'errors-comparison', flags: { hasErrors: false, changelogHasErrors: true } },
]

// Returns only the flags that the version name sets, so the real values of the other flags stay in the response.
export function getMockVersionFlags(version: string): MockVersionFlags | undefined {
  return MOCK_VERSION_FLAG_CASES.find(({ marker }) => version.includes(marker))?.flags
}

// Revisions 1 to 5 get the flags of the cases in their order, so the revisions of one version show every case.
export function getMockRevisionFlags(revision: number): MockVersionFlags | undefined {
  return MOCK_VERSION_FLAG_CASES[revision - 1]?.flags
}
