// The test plan config of <feature>, read by the scripts of the api-doc-viewer-feature-test-plan skill. Run from the
// repository root, with S=.agents/skills/api-doc-viewer-feature-test-plan/scripts:
//
//   node $S/packing/pack.mjs --qa qa-<feature>
//   node $S/packing/verify.mjs --qa qa-<feature>
//   node $S/results-sheet.mjs --qa qa-<feature>
//
// `load('<builder>')` imports a module of the skill's scripts/packing/builders/; `lib` is scripts/packing/lib.mjs.
// See the skill's references/test-data.md.
export default async ({ load }) => {
  const { plainFolderCases, diffsFolderCases } = await load('json-schema')
  const { copiedPackage, pair } = await load('copied')
  const { compositeCases } = await load('composite')

  const packages = [
    // OpenAPI fixtures, packed into a few documents; cases are found by their path prefix (/fop-01/…).
    {
      name: 'QA-OAS30-PLAIN-FIELDS',
      layout: 'plain',
      description: 'Field groups of the operation',
      sources: [{ dir: 'openapi/oas30/fields/operation', code: 'fop' }],
    },
    {
      name: 'QA-DIFFS-OPERATION',
      layout: 'diffs',
      description: 'Operation header changes',
      sources: [{ dir: 'openapi-diffs/operation', code: 'dop' }],
    },
    // A compact plan: many fixture cases merged into a few big operations (cases cprm-01, …).
    {
      name: 'QA-CMP-DIFFS',
      layout: 'diffs',
      description: 'Composite operations of the parameter diffs',
      sources: [{
        build: () => compositeCases({
          code: 'cprm',
          layout: 'diffs',
          title: 'Parameters',
          sources: [{ dir: 'openapi-diffs/query-parameters', code: 'dqp' }, { dir: 'openapi-diffs/cookies', code: 'dck' }],
        }),
      }],
    },
    // JSON Schema fixtures as request bodies of POST /orders.
    {
      name: 'QA-JSS-PLAIN',
      layout: 'plain',
      description: 'JSON Schema types',
      sources: [{ build: () => plainFolderCases({ dir: 'json-schema/string', code: 'jstr' }) }],
    },
    {
      name: 'QA-JSS-DIFFS',
      layout: 'diffs',
      description: 'JSON Schema type flags',
      sources: [{ build: () => diffsFolderCases({ dir: 'json-schema-diffs/type-changes/type-flags', code: 'jtf' }) }],
    },
    // Copied samples (special regression folders, backlog issues), paths relative to the QA folder.
    copiedPackage({
      name: 'QA-ISS-01',
      description: 'Backlog case ISS-01: <issue title>',
      cases: ['ISS-01'],
      items: [pair('pair', 'samples/backlog/<folder>/before.yaml', 'samples/backlog/<folder>/after.yaml')],
      documentBase: '<folder>',
    }),
  ]

  return {
    packages,
    // The case lists of the results sheet, in the order of the passes; a folder stands for its Markdown files.
    caseLists: ['test-plan/openapi', 'test-plan/backlog-retest.md', 'test-plan/regression.md'],
    // Cases that include the mandatory NF check, besides rows whose Expected names NF.
    nfCases: /^(CIR-|PRF-)/,
    // Case lists whose "Open" column names package cases only.
    checkedCaseLists: /^test-plan\/(openapi\/|regression\.md$)/,
  }
}
