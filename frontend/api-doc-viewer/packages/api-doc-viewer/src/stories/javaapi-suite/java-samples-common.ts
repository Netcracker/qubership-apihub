const sampleFiles = import.meta.glob(
  '../../../../samples/javaapi/*.json',
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>

function loadSample(fileName: string): unknown {
  const entry = Object.entries(sampleFiles).find(([path]) => path.endsWith(`/${fileName}`))
  if (!entry) {
    throw new Error(`Sample not found: ${fileName}`)
  }
  return JSON.parse(entry[1])
}

export const API_REPORT = loadSample('api-report.json')
export const API_DIFF = loadSample('api-diff.json')
